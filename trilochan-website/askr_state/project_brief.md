Last updated: 2026-06-12 17:57

# Project Brief

askr is a command-line tool that manages Claude API interactions with local session persistence, permissions rules, and configuration management. It lets users run Claude commands from the terminal, restore previous sessions, and control what the AI can access through a centralized settings file.

## What's In Flight

- Merge permissions rules into `~/.claude/settings.json` without overwriting existing user configuration. Current blocker: sandbox prevents reading the settings file; next step is to request file contents from the user.
- Document and execute `askr resume` command behavior for session restoration. This command should restore previous conversation state and allow users to continue where they left off.
- Settings file access and validation layer to ensure permissions rules are properly integrated before any agent operations.

## Key Decisions Made

- Settings stored in `~/.claude/settings.json` as single source of truth for permissions and configuration. Allows users to version control and audit their rules.
- Sandbox environment restricts direct file access from agents; all file operations must go through user-provided content or explicit tool access. This is a security boundary we work within, not around.
- Append-only decision log in decisions.md to maintain audit trail of architectural choices and reasoning.
- Session restoration via `askr resume` command rather than automatic session recovery, giving users explicit control over context switching.

## Open Goals

- Obtain current contents of