# Handover: trilochan

Last updated: 2026-06-12 19:45

# Handover Document

## Task
Add contact footer section with LinkedIn/GitHub/Gmail buttons, make it full-viewport height, equalize button styling intensity, reorder portfolio cards, and add Leaps company card with full narrative.

## Status
- `/Users/saitrilochan/Documents/trilochan-website/index.html` — Footer section added with three buttons (LinkedIn, GitHub, Email me). Portfolio cards array reordered to: Leaps → Heuretos → Founding Engineer → 8bit.ai → Neutrino → Research. Leaps card content includes full narrative: "Stop applying. Start interviewing." with description of one-time setup, real-time job scanning, Leaps Score, resume rewrite, auto-apply. Card structure wrapped in `.card-face` with URL data attributes for click handlers.
- `/Users/saitrilochan/Documents/trilochan-website/style.css` — Footer styled with `height: 100vh` for full viewport. All three footer buttons (`.footer-btn`) set to equal intensity with consistent background, border, and hover states. Removed `.footer-btn--email` class override that was causing unequal highlighting. Added `.card:hover` and `.card:active` styles for card interaction feedback. `.cards-rail` uses `align-items: stretch` for uniform
