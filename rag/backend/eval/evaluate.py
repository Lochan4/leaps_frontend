"""
RAG Pipeline End-to-End Accuracy Evaluation
============================================
Uses the SQuAD v1.1 dev set as a gold-standard benchmark.

Pipeline under test:
  PDF → extract → chunk → embed → Neo4j (vector + graph) + BM25
  → hybrid search → RRF fusion → cross-encoder rerank → Claude Sonnet answer

Metrics reported:
  - Token F1          (lexical overlap with gold answers)
  - Fuzzy exact match (gold answer contained in model answer)
  - Semantic similarity (cosine distance via BAAI/bge-m3)
  - LLM-as-judge      (Claude Haiku rates correctness 0 / 0.5 / 1)
  - Retrieval Recall@5 (did top-5 chunks contain the gold context?)

Usage:
  pip install fpdf2
  python eval/evaluate.py                  # default: 25 docs, 3 q/doc
  python eval/evaluate.py --docs 10 --qpd 2   # quick run
  python eval/evaluate.py --docs 50 --qpd 5   # larger run
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

import logging
import numpy as np

# Add backend root to path so we can import rag.*
sys.path.insert(0, str(Path(__file__).parent.parent))

# Suppress noisy Neo4j deprecation notifications
logging.getLogger("neo4j").setLevel(logging.ERROR)
logging.getLogger("neo4j.notifications").setLevel(logging.ERROR)

from rag.claude_client import HAIKU, call
from rag.pipeline import RAGPipeline

# ── Paths ─────────────────────────────────────────────────────────────────────
EVAL_DIR    = Path(__file__).parent
SQUAD_CACHE = EVAL_DIR / "squad_dev.json"
PDF_DIR     = EVAL_DIR / "test_pdfs"
RESULTS_OUT = EVAL_DIR / "results.json"

SQUAD_URL = (
    "https://rajpurkar.github.io/SQuAD-explorer/dataset/dev-v1.1.json"
)


# ── Dataset helpers ───────────────────────────────────────────────────────────

def download_squad() -> dict:
    if SQUAD_CACHE.exists():
        print("  Using cached SQuAD dev set.")
        with open(SQUAD_CACHE) as f:
            return json.load(f)
    print("  Downloading SQuAD v1.1 dev set…")
    # macOS Python 3.11 ships without system certs — bypass verification for this public dataset
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(SQUAD_URL, timeout=30, context=ctx) as r:
        data = json.loads(r.read())
    with open(SQUAD_CACHE, "w") as f:
        json.dump(data, f)
    print(f"  Saved to {SQUAD_CACHE}")
    return data


def ascii_safe(text: str) -> str:
    """Normalize Unicode → ASCII for PDF writing without extra deps."""
    return (
        unicodedata.normalize("NFKD", text)
        .encode("ascii", "ignore")
        .decode("ascii")
    )


def safe_filename(title: str, idx: int) -> str:
    name = re.sub(r"[^\w\-]", "_", title)[:40]
    return f"{name}_{idx}.pdf"


def build_samples(squad: dict, n_docs: int, qpd: int) -> list[dict]:
    """
    Returns list of evaluation samples, each:
      {doc_id, context, question, answers: [str]}
    """
    samples: list[dict] = []
    docs_seen = 0

    for article in squad["data"]:
        if docs_seen >= n_docs:
            break
        title = article["title"]
        for p_idx, para in enumerate(article["paragraphs"]):
            if docs_seen >= n_docs:
                break
            context = para["context"]
            doc_id  = safe_filename(title, p_idx)

            qa_items = [
                qa for qa in para["qas"]
                if qa["answers"] and not qa.get("is_impossible", False)
            ][:qpd]

            if not qa_items:
                continue

            for qa in qa_items:
                samples.append({
                    "doc_id":   doc_id,
                    "context":  context,
                    "title":    title,
                    "question": qa["question"],
                    "answers":  [a["text"] for a in qa["answers"]],
                })
            docs_seen += 1

    return samples


def create_pdfs(samples: list[dict]) -> None:
    try:
        from fpdf import FPDF
    except ImportError:
        sys.exit(
            "\nfpdf2 is required for PDF creation.\n"
            "Run:  pip install fpdf2\n"
        )

    PDF_DIR.mkdir(exist_ok=True)

    seen: set[str] = set()
    for s in samples:
        if s["doc_id"] in seen:
            continue
        seen.add(s["doc_id"])

        path = PDF_DIR / s["doc_id"]
        if path.exists():
            continue

        pdf = FPDF()
        pdf.set_margins(15, 15, 15)
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 13)
        pdf.multi_cell(0, 8, ascii_safe(s["title"]))
        pdf.ln(4)
        pdf.set_font("Helvetica", size=10)
        # Wrap long context — fpdf2 handles line breaks via multi_cell
        pdf.multi_cell(0, 5.5, ascii_safe(s["context"]))
        pdf.output(str(path))


# ── Metrics ───────────────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"\b(a|an|the)\b", " ", text)
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def token_f1(pred: str, golds: list[str]) -> float:
    pred_toks = _normalize(pred).split()
    best = 0.0
    for gold in golds:
        gold_toks = _normalize(gold).split()
        if not pred_toks or not gold_toks:
            continue
        common = set(pred_toks) & set(gold_toks)
        if not common:
            continue
        p = len(common) / len(pred_toks)
        r = len(common) / len(gold_toks)
        best = max(best, 2 * p * r / (p + r))
    return best


def fuzzy_em(pred: str, golds: list[str]) -> float:
    pred_n = _normalize(pred)
    return 1.0 if any(_normalize(g) in pred_n for g in golds) else 0.0


_embedder = None


def _get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("BAAI/bge-m3")
    return _embedder


def best_sentence(chunk_text: str, question: str) -> str:
    """
    Split a chunk into sentences and return the one most semantically
    similar to the question. This gives a short, focused "answer proxy"
    instead of comparing a 400-word paragraph against a 2-5 word gold answer.
    """
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", chunk_text) if s.strip()]
    if not sentences:
        return chunk_text
    if len(sentences) == 1:
        return sentences[0]
    emb = _get_embedder()
    vecs = emb.encode([question] + sentences, normalize_embeddings=True, show_progress_bar=False)
    q_vec   = vecs[0]
    s_vecs  = vecs[1:]
    scores  = s_vecs @ q_vec
    return sentences[int(scores.argmax())]


def semantic_sim(pred: str, golds: list[str]) -> float:
    emb  = _get_embedder()
    vecs = emb.encode([pred] + golds, normalize_embeddings=True, show_progress_bar=False)
    return float((vecs[0] @ vecs[1:].T).max())


_JUDGE_SYS = (
    "You are a strict QA evaluator. "
    "Rate answers as: 1.0 (correct), 0.5 (partial), 0.0 (wrong/don't know). "
    "Reply with ONLY the number."
)
_JUDGE_USR = """\
Question: {q}
Acceptable answers: {golds}
Model answer: {pred}

Score:"""


def llm_judge(question: str, golds: list[str], pred: str) -> float:
    try:
        raw = call(
            model=HAIKU,
            system=_JUDGE_SYS,
            user=_JUDGE_USR.format(
                q=question,
                golds=", ".join(f'"{g}"' for g in golds[:3]),
                pred=pred,
            ),
            max_tokens=5,
        )
        return float(raw.strip())
    except Exception:
        return 0.0


def retrieval_recall(sources: list[dict], gold_context: str, k: int = 5) -> bool:
    """True if any of the top-k retrieved chunks share >10% token overlap with the gold context."""
    gold_toks = set(_normalize(gold_context).split())
    for src in sources[:k]:
        src_toks = set(_normalize(src["text"]).split())
        if gold_toks and len(gold_toks & src_toks) / len(gold_toks) > 0.10:
            return True
    return False


# ── Main ──────────────────────────────────────────────────────────────────────

def print_bar(label: str, value: float, width: int = 30) -> None:
    filled = round(value * width)
    bar = "█" * filled + "░" * (width - filled)
    print(f"  {label:<28} {bar}  {value:.1%}")


def main() -> None:
    parser = argparse.ArgumentParser(description="RAG pipeline accuracy evaluation")
    parser.add_argument("--docs",     type=int,   default=25,  help="Number of SQuAD contexts (default: 25)")
    parser.add_argument("--qpd",      type=int,   default=3,   help="Max questions per document (default: 3)")
    parser.add_argument("--topk",     type=int,   default=5,   help="Retrieval top-K (default: 5)")
    parser.add_argument("--delay",    type=float, default=8.0, help="Seconds between Claude API calls (default: 8)")
    parser.add_argument("--no-judge", dest="judge", action="store_false", default=True,
                        help="Skip LLM-as-judge (saves ~50%% of API calls)")
    parser.add_argument("--retrieval-only", action="store_true", default=False,
                        help="Skip answer generation entirely — measure retrieval quality only (no API calls)")
    args = parser.parse_args()

    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║       RAG Pipeline  —  Accuracy Evaluation          ║")
    print("╚══════════════════════════════════════════════════════╝")
    print(f"\n  Config: {args.docs} documents × {args.qpd} q/doc, top-{args.topk} retrieval")

    # 1. Dataset
    print("\n[1/5] Downloading dataset…")
    squad   = download_squad()
    samples = build_samples(squad, args.docs, args.qpd)
    unique_docs = {s["doc_id"] for s in samples}
    print(f"  {len(samples)} questions from {len(unique_docs)} documents")

    # 2. PDFs
    print("\n[2/5] Creating test PDFs…")
    create_pdfs(samples)
    print(f"  PDFs written to {PDF_DIR}")

    # 3. Ingest
    print("\n[3/5] Ingesting documents into RAG pipeline…")
    try:
        pipeline = RAGPipeline()
    except Exception as e:
        sys.exit(f"\nFailed to connect to Neo4j: {e}\nMake sure Neo4j is running.")

    ingested = 0
    skipped  = 0
    for doc_id in sorted(unique_docs):
        pdf_path = PDF_DIR / doc_id
        with open(pdf_path, "rb") as f:
            result = pipeline.ingest(f.read(), doc_id)
        if result.get("note"):
            skipped += 1
        else:
            ingested += 1
            print(f"  ✓ {doc_id}  ({result['chunks']} chunks)")

    print(f"\n  Ingested: {ingested}  |  Already indexed (skipped): {skipped}")

    # Brief cooldown after ingestion (only needed when making Claude API calls)
    if not args.retrieval_only:
        print("\n[3.5/5] Cooling down 60s after ingestion (rate limit recovery)…")
        for remaining in range(60, 0, -10):
            print(f"  {remaining}s…", end="\r", flush=True)
            time.sleep(10)
        print("  Ready.                ")

    # 4. Evaluate
    print(f"\n[4/5] Evaluating {len(samples)} questions…")
    print("  " + "-" * 74)
    print(f"  {'#':>4}  {'F1':>5}  {'EM':>5}  {'SIM':>5}  {'JUDGE':>6}  {'REC':>4}  Question")
    print("  " + "-" * 74)

    results: list[dict] = []

    for i, s in enumerate(samples, 1):
        if i > 1 and not args.retrieval_only:
            time.sleep(args.delay)

        if args.retrieval_only:
            # Pure retrieval eval — no Claude calls at all
            from rag.retriever import hybrid_search
            raw_results = hybrid_search(
                bm25=pipeline.bm25,
                chunk_ids=pipeline.chunk_ids,
                chunk_cache=pipeline.chunk_cache,
                graph=pipeline.graph,
                embedder=pipeline.embedder,
                query=s["question"],
                top_k=args.topk,
            )
            sources = [
                {"text": r["text"][:400], "source": r["source"],
                 "page": r["page"], "score": r["score"], "type": r["type"]}
                for r in raw_results
            ]
            top_text = raw_results[0]["text"] if raw_results else ""
            # Use full chunk for EM/F1 (is the answer anywhere in the passage?)
            pred = top_text
            # Use best sentence for semantic similarity (fixes length mismatch)
            pred_for_sim = best_sentence(top_text, s["question"]) if top_text else ""
        else:
            # Full pipeline — calls Claude Sonnet for answer generation
            try:
                search_out  = pipeline.search(s["question"], top_k=args.topk)
                pred        = search_out["answer"]
                pred_for_sim = pred   # Claude answer is already short and focused
                sources     = search_out["sources"]
            except Exception as exc:
                print(f"  {i:>4}.  SKIP (search error: {exc})")
                continue

        f1  = token_f1(pred, s["answers"])
        em  = fuzzy_em(pred, s["answers"])
        # In retrieval-only mode use the best sentence for sim to avoid length mismatch
        sim_text = pred_for_sim if args.retrieval_only else pred
        sim = semantic_sim(sim_text, s["answers"])
        rec = retrieval_recall(sources, s["context"], k=args.topk)

        # LLM judge — optional, separate Haiku call (skipped in retrieval-only mode)
        if args.judge and not args.retrieval_only:
            time.sleep(args.delay)
            judge = llm_judge(s["question"], s["answers"], pred)
        else:
            judge = -1.0   # sentinel: not evaluated

        results.append({
            "question":   s["question"],
            "gold":       s["answers"],
            "pred":       pred,
            "doc_id":     s["doc_id"],
            "f1":         f1,
            "em":         em,
            "semantic_similarity": sim,
            "llm_judge":  judge,
            "retrieval_recall": rec,
        })

        rec_sym   = "✓" if rec else "✗"
        judge_str = f"{judge:>4.1f}" if judge >= 0 else "  —"
        q_short   = s["question"][:50].ljust(50)
        print(f"  {i:>4}.  {f1:>4.0%}  {em:>4.0%}  {sim:>4.0%}  {judge_str}  [{rec_sym}]  {q_short}")

        # Save incrementally so partial results are not lost on crash
        if i % 10 == 0:
            with open(RESULTS_OUT, "w") as f:
                json.dump({"partial": True, "samples": results}, f, indent=2)

    # 5. Summary
    n = len(results)
    avg_f1    = sum(r["f1"]  for r in results) / n
    avg_em    = sum(r["em"]  for r in results) / n
    avg_sim   = sum(r["semantic_similarity"] for r in results) / n
    avg_rec   = sum(r["retrieval_recall"]    for r in results) / n

    judged    = [r for r in results if r["llm_judge"] >= 0]
    avg_judge = sum(r["llm_judge"] for r in judged) / len(judged) if judged else None

    correct = sum(1 for r in judged if r["llm_judge"] == 1.0)
    partial = sum(1 for r in judged if r["llm_judge"] == 0.5)
    wrong   = sum(1 for r in judged if r["llm_judge"] == 0.0)

    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║                     RESULTS                         ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()
    print(f"  Questions evaluated : {n}")
    print(f"  Documents ingested  : {len(unique_docs)}")
    print()
    print("  ── Answer Quality ──────────────────────────────────")
    print_bar("Token F1",           avg_f1)
    print_bar("Fuzzy exact match",  avg_em)
    print_bar("Semantic similarity",avg_sim)
    if avg_judge is not None:
        print_bar("LLM-as-judge",   avg_judge)
    else:
        print("  LLM-as-judge             (skipped — use without --no-judge)")
    print()
    print("  ── Retrieval ───────────────────────────────────────")
    print_bar(f"Recall@{args.topk}", avg_rec)
    print()
    if judged:
        print(f"  LLM-judge breakdown: {correct} correct  {partial} partial  {wrong} wrong")
    print()

    # Overall score
    if avg_judge is not None:
        overall = avg_f1 * 0.2 + avg_em * 0.2 + avg_sim * 0.2 + avg_judge * 0.4
    else:
        overall = avg_f1 * 0.34 + avg_em * 0.33 + avg_sim * 0.33
    print(f"  ── Overall pipeline accuracy : {overall:.1%} ──────────────")
    print()

    # Save
    output = {
        "config": {"docs": args.docs, "qpd": args.qpd, "topk": args.topk},
        "summary": {
            "n":                  n,
            "token_f1":           round(avg_f1,  4),
            "fuzzy_em":           round(avg_em,  4),
            "semantic_similarity":round(avg_sim, 4),
            "llm_judge":          round(avg_judge, 4) if avg_judge is not None else None,
            "retrieval_recall":   round(avg_rec, 4),
            "overall":            round(overall, 4),
            "judge_correct":  correct,
            "judge_partial":  partial,
            "judge_wrong":    wrong,
        },
        "samples": results,
    }
    with open(RESULTS_OUT, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Full results → {RESULTS_OUT}")
    print()


if __name__ == "__main__":
    main()
