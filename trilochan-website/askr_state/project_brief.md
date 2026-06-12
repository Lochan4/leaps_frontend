Last updated: 2026-06-12 19:46

# Project Brief

Trilochan's personal portfolio and professional presence website. The product showcases work experience, projects, and contact information in a modern, interactive card-based layout. It serves as a landing page for professional opportunities and networking.

## What's In Flight

- Contact footer section with LinkedIn, GitHub, and email buttons styled for full viewport height
- Portfolio card reordering: Leaps (featured first) followed by Heuretos, Founding Engineer, 8bit.ai, Neutrino, Research
- Leaps company card with full narrative: "Stop applying. Start interviewing." including one-time setup, real-time job scanning, Leaps Score, resume rewrite, and auto-apply features
- Button styling equalization across footer to remove visual intensity inconsistencies
- Card interaction feedback (hover and active states)

## Key Decisions Made

- Card-based layout with horizontal rail scrolling for portfolio presentation
- Footer occupies full viewport height for prominent contact access
- Leaps positioned as primary portfolio item due to strategic importance
- Consistent button styling across all interactive elements to reduce cognitive load
- Data attributes on card elements for click handler routing rather than inline onclick handlers

## Open Goals

- Document askr resume command behavior and session restoration logic
- Verify footer button click handlers route correctly to external URLs
- Test card rail responsiveness on mobile viewports