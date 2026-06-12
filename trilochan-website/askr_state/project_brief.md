Last updated: 2026-06-12 20:12

# Project Brief

Askr is a command-line tool for managing AI-assisted workflows and session state. It enables users to execute commands, restore previous sessions, and maintain context across interactions. The product solves the problem of fragmented AI tool usage by providing a unified interface for session management and command execution.

## What's In Flight

- Documenting and executing `askr resume` command behavior, including session restoration logic and state persistence
- Trilochan website redesign: initializing dedicated Git repository and `feat/v2-redesign` branch in `/Users/saitrilochan/Documents/trilochan-website/`
- Session state management infrastructure to support resuming prior work contexts

## Key Decisions Made

- Dedicated Git repository for trilochan-website instead of monorepo configuration — allows independent versioning and deployment of the website redesign
- Append-only decision log format — maintains audit trail of reasoning without revision history noise
- Command-driven architecture for askr — CLI-first interface enables scripting and integration with other tools

## Open Goals

- Execute and document `askr resume` command behavior and session restoration
- Complete `feat/v2-redesign` branch setup and begin website redesign implementation
- Define session state schema and persistence layer for askr

## How to Get Started

1. Review architecture.md and decisions.md to understand system boundaries and