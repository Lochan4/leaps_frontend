import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from rag.chunker import chunk_text


def _pages(texts):
    return [{"page": i + 1, "text": t, "tables": []} for i, t in enumerate(texts)]


def test_empty_pages():
    assert chunk_text([], "test.pdf") == []


def test_empty_text():
    assert chunk_text(_pages([""]), "test.pdf") == []


def test_whitespace_only_text():
    assert chunk_text(_pages(["   \n\t  "]), "test.pdf") == []


def test_single_sentence():
    chunks = chunk_text(_pages(["Hello world."]), "test.pdf")
    assert len(chunks) == 1
    assert chunks[0]["source"] == "test.pdf"
    assert chunks[0]["type"] == "text"
    assert chunks[0]["page"] == 1
    assert "Hello world" in chunks[0]["text"]


def test_source_and_page_propagate():
    pages = _pages(["First page content.", "Second page content."])
    chunks = chunk_text(pages, "doc.pdf")
    assert all(c["source"] == "doc.pdf" for c in chunks)
    pages_seen = {c["page"] for c in chunks}
    assert 1 in pages_seen and 2 in pages_seen


def test_table_chunks():
    pages = [{"page": 1, "text": "", "tables": ["col1 | col2\nval1 | val2"]}]
    chunks = chunk_text(pages, "table.pdf")
    assert len(chunks) == 1
    assert chunks[0]["type"] == "table"
    assert "[TABLE]" in chunks[0]["text"]


def test_multiple_tables_per_page():
    pages = [{"page": 1, "text": "", "tables": ["a | b", "c | d"]}]
    chunks = chunk_text(pages, "multi.pdf")
    assert len(chunks) == 2
    assert all(c["type"] == "table" for c in chunks)


def test_long_text_creates_multiple_chunks():
    sentences = [f"This is sentence number {i} with some padding words here." for i in range(200)]
    long_text = " ".join(sentences)
    chunks = chunk_text(_pages([long_text]), "long.pdf", chunk_size=50)
    assert len(chunks) > 1


def test_overlap_means_second_chunk_shares_words():
    # 600 words split into sentences of 10 words each
    sentences = [" ".join([f"word{j}" for j in range(i * 10, i * 10 + 10)]) + "." for i in range(60)]
    text = " ".join(sentences)
    chunks = chunk_text(_pages([text]), "overlap.pdf", chunk_size=100, overlap=20)
    assert len(chunks) >= 2
    # Last words of chunk 0 should appear at start of chunk 1
    words0 = set(chunks[0]["text"].split())
    words1 = set(chunks[1]["text"].split())
    assert len(words0 & words1) >= 1


def test_text_and_table_on_same_page():
    pages = [{"page": 2, "text": "Some body text here.", "tables": ["h1 | h2\nr1 | r2"]}]
    chunks = chunk_text(pages, "mixed.pdf")
    types = {c["type"] for c in chunks}
    assert "text" in types
    assert "table" in types
    assert all(c["page"] == 2 for c in chunks)
