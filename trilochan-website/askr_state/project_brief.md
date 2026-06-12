Last updated: 2026-06-12 17:45

# Project Brief

askr is a Python CLI tool that manages conversation history and session state for AI interactions. It allows users to resume previous conversations, view interaction history, and maintain persistent session context across invocations.

## What's In Flight

- Testing and documenting `askr history` command output format and behavior
- Testing and documenting `askr resume` command behavior and session restoration mechanics
- Updating askr_state blockers file with findings from command execution
- Permission model refinement: current implementation requires user approval for bash command execution and file writes

## Key Decisions Made

- CLI implemented in Python with subcommand architecture (history, resume, etc.)
- State management uses file-based storage at /Users/saitrilochan/Documents/trilochan-website/askr_state/
- Permission-gated execution model: bash commands and file operations require explicit user approval before execution
- Script location: /Users/saitrilochan/bin/askr

## Open Goals

- Execute `askr history` command and document output format, filtering options, and display behavior
- Execute `askr resume` command and document session restoration behavior, state loading, and context preservation
- Complete findings documentation in askr_state/blockers.md with command behavior specifications
- Resolve permission constraints blocking test execution and documentation writes

## How to Get Started

1. Review the current