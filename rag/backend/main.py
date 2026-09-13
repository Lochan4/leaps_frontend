from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from rag.pipeline import RAGPipeline

app = FastAPI(title="RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = RAGPipeline()


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


@app.post("/train")
async def train(files: list[UploadFile] = File(...)):
    results = []
    for file in files:
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(400, f"{file.filename} is not a PDF")
        content = await file.read()
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


@app.post("/search")
async def search(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(400, "Query cannot be empty")
    return pipeline.search(request.query, request.top_k)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
