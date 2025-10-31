## Initial concept for an Inhouse ATS checker. 

```mermaid
%%{init: {"theme":"dark","flowchart":{"curve":"basis"}}}%%
flowchart TD
    subgraph A["Input Ingestion"]
        A1["Job Role Name & Description (Text)"]
        A2["Candidate Resume upload (PDF)"]
        A3["Validate & Accept Inputs"]
        A1 --> A3
        A2 --> A3
    end

    subgraph B["Parsing / Extraction"]
        B1["Resume Parser Module (e.g., pyresparser, resume-parser)"]
        B2["Pre-process Resume (clean text, standardise headings, remove graphics/tables)"]
        B3["Job Description Parser (extract required skills, desired skills, job title, years, degree/certification)"]
        B4["Synonym / Related Terms Mapping (e.g., WordNet, embeddings)"]
        A3 --> B1
        B1 --> B2
        B2 --> B4
        A3 --> B3
        B3 --> B4
        B4 --> C1
    end

    subgraph C["Scoring Logic"]
        C1["Feature Vector Construction (skills list, job titles, years, education etc.)"]
        C2["Sub-score Computation (for each factor 0–1: skills, title/role, education, experience years, format/parseability, recency, bonus)"]
        C3["Threshold Checking (if missing must-have skill → heavy penalty or zero)"]
        C4["Overall Score Aggregation (weighted sum, normalisation)"]
        B4 --> C1
        C1 --> C2
        C2 --> C3
        C3 --> C4
        C4 --> D1
    end

    subgraph D["Semantic Matching / LLM Support"]
        D1["Invoke LLM Module (pass feature vector + raw texts + sub-scores)"]
        D2["Semantic Equivalence Analysis (e.g., 'Project X' maps to required skill Y)"]
        D3["LLM-Generated Explanation & Suggestions"]
        D4["Adjust Sub-scores / Flags (if LLM finds synonyms/format issues etc.)"]
        D1 --> D2
        D2 --> D3
        D2 --> D4
        D4 --> D3
        D3 --> E1
    end

    subgraph E["Output"]
        E1["Generate ATS Match Score (e.g., 78%)"]
        E2["Breakdown per Factor (skills %, years %, education %, format %)"]
        E3["Reasoning Text & Improvement Suggestions"]
        E4["Missing Must-have Skills/Certifications Alert"]
        E1 --> E2
        E1 --> E3
        E1 --> E4
    end

    style A fill:#1e1e1e,stroke:#444,stroke-width:1px,color:#e0e0e0
    style B fill:#1e1e1e,stroke:#444,stroke-width:1px,color:#e0e0e0
    style C fill:#1e1e1e,stroke:#444,stroke-width:1px,color:#e0e0e0
    style D fill:#1e1e1e,stroke:#444,stroke-width:1px,color:#e0e0e0
    style E fill:#1e1e1e,stroke:#444,stroke-width:1px,color:#e0e0e0
    linkStyle default stroke:#888,color:#888
