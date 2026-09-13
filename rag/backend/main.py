from dotenv import load_dotenv
load_dotenv()

import logging
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from rag.pipeline import RAGPipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

MAX_FILE_SIZE  = 50 * 1024 * 1024   # 50 MB
MAX_FILE_COUNT = 20

_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app = FastAPI(title="RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

pipeline = RAGPipeline()


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


@app.post("/train")
async def train(files: list[UploadFile] = File(...)):
    if len(files) > MAX_FILE_COUNT:
        raise HTTPException(400, f"Too many files — max {MAX_FILE_COUNT} per request")
    results = []
    for file in files:
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(400, f"{file.filename} is not a PDF")
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(413, f"{file.filename} exceeds the 50 MB size limit")
        logger.info("Ingesting %s (%d bytes)", file.filename, len(content))
        result = pipeline.ingest(content, file.filename or "unknown.pdf")
        results.append(result)
    return {
        "status": "trained",
        "documents": results,
        "total_chunks": sum(r["chunks"] for r in results),
    }


@app.get("/train")
async def list_documents():
    return {"documents": pipeline.documents}


@app.delete("/train/{filename:path}")
async def delete_document(filename: str):
    if not pipeline.graph.document_exists(filename):
        raise HTTPException(404, f"'{filename}' not found in the knowledge base")
    pipeline.delete(filename)
    logger.info("Deleted document: %s", filename)
    return {"status": "deleted", "filename": filename}


@app.post("/search")
async def search(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(400, "Query cannot be empty")
    return pipeline.search(request.query, request.top_k)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
