"""
Semantic RAG endpoints. Index a document's text into embedded chunks, and
search them by meaning for the AI consultant's context.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase
from services.embedding_service import embedding_service

router = APIRouter()


class IndexRequest(BaseModel):
    document_id: Optional[str] = None
    text: str


class SearchRequest(BaseModel):
    query: str
    match_count: int = 6


@router.get("/status")
async def status():
    return {"enabled": embedding_service.enabled, "model": embedding_service.MODEL, "dim": embedding_service.DIM}


@router.post("/index/{workbench_id}")
async def index_document(workbench_id: str, req: IndexRequest):
    if not embedding_service.enabled:
        raise HTTPException(status_code=503, detail="Embeddings disabled: set GEMINI_API_KEY.")
    try:
        chunks = embedding_service.chunk(req.text)
        if not chunks:
            return {"indexed": 0}
        # Re-index: drop existing chunks for this document first.
        if req.document_id:
            supabase.table("document_chunks").delete() \
                .eq("workbench_id", workbench_id).eq("document_id", req.document_id).execute()
        rows = []
        for i, c in enumerate(chunks):
            try:
                emb = embedding_service.embed(c, task_type="retrieval_document")
                rows.append({
                    "workbench_id": workbench_id,
                    "document_id": req.document_id,
                    "chunk_index": i,
                    "content": c,
                    "embedding": emb,
                })
            except Exception as e:
                print(f"[RAG] embed failed for chunk {i}: {e}")
        if rows:
            supabase.table("document_chunks").insert(rows).execute()
        return {"indexed": len(rows), "chunks": len(chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/{workbench_id}")
async def search(workbench_id: str, req: SearchRequest):
    if not embedding_service.enabled:
        return {"results": [], "enabled": False}
    try:
        q_emb = embedding_service.embed(req.query, task_type="retrieval_query")
        res = supabase.rpc("match_document_chunks", {
            "p_workbench_id": workbench_id,
            "p_query": q_emb,
            "p_match_count": req.match_count,
        }).execute()
        return {"results": res.data or [], "enabled": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
