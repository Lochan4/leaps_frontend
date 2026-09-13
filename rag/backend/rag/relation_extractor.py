"""
Claude Haiku-based (entity, predicate, object) triple extraction.
Uses Claude Code's OAuth session — no ANTHROPIC_API_KEY needed.
Returns [] gracefully on any failure so the pipeline never blocks.
"""

from __future__ import annotations

import json
import re

from .claude_client import call, HAIKU

_SYSTEM = "You are a precise information extraction engine. Output only valid JSON."

_PROMPT = """\
Extract factual entity relationships from the text below.

Return a JSON array. Each element must have exactly these keys:
  subject       – entity name (2–5 words max, lowercase)
  subject_type  – one of: PERSON, ORGANIZATION, TECHNOLOGY, CONCEPT, LOCATION, OTHER
  predicate     – relationship verb/phrase (e.g. "founded", "acquired", "is part of")
  object        – entity name (2–5 words max, lowercase)
  object_type   – one of: PERSON, ORGANIZATION, TECHNOLOGY, CONCEPT, LOCATION, OTHER

Rules:
- Only extract clear, factual relationships stated in the text.
- Maximum 8 triples. If fewer clear ones exist, return fewer.
- Return ONLY a valid JSON array — no explanation, no markdown fences.

Text:
{text}"""


def _parse(raw: str) -> list[dict]:
    raw = raw.strip()
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"```$", "", raw)
    return json.loads(raw.strip())


def extract_triples(text: str) -> list[dict]:
    try:
        raw = call(
            model=HAIKU,
            system=_SYSTEM,
            user=_PROMPT.format(text=text[:2000]),
            max_tokens=800,
        )
        triples = _parse(raw)
        if not isinstance(triples, list):
            return []
        return [
            t for t in triples
            if isinstance(t, dict) and t.get("subject") and t.get("object") and t.get("predicate")
        ]
    except Exception:
        return []
