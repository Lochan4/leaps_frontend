Last updated: 2026-06-12 19:48

# Project Brief

askr is a command-line interface for Claude that manages multi-turn conversations with persistent session state. It stores conversation history, settings, and session metadata locally to enable resumable workflows without re-authenticating or losing context between invocations.

## What's In Flight

- Document the `askr resume` command behavior and session restoration mechanism
- Write complete architecture documentation for the askr codebase
- Resolve permission configuration blocker preventing autonomous documentation work

## Key Decisions Made

- Session state persists in `~/.claude/sessions/` as handover files (git history: commits 9e6424f, a404549)
- User settings stored in `~/.claude/settings.json` with permission controls
- Handover files in the askr repo serve as the session persistence system
- Architecture documentation target: `/Users/saitrilochan/Documents/trilochan-website/askr_state/architecture.md`

## Open Goals

- Complete architecture.md with session restoration mechanism documented
- Resolve write permissions to `~/.claude/settings.json` to unblock autonomous work
- Execute and test `askr resume` command end-to-end
- Document session state lifecycle (creation, update, restoration, cleanup)

## How to Get Started

1. Clone or navigate to `/Users/saitrilochan/Documents/ask