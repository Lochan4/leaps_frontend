"""
Hybrid retrieval pipeline:
  1. BM25  (sparse, lexical)
  2. Neo4j vector search  (dense, semantic)
  3. Neo4j graph traversal  (entity + 2-hop relationship expansion)
  4. RRF fusion of the three ranked lists
  5. Cross-encoder reranker for final precision boost

Cross-encoder is lazy-loaded on first search so startup is fast.
"""

from __future__ import annotations

import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder, SentenceTransformer

from .graph import Neo4jGraph

_reranker: CrossEncoder | None = None


def _get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L6-v2")
    return _reranker


# ------------------------------------------------------------------
# Individual retrievers
# ------------------------------------------------------------------

def bm25_search(
    bm25: BM25Okapi,
    chunk_ids: list[str],
    query: str,
    top_k: int,
) -> list[str]:
    tokens = query.lower().split()
    scores = bm25.get_scores(tokens)
    top_indices = np.argsort(scores)[::-1][:top_k]
    return [chunk_ids[i] for i in top_indices if scores[i] > 0]


def dense_search(
    graph: Neo4jGraph,
    embedder: SentenceTransformer,
    query: str,
    top_k: int,
) -> list[str]:
    embedding = embedder.encode([query], normalize_embeddings=True)[0].tolist()
    results = graph.vector_search(embedding, top_k)
    return [r["id"] for r in results]


def graph_search(
    graph: Neo4jGraph,
    query: str,
    top_k: int,
) -> list[str]:
    # Use non-stopword tokens as entity search terms
    stopwords = {"the", "a", "an", "is", "in", "of", "to", "and", "or", "for",
                 "what", "how", "why", "when", "where", "who", "which"}
    terms = [w for w in query.lower().split() if w not in stopwords and len(w) > 2]
    if not terms:
        return []
    results = graph.graph_search(terms, top_k)
    return [r["id"] for r in results]


# ------------------------------------------------------------------
# Fusion + reranking
# ------------------------------------------------------------------

def rrf_fusion(
    rankings: list[list[str]],
    k: int = 60,
) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, chunk_id in enumerate(ranking):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


def rerank(query: str, chunks: list[dict], top_k: int) -> list[dict]:
    if len(chunks) <= 1:
        return chunks[:top_k]
    reranker = _get_reranker()
    pairs = [(query, c["text"]) for c in chunks]
    scores = reranker.predict(pairs)
    ranked = sorted(zip(scores.tolist(), chunks), key=lambda x: x[0], reverse=True)
    return [c for _, c in ranked[:top_k]]


# ------------------------------------------------------------------
# Main entry point
# ------------------------------------------------------------------

def hybrid_search(
    bm25: BM25Okapi,
    chunk_ids: list[str],
    chunk_cache: dict[str, dict],
    graph: Neo4jGraph,
    embedder: SentenceTransformer,
    query: str,
    top_k: int = 5,
) -> list[dict]:
    n = min(top_k * 4, len(chunk_ids))
    if n == 0:
        return []

    bm25_ids   = bm25_search(bm25, chunk_ids, query, n)
    dense_ids  = dense_search(graph, embedder, query, n)
    graph_ids  = graph_search(graph, query, n)

    fused = rrf_fusion([bm25_ids, dense_ids, graph_ids])

    # Resolve IDs → chunk dicts using local cache
    candidates = []
    for chunk_id, rrf_score in fused[: top_k * 2]:
        chunk = chunk_cache.get(chunk_id)
        if chunk:
            candidates.append({**chunk, "score": rrf_score})

    # Cross-encoder rerank for final top_k
    return rerank(query, candidates, top_k)
