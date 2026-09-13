from .claude_client import call, SONNET

_SYSTEM = (
    "You are a precise research assistant. Answer based solely on the provided context. "
    "Cite sources (filename + page number) where relevant. "
    "If the context does not contain enough information to answer, say so clearly."
)


def generate_answer(query: str, context_chunks: list[dict]) -> str:
    if not context_chunks:
        return "No relevant context found for this query."

    context = "\n\n---\n\n".join(
        f"[Source: {c['source']}, Page {c['page']}]\n{c['text']}"
        for c in context_chunks
    )

    return call(
        model=SONNET,
        system=_SYSTEM,
        user=f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:",
        max_tokens=1024,
    )
