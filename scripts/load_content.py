#!/usr/bin/env python3
"""
Utility script to load math content into the system.
Processes text content, generates embeddings, and stores in Supabase.
"""


import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_processing.chunkers import MathChunker
from data_processing.embeddings import EmbeddingGenerator
from data_processing.vector_store import VectorStore
from lib.supabase_client import get_supabase_client

load_dotenv()


def load_concept_content(concept_name: str, content: str, concept_id: str, difficulty: str = "intermediate"):
    """
    Load content for a math concept.
    
    Args:
        concept_name: Name of the concept
        content: Text content to process
        concept_id: UUID of the concept in database
        difficulty: Difficulty level
    """
    print(f"Processing content for: {concept_name}")
    
    # Initialize components
    chunker = MathChunker(chunk_size=500, chunk_overlap=50)
    embedding_generator = EmbeddingGenerator()
    vector_store = VectorStore()
    
    # Chunk the content
    print("  Chunking content...")
    chunks = chunker.chunk_by_difficulty(content, difficulty, concept_name)
    print(f"  Created {len(chunks)} chunks")
    
    # Generate embeddings
    print("  Generating embeddings...")
    chunks = embedding_generator.embed_chunks(chunks)
    print(f"  Generated {len(chunks)} embeddings")
    
    # Store in vector database
    print("  Storing in vector database...")
    chunk_ids = vector_store.store_chunks(chunks, concept_id)
    print(f"  Stored {len(chunk_ids)} chunks")
    
    print(f"✅ Successfully loaded content for {concept_name}\n")


def example_usage():
    """Example of loading content."""
    supabase = get_supabase_client()
    
    # Example: Load content for Quadratic Equations
    # First, get the concept ID
    result = supabase.table('math_concepts').select('concept_id').eq('name', 'Quadratic Equations').execute()
    
    if result.data:
        concept_id = result.data[0]['concept_id']
        
        # Example content
        content = """
        Quadratic Equations
        
        A quadratic equation is a polynomial equation of degree 2. The general form is:
        ax² + bx + c = 0
        
        where a, b, and c are constants and a ≠ 0.
        
        Solving Quadratic Equations:
        
        1. Factoring Method:
        If the quadratic can be factored, set each factor equal to zero.
        Example: x² - 5x + 6 = 0
        Factored: (x - 2)(x - 3) = 0
        Solutions: x = 2 or x = 3
        
        2. Quadratic Formula:
        x = (-b ± √(b² - 4ac)) / 2a
        
        The discriminant (b² - 4ac) determines the nature of solutions:
        - If discriminant > 0: Two distinct real solutions
        - If discriminant = 0: One repeated real solution
        - If discriminant < 0: Two complex solutions
        
        3. Completing the Square:
        Transform the equation into the form (x - h)² = k
        """
        
        load_concept_content("Quadratic Equations", content, concept_id, "intermediate")
    else:
        print("Concept not found. Make sure to run seed_data.sql first.")


if __name__ == "__main__":
    # Check for --example flag first
    if len(sys.argv) > 1 and sys.argv[1] == "--example":
        example_usage()
    elif len(sys.argv) < 4:
        print("Usage: python load_content.py <concept_name> <content_file> <concept_id> [difficulty]")
        print("\nExample:")
        print("  python load_content.py 'Quadratic Equations' content.txt <uuid> intermediate")
        print("\nOr run example:")
        print("  python load_content.py --example")
        sys.exit(1)
    else:
        concept_name = sys.argv[1]
        content_file = sys.argv[2]
        concept_id = sys.argv[3]
        difficulty = sys.argv[4] if len(sys.argv) > 4 else "intermediate"
        
        # Read content from file
        with open(content_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        load_concept_content(concept_name, content, concept_id, difficulty)

