-- Create RPC function for vector similarity search
-- This function enables efficient similarity search using pgvector

CREATE OR REPLACE FUNCTION match_content_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  concept_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  concept_id uuid,
  content text,
  metadata jsonb,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    content_chunks.chunk_id,
    content_chunks.concept_id,
    content_chunks.content,
    content_chunks.metadata,
    content_chunks.chunk_index,
    1 - (content_chunks.embedding <=> query_embedding) AS similarity
  FROM content_chunks
  WHERE 
    (concept_filter IS NULL OR content_chunks.concept_id = concept_filter)
    AND (1 - (content_chunks.embedding <=> query_embedding)) >= match_threshold
  ORDER BY content_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index for better performance (if not already created)
-- This uses IVFFlat index for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS content_chunks_embedding_idx 
ON content_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);









