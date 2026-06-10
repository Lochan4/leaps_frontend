Last updated: 2026-06-10 20:53

# Project Brief

This is a conversational AI assistant that maintains session state across commands. Users interact via slash commands (/clear, /resume, /history) to manage conversation context and retrieve past interactions. The product solves the problem of stateless chat by persisting session data locally, allowing users to pick up where they left off.

## What's In Flight

- Testing /resume and /history commands to verify they correctly retrieve and restore session state
- Documenting local session file storage location and format for developer reference
- No active implementation or debugging work; system is in a stable, awaiting-instruction state

## Key Decisions Made

- Session state is persisted locally in files rather than a remote database (simplifies deployment, keeps data on user's machine)
- Slash command interface (/clear, /resume, /history) chosen for explicit session control (clear intent, easy to test)
- Append-only decision log in decisions.md to maintain audit trail of architectural choices and reasoning

## Open Goals

- Verify /resume command restores conversation context correctly
- Verify /history command returns session data in expected format
- Document session file storage location, schema, and format in architecture.md for future maintainers
- Establish baseline test coverage for all three session commands

## How to Get Started

1. Read architecture.md to understand service boundaries and the session persistence layer
2. Locate