-- ============================================================================
-- Semantic RAG over documents (pgvector).
-- Stores embedded chunks of a workbench's documents and exposes a cosine
-- similarity match function. Replaces the frontend's naive keyword RAG.
-- Embedding dim 768 matches Google text-embedding-004.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    document_id UUID,
    chunk_index INT DEFAULT 0,
    content TEXT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_wb ON document_chunks(workbench_id);
-- Approximate-nearest-neighbour index for fast cosine search.
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
    ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_document_chunks(
    p_workbench_id uuid,
    p_query vector(768),
    p_match_count int DEFAULT 6
)
RETURNS TABLE (id uuid, document_id uuid, content text, similarity float)
LANGUAGE sql STABLE AS $$
    SELECT id, document_id, content, 1 - (embedding <=> p_query) AS similarity
    FROM document_chunks
    WHERE workbench_id = p_workbench_id AND embedding IS NOT NULL
    ORDER BY embedding <=> p_query
    LIMIT p_match_count;
$$;
