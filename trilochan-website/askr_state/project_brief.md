Last updated: 2026-06-12 22:12

# Project Brief

Leaps is a job search automation platform that eliminates manual application workflows. Users set up job criteria once, then Leaps continuously scans the market, scores matches with a proprietary algorithm, rewrites resumes for each opportunity, and auto-applies on the user's behalf. The product reduces job search friction from weeks of applications to a one-time setup.

## What's In Flight

- Portfolio website refresh: adding Leaps project card to homepage alongside existing portfolio pieces (Heuretos, Founding Engineer, 8bit.ai, Neutrino, Research). Card narrative emphasizes "Stop applying. Start interviewing."
- Footer redesign: converting "Let's talk" section to full-viewport-height page view with equalized button styling (LinkedIn, GitHub, Email all use identical `.footer-btn` class).
- Session restoration and `askr resume` command: documenting expected behavior for CLI session state and resume rewrite command.
- Git hygiene: creating `.gitignore` to exclude OS files and future build artifacts.

## Key Decisions Made

- Vanilla HTML/CSS/JS stack: no build dependencies or framework overhead. Portfolio cards use URL data attributes with click handlers for navigation.
- One-time user setup model: job criteria and resume stored once; system runs autonomously thereafter.
- Leaps Score as core differentiator: proprietary