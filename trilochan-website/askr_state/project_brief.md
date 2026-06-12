Last updated: 2026-06-12 20:02

# Project Brief

Askr is a command-line resume assistant that helps users build, manage, and deploy resume content through an interactive CLI. It stores resume data locally, supports session restoration, and integrates with deployment platforms. The core problem it solves: making resume creation and iteration fast and scriptable for developers who prefer the terminal.

## What's In Flight

- Resume command execution and session restoration: documenting and testing the `askr resume` command behavior, including how sessions persist and restore state across invocations.
- Trilochan website v2 redesign: initializing dedicated git repository and feature branch structure to unblock Vercel deployment and separate website from parent monorepo.

## Key Decisions Made

- Dedicated git repository for trilochan-website instead of monorepo subdirectory: cleaner separation for Vercel deployment and independent version control.
- Local-first data storage with session restoration: resume state persists between CLI invocations, enabling long-running workflows without re-entry friction.
- CLI-first interaction model: terminal-native interface prioritizes developer ergonomics over GUI.

## Open Goals

- Complete and document `askr resume` command behavior and session restoration mechanics.
- Execute git initialization in trilochan-website directory and create `feat/v2-redesign` branch.
- Resolve two unanswered user questions from previous