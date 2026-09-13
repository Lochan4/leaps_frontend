import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from rank_bm25 import BM25Okapi

from rag.retriever import rrf_fusion, bm25_search


# ── rrf_fusion ────────────────────────────────────────────────────────

def test_rrf_fusion_empty_input():
    assert rrf_fusion([]) == []


def test_rrf_fusion_single_list_preserves_order():
    result = rrf_fusion([["a", "b", "c"]])
    ids = [r[0] for r in result]
    assert ids == ["a", "b", "c"]


def test_rrf_fusion_higher_rank_scores_higher():
    result = rrf_fusion([["a", "b", "c"]])
    scores = {r[0]: r[1] for r in result}
    assert scores["a"] > scores["b"] > scores["c"]


def test_rrf_fusion_shared_id_boosts_score():
    # "b" appears at rank 1 in list 0 and rank 0 in list 1 — should outscore "a" and "c"
    result = rrf_fusion([["a", "b"], ["c", "b"]])
    scores = {r[0]: r[1] for r in result}
    assert scores["b"] > scores["a"]
    assert scores["b"] > scores["c"]


def test_rrf_fusion_deduplicates_within_single_list():
    # Duplicate IDs in one list should still appear once in output
    result = rrf_fusion([["a", "a", "b"]])
    ids = [r[0] for r in result]
    assert ids.count("a") == 1


def test_rrf_fusion_deduplicates_across_lists():
    result = rrf_fusion([["a", "b"], ["a", "c"]])
    ids = [r[0] for r in result]
    assert ids.count("a") == 1


def test_rrf_fusion_returns_all_unique_ids():
    result = rrf_fusion([["a", "b"], ["c", "d"]])
    ids = {r[0] for r in result}
    assert ids == {"a", "b", "c", "d"}


def test_rrf_fusion_k_parameter_affects_scores():
    # Higher k → smaller spread between rank positions
    result_low_k  = rrf_fusion([["a", "b"]], k=1)
    result_high_k = rrf_fusion([["a", "b"]], k=1000)
    scores_low  = {r[0]: r[1] for r in result_low_k}
    scores_high = {r[0]: r[1] for r in result_high_k}
    spread_low  = scores_low["a"]  - scores_low["b"]
    spread_high = scores_high["a"] - scores_high["b"]
    assert spread_low > spread_high


# ── bm25_search ───────────────────────────────────────────────────────

def _make_bm25(docs: list[list[str]]) -> BM25Okapi:
    return BM25Okapi(docs)


def test_bm25_returns_ids_subset():
    ids = ["c1", "c2", "c3"]
    bm25 = _make_bm25(["hello world".split(), "foo bar".split(), "hello foo".split()])
    results = bm25_search(bm25, ids, "hello", top_k=2)
    assert len(results) <= 2
    assert all(r in ids for r in results)


def test_bm25_no_match_returns_empty():
    ids = ["c1"]
    bm25 = _make_bm25(["hello world".split()])
    results = bm25_search(bm25, ids, "zzz", top_k=5)
    assert results == []


def test_bm25_top_k_limits_results():
    ids = [f"c{i}" for i in range(10)]
    docs = [f"word{i} common".split() for i in range(10)]
    bm25 = _make_bm25(docs)
    results = bm25_search(bm25, ids, "common", top_k=3)
    assert len(results) <= 3


def test_bm25_best_match_ranked_first():
    ids = ["weak", "strong"]
    # "strong" doc mentions the query term twice
    bm25 = _make_bm25(["apple banana".split(), "apple apple".split()])
    results = bm25_search(bm25, ids, "apple", top_k=2)
    assert results[0] == "strong"
