# Graph-enhanced RAG

A full-stack Retrieval-Augmented Generation (RAG) system that indexes PDFs into a hybrid knowledge base (Neo4j vector store + knowledge graph + BM25) and answers natural-language questions using Claude Sonnet.

## How it works

**Ingest:** PDFs → text/table extraction → chunking → embedding (BAAI/bge-m3) → Neo4j (vector + graph) + BM25

**Search:** query → BM25 (sparse) + vector search (dense) + 2-hop graph traversal → RRF fusion → cross-encoder rerank → Claude Sonnet answer

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Neo4j 5.11+** running locally (or remote)
- **Claude Code** logged in: `claude auth login`

### Neo4j setup

Download [Neo4j Desktop](https://neo4j.com/download/) or run via Docker:

```bash
docker run -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:5
```

## Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Neo4j credentials

# Start the API server (port 8000)
python main.py
```

## Frontend

```bash
cd frontend

npm install
npm run dev   # http://localhost:5173
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/train` | Upload and index one or more PDFs (multipart/form-data, field: `files`) |
| `GET` | `/train` | List all indexed documents |
| `DELETE` | `/train/{filename}` | Remove a document from the index |
| `POST` | `/search` | Query the knowledge base (`{"query": "...", "top_k": 5}`) |

**Limits:** 50 MB per file, 20 files per request.

## Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j connection URI |
| `NEO4J_USER` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | `password` | Neo4j password |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |
