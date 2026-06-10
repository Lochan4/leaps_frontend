Last updated: 2026-06-10 20:58

# Project Brief

askr is a CLI tool that manages conversational session history and state, allowing users to resume previous conversations and review interaction logs. It solves the problem of losing context across terminal sessions by persisting structured session data locally.

## What's In Flight

- Testing /resume and /history commands to verify core functionality works as expected
- Documenting session file storage architecture, including location, format, and structure
- Validating that session state persists correctly across CLI invocations

## Key Decisions Made

- Session files stored locally in askr_state/ directory with structured format rather than cloud-based storage. Reason: user privacy and offline-first operation.
- CLI commands use /resume and /history syntax for consistency with common shell patterns.
- Architecture documentation lives in askr_state/architecture.md to keep system design close to implementation.

## Open Goals

- Execute askr history command and verify output format matches expected session log structure
- Execute askr resume command and confirm previous conversation context loads correctly
- Document session file storage location, naming convention, and JSON/text format for developer reference
- Resolve write permissions on askr_state/architecture.md to enable documentation updates

## How to Get Started

1. Locate the askr CLI at /Users/saitrilochan/bin/askr and verify it's executable.
2. Review existing session files in /