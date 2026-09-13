import re


def chunk_text(
    pages: list[dict],
    filename: str,
    chunk_size: int = 400,
    overlap: int = 50,
) -> list[dict]:
    """Chunk extracted pages into overlapping text chunks."""
    chunks = []

    for page in pages:
        # Tables as standalone chunks
        for table in page["tables"]:
            chunks.append({
                "text": f"[TABLE]\n{table}",
                "source": filename,
                "page": page["page"],
                "type": "table",
            })

        text = page["text"]
        if not text.strip():
            continue

        sentences = re.split(r"(?<=[.!?])\s+", text)
        current_words: list[str] = []

        for sentence in sentences:
            words = sentence.split()
            if not words:
                continue

            if len(current_words) + len(words) > chunk_size and current_words:
                chunk_str = " ".join(current_words)
                if chunk_str.strip():
                    chunks.append({
                        "text": chunk_str,
                        "source": filename,
                        "page": page["page"],
                        "type": "text",
                    })
                current_words = current_words[-overlap:] + words
            else:
                current_words.extend(words)

        if current_words:
            chunk_str = " ".join(current_words)
            if chunk_str.strip():
                chunks.append({
                    "text": chunk_str,
                    "source": filename,
                    "page": page["page"],
                    "type": "text",
                })

    return chunks
