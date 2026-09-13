"""
LLM transport via Claude Code's OAuth session.

Reads the OAuth access token from:
  1. macOS Keychain  — service "Claude Code-credentials"  (primary)
  2. ~/.claude/.credentials.json                          (fallback)

Makes raw HTTP POST requests to Anthropic's messages endpoint with
  Authorization: Bearer <token>
  anthropic-beta: oauth-2025-04-20

No ANTHROPIC_API_KEY required — draws from the Claude Code subscription
the user is already logged into.
"""

from __future__ import annotations

import json
import os
import platform
import subprocess
import urllib.error
import urllib.request
from typing import Optional

_MESSAGES_URL  = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_VER = "2023-06-01"
_OAUTH_BETA    = "oauth-2025-04-20"
_KEYCHAIN_SVC  = "Claude Code-credentials"
_CREDS_FILE    = os.path.expanduser("~/.claude/.credentials.json")

# Models
HAIKU  = "claude-haiku-4-5-20251001"   # fast structured extraction
SONNET = "claude-sonnet-4-6"           # answer generation


# ------------------------------------------------------------------
# Token retrieval
# ------------------------------------------------------------------

def _read_keychain() -> Optional[str]:
    try:
        username = os.environ.get("USER") or os.environ.get("LOGNAME") or ""
        result = subprocess.run(
            ["security", "find-generic-password", "-a", username, "-w", "-s", _KEYCHAIN_SVC],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def _read_creds_file() -> Optional[str]:
    try:
        with open(_CREDS_FILE) as f:
            return f.read()
    except Exception:
        return None


def _extract_token(raw: str) -> Optional[str]:
    try:
        return json.loads(raw).get("claudeAiOauth", {}).get("accessToken")
    except Exception:
        return None


def _get_token() -> str:
    if platform.system() == "Darwin":
        raw = _read_keychain()
        if raw:
            token = _extract_token(raw)
            if token:
                return token
    raw = _read_creds_file()
    if raw:
        token = _extract_token(raw)
        if token:
            return token
    raise RuntimeError(
        "Could not read Claude Code's OAuth token. "
        "Make sure you are logged in: run `claude auth login`."
    )


# ------------------------------------------------------------------
# HTTP transport
# ------------------------------------------------------------------

def call(
    model: str,
    system: str,
    user: str,
    max_tokens: int = 1024,
) -> str:
    token = _get_token()
    body = {
        "model": model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    req = urllib.request.Request(
        _MESSAGES_URL,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "anthropic-version": _ANTHROPIC_VER,
            "anthropic-beta": _OAUTH_BETA,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:400]
        raise RuntimeError(f"Claude API error (HTTP {e.code}): {detail}")

    return data["content"][0]["text"]
