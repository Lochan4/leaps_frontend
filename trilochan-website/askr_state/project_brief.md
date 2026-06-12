Last updated: 2026-06-12 19:51

# Project Brief

Askr is a command-line tool for managing AI-assisted resume workflows. It enables users to execute resume operations, restore previous sessions, and maintain conversation state across invocations. The product solves the problem of fragmented resume iteration by providing a persistent, command-driven interface to AI assistance.

## What's In Flight

- Resume command execution and session restoration: documenting and implementing the `askr resume` command behavior, including how sessions persist and restore across CLI invocations.
- Vercel hosting preparation for trilochan-website: inspecting project structure, identifying Vercel compatibility requirements, and planning Git workflow for deployment.

## Key Decisions Made

- Session state is persisted to disk to enable resumption across CLI calls; this avoids re-prompting users and maintains conversation continuity.
- CLI uses a command-driven architecture (e.g., `askr resume`, `askr [command]`) rather than interactive REPL, allowing scripting and clear intent signaling.
- Configuration is stored in ~/.claude/settings.json with permission rules for sensitive operations (rm, git require confirmation).

## Open Goals

- Document exact behavior of `askr resume` command: what triggers session restoration, how state is loaded, error handling for missing or corrupted sessions.
- Implement and test session restoration logic end-to-end.
- Complete Vercel