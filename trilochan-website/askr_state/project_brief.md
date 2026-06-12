Last updated: 2026-06-12 22:16

# Project Brief

Trilochan's personal portfolio website — a vanilla HTML/CSS/JS site showcasing professional projects and work history. The site serves as a landing page and portfolio hub with project cards, footer navigation, and resume/contact functionality.

## What's In Flight

- Verifying footer button styling equality (LinkedIn, GitHub, Email) — removed `.footer-btn--email` class that was causing visual inconsistency
- Testing Leaps project card click behavior and URL navigation wiring via data attributes
- Establishing project structure with `.gitignore` for macOS, editor configs, logs, and env files
- Documenting `askr resume` command behavior and session restoration (open goal from prior work)

## Key Decisions Made

- No build tool or dependencies — vanilla HTML/CSS/JS keeps the project lightweight and dependency-free
- Portfolio card structure uses data attributes for URL routing instead of hardcoded links, enabling flexible navigation
- Card hover and press states added to CSS for consistent interaction feedback across all six project cards
- Footer buttons styled with equal visual intensity to avoid one button (email) standing out more than others

## Open Goals

- Execute and document `askr resume` command behavior and session restoration
- Verify all three footer button styles render with equal intensity in browser
- Test Leaps card click behavior and confirm data attributes wire correctly to URLs
- Identify remaining