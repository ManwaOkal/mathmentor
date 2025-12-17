#!/usr/bin/env python3
"""
Advanced content loader for MathMentor with bulk processing capabilities.
"""
import os
import sys
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
import uuid
import logging
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_processing.chunkers import MathChunker
from data_processing.embeddings import EmbeddingGenerator
from data_processing.vector_store import VectorStore
from lib.supabase_client import get_supabase_client

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()


@dataclass
class MathContent:
    """Data class for math content organization."""
    concept_name: str
    topic: str
    subtopic: str
    grade_level: str
    difficulty: str
    content_type: str  # 'concept', 'example', 'practice', 'application'
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    prerequisites: List[str] = field(default_factory=list)
    learning_objectives: List[str] = field(default_factory=list)


class BulkContentLoader:
    """Handles bulk loading of math content from various sources."""
    
    def __init__(self, batch_size: int = 20, max_workers: int = 5):
        self.batch_size = batch_size
        self.max_workers = max_workers
        self.concepts_loaded = 0
        self.chunks_created = 0
        
    def load_from_textbooks(self, textbook_dir: str) -> List[MathContent]:
        """Load content from structured textbook files."""
        contents = []
        textbook_dir = Path(textbook_dir)
        
        if not textbook_dir.exists():
            logger.warning(f"Textbook directory not found: {textbook_dir}")
            return contents
        
        for textbook_file in textbook_dir.glob("*.txt"):
            try:
                with open(textbook_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                # Parse textbook structure
                current_concept = None
                current_content = []
                
                for line in lines:
                    if line.startswith("## "):  # New concept
                        if current_concept:
                            contents.append(self._create_math_content(current_concept, current_content))
                        current_concept = line[3:].strip()
                        current_content = []
                    else:
                        current_content.append(line)
                
                if current_concept:
                    contents.append(self._create_math_content(current_concept, current_content))
            except Exception as e:
                logger.error(f"Error reading {textbook_file}: {e}")
        
        return contents
    
    def load_from_khan_academy_format(self, json_file: str) -> List[MathContent]:
        """Load content structured like Khan Academy."""
        json_path = Path(json_file)
        if not json_path.exists():
            logger.warning(f"Khan Academy file not found: {json_file}")
            return []
        
        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Error reading Khan Academy file: {e}")
            return []
        
        contents = []
        for subject in data.get('subjects', []):
            for unit in subject.get('units', []):
                for lesson in unit.get('lessons', []):
                    content = MathContent(
                        concept_name=lesson.get('title', 'Untitled'),
                        topic=subject.get('title', 'Mathematics'),
                        subtopic=unit.get('title', ''),
                        grade_level=lesson.get('grade_level', 'high_school'),
                        difficulty=lesson.get('difficulty', 'intermediate'),
                        content_type='concept',
                        content=self._format_lesson_content(lesson),
                        metadata={
                            'source': 'khan_academy',
                            'video_id': lesson.get('video_id'),
                            'duration': lesson.get('duration')
                        },
                        learning_objectives=lesson.get('learning_objectives', [])
                    )
                    contents.append(content)
        
        return contents
    
    def load_from_openstax(self, csv_file: str) -> List[MathContent]:
        """Load content from OpenStax format (CSV)."""
        csv_path = Path(csv_file)
        if not csv_path.exists():
            logger.warning(f"OpenStax file not found: {csv_file}")
            return []
        
        try:
            import pandas as pd
        except ImportError:
            logger.error("pandas is required for CSV loading. Install with: pip install pandas")
            return []
        
        try:
            df = pd.read_csv(csv_path)
            contents = []
            
            for _, row in df.iterrows():
                content = MathContent(
                    concept_name=row.get('concept_name', 'Unknown'),
                    topic=row.get('chapter', 'Mathematics'),
                    subtopic=row.get('section', ''),
                    grade_level=row.get('grade_level', 'high_school'),
                    difficulty=row.get('difficulty', 'intermediate'),
                    content_type=row.get('content_type', 'concept'),
                    content=str(row.get('content', '')),
                    metadata={
                        'source': 'openstax',
                        'isbn': row.get('isbn'),
                        'page': row.get('page')
                    },
                    prerequisites=self._parse_json_field(row.get('prerequisites', '[]')),
                    learning_objectives=self._parse_json_field(row.get('learning_objectives', '[]'))
                )
                contents.append(content)
            
            return contents
        except Exception as e:
            logger.error(f"Error reading OpenStax CSV: {e}")
            return []
    
    def _parse_json_field(self, value: Any) -> List[str]:
        """Parse JSON field safely."""
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except:
                return []
        return []
    
    def _create_math_content(self, concept: str, content_lines: List[str]) -> MathContent:
        """Create MathContent object from parsed textbook content."""
        content_text = ''.join(content_lines)
        grade_level = self._infer_grade_level(concept)
        difficulty = self._infer_difficulty(concept)
        
        return MathContent(
            concept_name=concept,
            topic=self._extract_topic(concept),
            subtopic=concept,
            grade_level=grade_level,
            difficulty=difficulty,
            content_type='concept',
            content=content_text,
            metadata={'source': 'textbook'},
            learning_objectives=self._extract_learning_objectives(content_lines)
        )
    
    def _format_lesson_content(self, lesson: Dict) -> str:
        """Format lesson content from Khan Academy structure."""
        content_parts = []
        
        if lesson.get('description'):
            content_parts.append(f"## Description\n{lesson['description']}\n")
        
        if lesson.get('key_points'):
            content_parts.append("## Key Points")
            for point in lesson['key_points']:
                content_parts.append(f"- {point}")
        
        if lesson.get('examples'):
            content_parts.append("\n## Examples")
            for example in lesson['examples']:
                content_parts.append(f"### {example.get('title', 'Example')}")
                content_parts.append(example.get('content', ''))
        
        if lesson.get('practice_problems'):
            content_parts.append("\n## Practice Problems")
            for problem in lesson['practice_problems']:
                content_parts.append(f"**Problem:** {problem.get('question')}")
                content_parts.append(f"**Solution:** {problem.get('solution')}\n")
        
        return '\n'.join(content_parts)
    
    def _infer_grade_level(self, concept: str) -> str:
        """Infer grade level from concept name."""
        grade_mapping = {
            'algebra': '9th-10th',
            'geometry': '10th',
            'trigonometry': '11th',
            'precalculus': '11th-12th',
            'calculus': '12th',
            'statistics': '11th-12th'
        }
        
        concept_lower = concept.lower()
        for subject, grade in grade_mapping.items():
            if subject in concept_lower:
                return grade
        
        return '10th'  # Default
    
    def _infer_difficulty(self, concept: str) -> str:
        """Infer difficulty level from concept name."""
        easy_keywords = ['basic', 'introduction', 'simple', 'fundamental', 'review']
        advanced_keywords = ['advanced', 'complex', 'derivation', 'proof', 'theorem']
        
        concept_lower = concept.lower()
        
        if any(keyword in concept_lower for keyword in easy_keywords):
            return 'beginner'
        elif any(keyword in concept_lower for keyword in advanced_keywords):
            return 'advanced'
        
        return 'intermediate'
    
    def _extract_topic(self, concept: str) -> str:
        """Extract main topic from concept."""
        topics = ['Algebra', 'Geometry', 'Trigonometry', 'Calculus', 'Statistics']
        for topic in topics:
            if topic.lower() in concept.lower():
                return topic
        return 'Mathematics'
    
    def _extract_learning_objectives(self, content_lines: List[str]) -> List[str]:
        """Extract learning objectives from content."""
        objectives = []
        in_objectives = False
        
        for line in content_lines:
            if 'learning objectives' in line.lower():
                in_objectives = True
                continue
            if in_objectives and line.strip() and (line[0].isdigit() or line.strip().startswith('-')):
                objectives.append(line.strip())
            elif in_objectives and not line.strip():
                break
        
        return objectives


class ContentProcessor:
    """Processes and loads content into the system."""
    
    def __init__(self, max_workers: int = 5):
        self.chunker = MathChunker(chunk_size=500, chunk_overlap=50)
        self.embedding_generator = EmbeddingGenerator()
        self.vector_store = VectorStore()
        self.supabase = get_supabase_client()
        self.max_workers = max_workers
    
    def process_and_load_batch(self, math_contents: List[MathContent]):
        """Process a batch of math content synchronously."""
        logger.info(f"Processing batch of {len(math_contents)} contents")
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Process in parallel
            futures = []
            for content in math_contents:
                future = executor.submit(self._process_single_content, content)
                futures.append(future)
            
            # Wait for completion
            results = []
            for future in futures:
                try:
                    result = future.result()
                    results.append(result)
                    logger.info(f"Processed: {result}")
                except Exception as e:
                    logger.error(f"Error processing content: {e}")
        
        return results
    
    def _process_single_content(self, math_content: MathContent) -> str:
        """Process single math content item."""
        try:
            # Ensure concept exists in database
            concept_id = self._get_or_create_concept(math_content)
            
            # Create content chunks
            chunks = self.chunker.chunk_by_difficulty(
                text=math_content.content,
                difficulty=math_content.difficulty,
                concept_name=math_content.concept_name
            )
            
            # Add metadata to chunks
            for chunk in chunks:
                chunk['metadata'].update({
                    'topic': math_content.topic,
                    'subtopic': math_content.subtopic,
                    'grade_level': math_content.grade_level,
                    'content_type': math_content.content_type,
                    'concept_name': math_content.concept_name
                })
            
            # Generate embeddings
            embedded_chunks = self.embedding_generator.embed_chunks(chunks)
            
            # Store in vector database
            chunk_ids = self.vector_store.store_chunks(embedded_chunks, concept_id)
            
            # Store practice problems separately if content_type is 'practice'
            if math_content.content_type == 'practice':
                self._store_practice_problems(math_content, concept_id)
            
            logger.info(f"Created {len(chunk_ids)} chunks for {math_content.concept_name}")
            return f"Successfully loaded: {math_content.concept_name}"
            
        except Exception as e:
            logger.error(f"Failed to process {math_content.concept_name}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return f"Failed: {math_content.concept_name}"
    
    def _get_or_create_concept(self, math_content: MathContent) -> str:
        """Get existing concept ID or create new concept."""
        # Check if concept exists
        result = self.supabase.table('math_concepts') \
            .select('concept_id') \
            .eq('name', math_content.concept_name) \
            .execute()
        
        if result.data:
            return result.data[0]['concept_id']
        
        # Create new concept (match database schema)
        concept_data = {
            'name': math_content.concept_name,
            'description': math_content.content[:500] + '...' if len(math_content.content) > 500 else math_content.content,
            'prerequisites': math_content.prerequisites or [],
            'difficulty': math_content.difficulty,
            'topic_category': math_content.topic.lower()
        }
        
        result = self.supabase.table('math_concepts') \
            .insert(concept_data) \
            .execute()
        
        if result.data:
            return result.data[0]['concept_id']
        else:
            raise Exception(f"Failed to create concept: {math_content.concept_name}")
    
    def _store_practice_problems(self, math_content: MathContent, concept_id: str):
        """Store practice problems in database."""
        problems = []
        
        # Split by problem markers
        problem_sections = math_content.content.split('**Problem:**')
        for section in problem_sections[1:]:  # Skip first empty
            if '**Solution:**' in section:
                question, solution = section.split('**Solution:**', 1)
                problems.append({
                    'concept_id': concept_id,
                    'problem_text': question.strip(),
                    'solution': solution.strip(),
                    'difficulty': math_content.difficulty,
                    'hints': []  # Can be populated later
                })
        
        if problems:
            self.supabase.table('practice_problems') \
                .insert(problems) \
                .execute()
            logger.info(f"Stored {len(problems)} practice problems")


def generate_practice_problems() -> List[MathContent]:
    """Generate comprehensive practice problems for all topics."""
    practice_contents = []
    
    # Define topics and subtopics
    topics = {
        'Algebra': [
            'Linear Equations', 'Quadratic Equations', 'Polynomials',
            'Rational Expressions', 'Exponents and Logarithms',
            'Systems of Equations', 'Inequalities', 'Functions'
        ],
        'Geometry': [
            'Lines and Angles', 'Triangles', 'Circles', 'Quadrilaterals',
            'Polygons', 'Coordinate Geometry', 'Transformations', 'Solid Geometry'
        ],
        'Trigonometry': [
            'Right Triangle Trig', 'Unit Circle', 'Trig Identities',
            'Graphing Trig Functions', 'Trig Equations',
            'Law of Sines and Cosines', 'Polar Coordinates'
        ],
        'Pre-Calculus': [
            'Complex Numbers', 'Matrices', 'Conic Sections',
            'Sequences and Series', 'Limits', 'Vectors'
        ],
        'Calculus': [
            'Derivatives', 'Integrals', 'Applications of Derivatives',
            'Applications of Integrals', 'Differential Equations'
        ],
        'Statistics': [
            'Data Analysis', 'Probability', 'Distributions',
            'Hypothesis Testing', 'Regression'
        ]
    }
    
    problem_templates = {
        'beginner': [
            "Find the value of x in the equation: 2x + 5 = 15",
            "Calculate the area of a rectangle with length 8 and width 5",
            "Simplify the expression: 3(x + 2) - 2x",
            "What is the slope of the line passing through points (1,2) and (3,6)?",
            "Solve for y: y/3 = 9"
        ],
        'intermediate': [
            "Solve the quadratic equation: x² - 5x + 6 = 0",
            "Find the derivative of f(x) = 3x² + 2x - 5",
            "Calculate the probability of getting at least 3 heads in 5 coin tosses",
            "Find the equation of the line tangent to y = x² at x = 2",
            "Solve the system: 2x + y = 7, x - y = 3"
        ],
        'advanced': [
            "Prove that the sum of angles in a triangle is 180 degrees",
            "Find the limit as x approaches infinity of (3x² + 2x)/(2x² - x)",
            "Solve the differential equation: dy/dx = 2xy, with y(0) = 1",
            "Calculate the volume of revolution formed by rotating y = x² around x-axis from x=0 to x=2",
            "Find the eigenvalues of the matrix [[2, 1], [1, 2]]"
        ]
    }
    
    # Generate practice problems for each subtopic
    for topic, subtopics in topics.items():
        for subtopic in subtopics:
            for difficulty in ['beginner', 'intermediate', 'advanced']:
                content = f"## Practice Problems: {subtopic} ({difficulty.title()} Level)\n\n"
                for i, template in enumerate(problem_templates.get(difficulty, []), 1):
                    content += f"**Problem {i}:** {template}\n"
                    content += f"**Solution:** [Solution will be generated when requested]\n\n"
                
                practice_contents.append(MathContent(
                    concept_name=f"{subtopic} - {difficulty.title()} Practice",
                    topic=topic,
                    subtopic=subtopic,
                    grade_level='9th-12th',
                    difficulty=difficulty,
                    content_type='practice',
                    content=content,
                    metadata={'problem_count': 5, 'source': 'generated'}
                ))
    
    return practice_contents


def load_comprehensive_content(source: str = 'all', batch_size: int = 20, max_workers: int = 5):
    """Main function to load comprehensive math content."""
    loader = BulkContentLoader(batch_size=batch_size, max_workers=max_workers)
    processor = ContentProcessor(max_workers=max_workers)
    
    logger.info("Starting comprehensive content loading...")
    
    all_contents = []
    
    if source in ['all', 'textbooks']:
        logger.info("Loading from textbooks...")
        textbook_contents = loader.load_from_textbooks("data/textbooks")
        all_contents.extend(textbook_contents)
        logger.info(f"Loaded {len(textbook_contents)} textbook contents")
    
    if source in ['all', 'khan']:
        logger.info("Loading from Khan Academy format...")
        khan_contents = loader.load_from_khan_academy_format("data/khan_academy/math.json")
        all_contents.extend(khan_contents)
        logger.info(f"Loaded {len(khan_contents)} Khan Academy contents")
    
    if source in ['all', 'openstax']:
        logger.info("Loading from OpenStax format...")
        openstax_contents = loader.load_from_openstax("data/openstax/math_content.csv")
        all_contents.extend(openstax_contents)
        logger.info(f"Loaded {len(openstax_contents)} OpenStax contents")
    
    if source in ['all', 'practice']:
        logger.info("Generating practice problems...")
        practice_contents = generate_practice_problems()
        all_contents.extend(practice_contents)
        logger.info(f"Generated {len(practice_contents)} practice problems")
    
    # Process all content in batches
    logger.info(f"Total content to process: {len(all_contents)}")
    
    for i in range(0, len(all_contents), batch_size):
        batch = all_contents[i:i+batch_size]
        processor.process_and_load_batch(batch)
        logger.info(f"Processed batch {i//batch_size + 1}/{(len(all_contents)+batch_size-1)//batch_size}")
    
    logger.info("✅ Content loading completed!")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Load math content into MathMentor")
    parser.add_argument("--source", choices=['all', 'textbooks', 'khan', 'openstax', 'practice'], 
                       default='practice', help="Source to load content from")
    parser.add_argument("--batch-size", type=int, default=20, help="Batch size for processing")
    parser.add_argument("--max-workers", type=int, default=5, help="Maximum workers for parallel processing")
    
    args = parser.parse_args()
    
    load_comprehensive_content(
        source=args.source,
        batch_size=args.batch_size,
        max_workers=args.max_workers
    )










