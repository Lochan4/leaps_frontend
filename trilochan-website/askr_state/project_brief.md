Last updated: 2026-06-12 20:28

# Project Brief

Askr is a personal portfolio and resume platform that generates dynamic, narrative-driven project showcases. It allows users to build a polished web presence by composing project stories, managing contact information, and exporting resume data—all through a command-line interface that orchestrates content generation and session state.

## What's In Flight

- Contact footer implementation: LinkedIn, GitHub, and Email buttons added to portfolio with equal styling. Email uses mailto: links; social buttons need actual profile URLs inserted.
- Project card reordering and horizontal scroll: Six projects now displayed (Leaps, Heuretos, Founding Engineer, 8bit.ai, Neutrino, Research) with Leaps card populated with full narrative.
- Resume command behavior: `askr resume` execution and session restoration logic needs documentation and testing.

## Key Decisions Made

- Footer buttons use equal visual intensity across all three (email, LinkedIn, GitHub) rather than highlighting email as primary.
- Project cards render in horizontal scroll with click handlers that open URLs from data attributes or trigger mailto: for email.
- Content array in script.js drives card rendering; project order is now: Leaps, Heuretos, Founding Engineer, 8bit.ai, Neutrino, Research.
- Email footer uses mailto: with pre-filled recipient; social links open in new tabs.

##