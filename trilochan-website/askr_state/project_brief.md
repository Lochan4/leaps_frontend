Last updated: 2026-06-12 17:46

# Project Brief

askr is a CLI tool that integrates Claude AI into shell workflows, enabling users to execute natural language commands, manage conversation sessions, and maintain persistent permissions for file operations. It solves the friction of context-switching between terminal and AI interfaces by bringing AI capabilities directly into the command line.

## What's In Flight

- Persistent permissions configuration: completing write of ~/.claude/settings.json with rules-based permission system (destructive operations ask for confirmation, read operations allowed without prompt)
- Session restoration and `askr resume` command behavior: documenting how sessions persist and are restored across invocations
- Permission rules engine: first-match-wins evaluation of tool access (rm operations prioritized first, then read allows)

## Key Decisions Made

- Permissions stored in ~/.claude/settings.json as rules array rather than flags: eliminates need for --dangerously-skip-permissions on every invocation
- Destructive operations (rm) placed first in rules array: ensures confirmation prompts take precedence over blanket allows
- Session-based architecture: conversations persist and can be resumed, maintaining context across CLI calls
- Claude Code integration: tool access controlled through explicit permission rules, not blanket allow/deny

## Open Goals

- Complete and verify ~/.claude/settings.json write with properly formatted permissions rules
- Test that read operations execute without prompting and rm operations trigger confirmation
-