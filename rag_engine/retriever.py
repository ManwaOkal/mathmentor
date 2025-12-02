"""
Retrieves relevant math content using vector similarity search.
"""
from typing import List, Dict, Any, Optional
from data_processing.embeddings import EmbeddingGenerator
from data_processing.vector_store import VectorStore


class ContentRetriever:
    """
    Retrieves relevant math content chunks based on queries.
    """
    
    def __init__(self):
        """Initialize retriever with embedding generator and vector store."""
        self.embedding_generator = EmbeddingGenerator()
        self.vector_store = VectorStore()
    
    def retrieve(
        self,
        query: str,
        limit: int = 5,
        concept_id: Optional[str] = None,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant content chunks for a query.
        
        Args:
            query: Student's question or search query
            limit: Maximum number of chunks to retrieve
            concept_id: Optional filter by concept
            threshold: Minimum similarity threshold
            
        Returns:
            List of relevant chunks with similarity scores
        """
        # Generate embedding for query
        query_embedding = self.embedding_generator.generate_embedding(query)
        
        # Search for similar chunks (reduce limit for faster queries)
        search_limit = min(limit, 5)  # Cap at 5 for performance
        results = self.vector_store.similarity_search(
            query_embedding=query_embedding,
            limit=search_limit,
            concept_id=concept_id,
            threshold=threshold
        )
        
        return results
    
    def format_context(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Format retrieved chunks into context string for LLM.
        
        Args:
            chunks: List of retrieved chunks
            
        Returns:
            Formatted context string
        """
        if not chunks:
            return "No relevant content found."
        
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            content = chunk.get('content', '')
            concept_info = ""
            
            # Add concept name if available
            if chunk.get('math_concepts'):
                concept_name = chunk['math_concepts'].get('name', '')
                if concept_name:
                    concept_info = f"[Concept: {concept_name}] "
            
            context_parts.append(f"{concept_info}{content}")
        
        return "\n\n---\n\n".join(context_parts)
    
    def retrieve_and_format(
        self,
        query: str,
        limit: int = 5,
        concept_id: Optional[str] = None
    ) -> str:
        """
        Retrieve chunks and format as context string.
        
        Args:
            query: Student's question
            limit: Maximum number of chunks
            concept_id: Optional concept filter
            
        Returns:
            Formatted context string
        """
        chunks = self.retrieve(query, limit=limit, concept_id=concept_id)
        return self.format_context(chunks)


