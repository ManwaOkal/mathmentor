"""
Text chunking strategies for math content.
Chunks content by concept, difficulty, and topic hierarchy.
"""
from typing import List, Dict, Any
import re


class MathChunker:
    """
    Chunks math content appropriately for RAG.
    Strategies:
    - By mathematical concept
    - By difficulty level
    - By topic hierarchy
    """
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize chunker.
        
        Args:
            chunk_size: Maximum characters per chunk
            chunk_overlap: Characters to overlap between chunks
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def chunk_by_concept(self, text: str, concept_name: str) -> List[Dict[str, Any]]:
        """
        Chunk text by mathematical concept.
        Looks for concept boundaries, definitions, theorems, examples.
        
        Args:
            text: Content to chunk
            concept_name: Name of the math concept
            
        Returns:
            List of chunks with metadata
        """
        chunks = []
        
        # Split by common math content markers
        sections = re.split(r'\n\n+|\n(?=[A-Z][^.!?]*:)|(?=Definition|Theorem|Example|Proof|Solution)', text)
        
        current_chunk = ""
        chunk_index = 0
        
        for section in sections:
            section = section.strip()
            if not section:
                continue
            
            # If adding this section would exceed chunk size, save current chunk
            if current_chunk and len(current_chunk) + len(section) > self.chunk_size:
                chunks.append({
                    'content': current_chunk.strip(),
                    'concept_name': concept_name,
                    'chunk_index': chunk_index,
                    'chunk_type': 'concept',
                    'metadata': {}
                })
                chunk_index += 1
                
                # Start new chunk with overlap
                if self.chunk_overlap > 0 and current_chunk:
                    overlap_text = current_chunk[-self.chunk_overlap:]
                    current_chunk = overlap_text + "\n\n" + section
                else:
                    current_chunk = section
            else:
                if current_chunk:
                    current_chunk += "\n\n" + section
                else:
                    current_chunk = section
        
        # Add final chunk
        if current_chunk:
            chunks.append({
                'content': current_chunk.strip(),
                'concept_name': concept_name,
                'chunk_index': chunk_index,
                'chunk_type': 'concept',
                'metadata': {}
            })
        
        return chunks
    
    def chunk_by_difficulty(self, text: str, difficulty: str, concept_name: str) -> List[Dict[str, Any]]:
        """
        Chunk text by difficulty level.
        
        Args:
            text: Content to chunk
            difficulty: Difficulty level (beginner, intermediate, advanced)
            concept_name: Name of the math concept
            
        Returns:
            List of chunks with difficulty metadata
        """
        chunks = self.chunk_by_concept(text, concept_name)
        
        # Add difficulty metadata to each chunk
        for chunk in chunks:
            chunk['metadata']['difficulty'] = difficulty
        
        return chunks
    
    def chunk_by_section(self, text: str, sections: Dict[str, str], concept_name: str) -> List[Dict[str, Any]]:
        """
        Chunk text by predefined sections.
        
        Args:
            text: Content to chunk
            sections: Dict mapping section names to content
            concept_name: Name of the math concept
            
        Returns:
            List of chunks organized by section
        """
        chunks = []
        chunk_index = 0
        
        for section_name, section_content in sections.items():
            section_chunks = self.chunk_by_concept(section_content, concept_name)
            
            for chunk in section_chunks:
                chunk['chunk_index'] = chunk_index
                chunk['metadata']['section'] = section_name
                chunks.append(chunk)
                chunk_index += 1
        
        return chunks
    
    def chunk_simple(self, text: str, concept_name: str) -> List[Dict[str, Any]]:
        """
        Simple chunking by fixed size.
        Fallback method when no specific structure is available.
        
        Args:
            text: Content to chunk
            concept_name: Name of the math concept
            
        Returns:
            List of chunks
        """
        chunks = []
        words = text.split()
        current_chunk = []
        current_length = 0
        chunk_index = 0
        
        for word in words:
            word_length = len(word) + 1  # +1 for space
            
            if current_length + word_length > self.chunk_size and current_chunk:
                chunks.append({
                    'content': ' '.join(current_chunk),
                    'concept_name': concept_name,
                    'chunk_index': chunk_index,
                    'chunk_type': 'simple',
                    'metadata': {}
                })
                chunk_index += 1
                
                # Keep overlap
                if self.chunk_overlap > 0:
                    overlap_words = current_chunk[-self.chunk_overlap // 10:]  # Approximate
                    current_chunk = overlap_words + [word]
                    current_length = len(' '.join(current_chunk))
                else:
                    current_chunk = [word]
                    current_length = word_length
            else:
                current_chunk.append(word)
                current_length += word_length
        
        # Add final chunk
        if current_chunk:
            chunks.append({
                'content': ' '.join(current_chunk),
                'concept_name': concept_name,
                'chunk_index': chunk_index,
                'chunk_type': 'simple',
                'metadata': {}
            })
        
        return chunks












