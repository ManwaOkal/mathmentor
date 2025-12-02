"""
Store and retrieve embeddings from Supabase using pgvector.
"""
from typing import List, Dict, Any, Optional
from lib.supabase_client import get_supabase_client
import uuid


class VectorStore:
    """
    Manages vector storage and retrieval using Supabase pgvector.
    """
    
    def __init__(self):
        """Initialize vector store with Supabase client."""
        self.client = get_supabase_client()
    
    def store_chunks(self, chunks: List[Dict[str, Any]], concept_id: str) -> List[str]:
        """
        Store content chunks with embeddings in Supabase.
        
        Args:
            chunks: List of chunks with 'content', 'embedding', and metadata
            concept_id: UUID of the math concept
            
        Returns:
            List of chunk IDs that were created
        """
        chunk_ids = []
        
        for chunk in chunks:
            if 'embedding' not in chunk:
                raise ValueError("Chunk must have 'embedding' field before storing")
            
            chunk_data = {
                'chunk_id': str(uuid.uuid4()),
                'concept_id': concept_id,
                'content': chunk['content'],
                'embedding': chunk['embedding'],
                'metadata': {
                    'chunk_index': chunk.get('chunk_index', 0),
                    'chunk_type': chunk.get('chunk_type', 'simple'),
                    **chunk.get('metadata', {})
                },
                'chunk_index': chunk.get('chunk_index', 0)
            }
            
            try:
                result = self.client.table('content_chunks').insert(chunk_data).execute()
                if result.data:
                    chunk_ids.append(result.data[0]['chunk_id'])
            except Exception as e:
                raise Exception(f"Failed to store chunk: {str(e)}")
        
        return chunk_ids
    
    def similarity_search(
        self,
        query_embedding: List[float],
        limit: int = 5,
        concept_id: Optional[str] = None,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Search for similar content using vector similarity.
        
        Args:
            query_embedding: Embedding vector of the query
            limit: Maximum number of results
            concept_id: Optional filter by concept ID
            threshold: Minimum similarity threshold (0-1)
            
        Returns:
            List of similar chunks with similarity scores
        """
        try:
            # Build base query for fallback
            query = self.client.table('content_chunks').select('*, math_concepts(*)')
            
            # Filter by concept if provided
            if concept_id:
                query = query.eq('concept_id', concept_id)
            
            # Try RPC function first (if it exists and works)
            try:
                # Supabase should handle list to vector conversion automatically
                # Pass embedding as list directly
                result = self.client.rpc(
                    'match_content_chunks',
                    {
                        'query_embedding': query_embedding,
                        'match_threshold': float(threshold),
                        'match_count': int(limit),
                        'concept_filter': concept_id
                    }
                ).execute()
                
                if result.data:
                    return result.data
            except Exception as e:
                # If RPC fails, fall back to manual similarity calculation
                # Don't print error if it's just that the function doesn't exist
                error_str = str(e).lower()
                if 'function' not in error_str and 'does not exist' not in error_str:
                    print(f"Warning: Similarity search RPC error: {str(e)}")
                # Continue to fallback
            
            # Fallback: Manual similarity calculation (always use this if RPC fails)
            try:
                all_chunks = query.execute()
                
                if not all_chunks.data:
                    return []
                
                # Calculate cosine similarity manually
                results = []
                for chunk in all_chunks.data:
                    if chunk.get('embedding'):
                        # Ensure embedding is a list
                        chunk_embedding = chunk['embedding']
                        if isinstance(chunk_embedding, str):
                            # If it's stored as a string, parse it
                            import json
                            try:
                                chunk_embedding = json.loads(chunk_embedding)
                            except:
                                continue
                        
                        # Ensure both embeddings are lists of numbers
                        if not isinstance(chunk_embedding, list):
                            continue
                        
                        try:
                            similarity = self._cosine_similarity(query_embedding, chunk_embedding)
                            if similarity >= threshold:
                                chunk['similarity'] = similarity
                                results.append(chunk)
                        except Exception as e:
                            # Skip chunks with invalid embeddings
                            continue
                
                # Sort by similarity and limit
                results.sort(key=lambda x: x.get('similarity', 0), reverse=True)
                return results[:limit]
                
            except Exception as e:
                print(f"Error in fallback similarity search: {str(e)}")
                return []
        except Exception as e:
            # Ultimate fallback - return empty list if everything fails
            print(f"Critical error in similarity_search: {str(e)}")
            return []
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Cosine similarity score (0-1)
        """
        import math
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(a * a for a in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    def get_chunks_by_concept(self, concept_id: str) -> List[Dict[str, Any]]:
        """
        Get all chunks for a specific concept.
        
        Args:
            concept_id: UUID of the math concept
            
        Returns:
            List of chunks
        """
        try:
            result = self.client.table('content_chunks').select('*').eq('concept_id', concept_id).order('chunk_index').execute()
            return result.data if result.data else []
        except Exception as e:
            raise Exception(f"Failed to retrieve chunks: {str(e)}")
    
    def delete_chunks_by_concept(self, concept_id: str) -> bool:
        """
        Delete all chunks for a specific concept.
        
        Args:
            concept_id: UUID of the math concept
            
        Returns:
            True if successful
        """
        try:
            self.client.table('content_chunks').delete().eq('concept_id', concept_id).execute()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete chunks: {str(e)}")


