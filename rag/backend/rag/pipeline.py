"""
RAGPipeline — orchestrates the full ingest and search flow.

Ingest flow:
  PDF bytes → extract (PyMuPDF + pdfplumber) → chunk → embed
  → store Chunk node in Neo4j (with embedding vector)
  → Claude Haiku extracts (entity, predicate, object) triples
  → store Entity nodes + typed RELATES_TO edges in Neo4j
  → rebuild BM25 from all chunks in Neo4j

Search flow:
  query → BM25 (sparse) + Neo4j vector (dense) + Neo4j graph traversal
  → RRF fusion → cross-encoder rerank → Claude Opus answer generation
"""

from __future__ import annotations

import os

import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

from .chunker import chunk_text
from .extractor import extract_from_pdf
from .generator import generate_answer
from .graph import Neo4jGraph
from .relation_extractor import extract_triples
from .retriever import hybrid_search


class RAGPipeline:
    def __init__(self) -> None:
        self.embedder = SentenceTransformer("BAAI/bge-m3")

        self.graph = Neo4jGraph(
            uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
            user=os.getenv("NEO4J_USER", "neo4j"),
            password=os.getenv("NEO4J_PASSWORD", "password"),
        )

        # BM25 lives in memory; rebuilt from Neo4j on startup and after each ingest
        self.bm25: BM25Okapi | None = None
        self.chunk_ids: list[str] = []        # same order as BM25 corpus
        self.chunk_cache: dict[str, dict] = {}  # id → chunk dict

        self._rebuild_bm25()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _rebuild_bm25(self) -> None:
        chunks = self.graph.get_all_chunks()
        if not chunks:
            self.bm25 = None
            self.chunk_ids = []
            self.chunk_cache = {}
            return

        self.chunk_ids = [c["id"] for c in chunks]
        self.chunk_cache = {c["id"]: c for c in chunks}

        tokenized = [c["text"].lower().split() for c in chunks]
        self.bm25 = BM25Okapi(tokenized)

    def _embed(self, texts: list[str]) -> np.ndarray:
        return self.embedder.encode(texts, normalize_embeddings=True, show_progress_bar=False)

    # ------------------------------------------------------------------
    # Public API (matches existing main.py interface)
    # ------------------------------------------------------------------

    def ingest(self, content: bytes, filename: str) -> dict:
        if self.graph.document_exists(filename):
            return {
                "filename": filename,
                "pages": 0,
                "chunks": 0,
                "note": "already indexed — skipped",
            }

        # 1. Extract text + tables via PyMuPDF + pdfplumber
        extracted = extract_from_pdf(content, filename)

        # 2. Chunk
        chunks = chunk_text(extracted["pages"], filename)
        if not chunks:
            return {"filename": filename, "pages": len(extracted["pages"]), "chunks": 0}

        # 3. Embed all chunk texts in one batch
        texts = [c["text"] for c in chunks]
        embeddings = self._embed(texts)

        # 4. Store each chunk in Neo4j + extract relations
        for chunk, embedding in zip(chunks, embeddings):
            chunk_id = self.graph.store_chunk(
                text=chunk["text"],
                source=chunk["source"],
                page=chunk["page"],
                chunk_type=chunk["type"],
                embedding=embedding.tolist(),
            )

            # 5. Claude Haiku extracts typed triples → stored as KG edges
            triples = extract_triples(chunk["text"])
            self.graph.store_relations(chunk_id, triples)

        # 6. Rebuild BM25 from updated Neo4j state
        self._rebuild_bm25()

        return {
            "filename": filename,
            "pages": len(extracted["pages"]),
            "chunks": len(chunks),
        }

    def search(self, query: str, top_k: int = 5) -> dict:
        if not self.chunk_ids or self.bm25 is None:
            return {"answer": "No documents indexed yet.", "sources": []}

        results = hybrid_search(
            bm25=self.bm25,
            chunk_ids=self.chunk_ids,
            chunk_cache=self.chunk_cache,
            graph=self.graph,
            embedder=self.embedder,
            query=query,
            top_k=top_k,
        )

        answer = generate_answer(query, results)

        return {
            "answer": answer,
            "sources": [
                {
                    "text": r["text"][:400],
                    "source": r["source"],
                    "page": r["page"],
                    "score": round(float(r["score"]), 5),
                    "type": r["type"],
                }
                for r in results
            ],
        }

    @property
    def documents(self) -> list[dict]:
        return self.graph.get_documents()
