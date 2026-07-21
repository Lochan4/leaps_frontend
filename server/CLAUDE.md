# Laptop Server — Claude Code Instructions

This repo turns this laptop into a remote server. You are the AI agent running on it.

## What you can do when triggered remotely:
- Run shell commands (via `scripts/run.sh`)
- Read/write files in the `workspace/` directory
- Start/stop services
- Report system status

## Key paths:
- API server: `server/index.js` (port 3001)
- File workspace: `workspace/`
- Logs: `logs/`
- Config: `.env`

## When triggered via GitHub webhook or RemoteTrigger:
1. Pull latest from GitHub first: `git pull origin main`
2. Execute the requested task
3. Commit results back if needed: `git add . && git commit -m "agent: <task>"`

## Never do:
- Delete files outside `workspace/` without confirmation
- Expose `.env` or secrets
- Run destructive system commands without user confirmation
