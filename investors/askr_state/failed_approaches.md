# Failed Approaches

Cumulative cross-session log. Never overwritten — append only.

- [2026-10-02] Created tabbed HTML diagram with 8 separate tabs, each containing ASCII art component boxes and text descriptions — User rejected as fragmented and not visually comprehensive; requires clicking between tabs to see full system, defeating purpose of unified architecture diagram
- [2026-10-02] Generated diagram with separate boxes for each component without showing complete data flow connections between all layers — User emphasized need to see 'what is happening completely' in one view; partial connections insufficient for understanding full system behavior
- [2026-10-02] Multi-tab HTML diagram (8 separate tabs for system, auth, ingest, AI pipeline, database, API, workers, notifications) — User rejected as fragmented; requested single unified diagram showing all aspects simultaneously
- [2026-10-02] ASCII art component boxes with text labels in HTML — User rejected as insufficient; requested proper visual diagram with clear connections and data flows
- [2026-10-02] Auto-project-creation workflow triggered by email ingestion — User specified manual project creation as requirement; auto-creation removed from flow
- [2026-10-03] Building demo.html with a complex D3.js knowledge graph visualization in the conversation interface — User rejected the graph visualization approach; RAG system with inline context display is simpler and more direct
- [2026-10-03] Showing asset relationships as a graph in the assets panel — User rejected graph visualization entirely; assets panel should show file list and artifact analysis only
- [2026-10-03] Use htmlpreview.github.io to render GitHub Gist-hosted lld-diagram.html — Service returned 404 errors when shared in email; unreliable for stakeholder communication
- [2026-10-03] Use htmlpreview.github.io to serve lld-diagram.html from GitHub Gist — Service returned 404 errors when shared in email; unreliable for production sharing
- [2026-10-03] Use Netlify Drop for one-time file hosting — User rejected in favor of a versioned, persistent solution; Netlify Drop requires manual re-upload for every change
- [2026-10-03] Attempted to use gh api repos/.../pages -X POST with inline JSON flags (--field source[branch]=main) — GitHub CLI does not support nested field syntax in flag form; required --input with piped JSON instead
