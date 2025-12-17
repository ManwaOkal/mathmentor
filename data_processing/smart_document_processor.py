"""
Smart document processor that uses LLMs to extract educational content.
"""
import os
import json
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class ContentType(Enum):
    CONCEPT_EXPLANATION = "concept_explanation"
    WORKED_EXAMPLE = "worked_example"
    PROBLEM_SET = "problem_set"
    DEFINITION = "definition"
    THEOREM = "theorem"
    EXERCISE = "exercise"
    APPLICATION = "application"


@dataclass
class EducationalSegment:
    content: str
    content_type: ContentType
    topic: str
    difficulty: str
    learning_objectives: List[str]
    prerequisites: List[str]
    metadata: Dict[str, Any]
    page_number: Optional[int] = None


class SmartDocumentProcessor:
    """Uses LLMs to intelligently extract educational content from documents"""
    
    def __init__(self, model: str = "gpt-4o-mini"):
        if not OPENAI_AVAILABLE:
            raise ImportError("openai package is required for smart document processing")
        self.model = model
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
    async def process_teacher_document(self, document_text: str, document_metadata: Dict) -> Dict[str, Any]:
        """
        Process teacher document with educational focus
        """
        # First, analyze the document structure
        structure = await self._analyze_document_structure(document_text)
        
        # Extract educational segments
        segments = await self._extract_educational_segments(document_text, structure)
        
        # Organize by topic and difficulty
        organized_content = await self._organize_educational_content(segments, document_metadata)
        
        # Generate learning path
        learning_path = await self._generate_learning_path(organized_content)
        
        return {
            "structure_analysis": structure,
            "educational_segments": [
                {
                    "content": s.content,
                    "content_type": s.content_type.value,
                    "topic": s.topic,
                    "difficulty": s.difficulty,
                    "learning_objectives": s.learning_objectives,
                    "prerequisites": s.prerequisites,
                    "metadata": s.metadata
                }
                for s in segments
            ],
            "organized_content": organized_content,
            "learning_path": learning_path,
            "metadata": {
                "total_segments": len(segments),
                "topics_covered": list(organized_content.keys()),
                "processing_method": "llm_educational_extraction"
            }
        }
    
    async def _analyze_document_structure(self, document_text: str) -> Dict[str, Any]:
        """
        Use LLM to analyze the educational structure of the document
        """
        # Limit text for analysis
        analysis_text = document_text[:8000] if len(document_text) > 8000 else document_text
        
        prompt = f"""You are an expert math educator analyzing a teacher's document. Analyze the structure and educational content.

DOCUMENT TEXT:
{analysis_text}

ANALYSIS TASK:
1. Identify the MAIN TOPIC(s) being taught
2. Identify the EDUCATIONAL STRUCTURE (sections, progression)
3. Identify types of content (explanations, examples, problems, etc.)
4. Estimate the TARGET GRADE LEVEL
5. Identify PREREQUISITE KNOWLEDGE needed
6. Identify KEY CONCEPTS that will be assessed

Return JSON with this structure:
{{
  "main_topics": ["topic1", "topic2"],
  "educational_structure": {{
    "sections": [
      {{"title": "section_title", "type": "explanation|example|exercise", "start_line": 0, "end_line": 100}}
    ]
  }},
  "content_types": {{
    "concept_explanations": 5,
    "worked_examples": 8,
    "practice_problems": 12,
    "definitions": 3,
    "theorems": 2
  }},
  "target_grade_level": "9th-10th",
  "prerequisite_knowledge": ["algebra basics", "fractions"],
  "key_assessment_concepts": ["solving equations", "graphing lines"]
}}"""

        client = openai.OpenAI(api_key=self.api_key)
        
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert math curriculum analyst. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Error analyzing document structure: {e}")
            # Return fallback structure
            return {
                "main_topics": ["Mathematics"],
                "educational_structure": {"sections": []},
                "content_types": {},
                "target_grade_level": "Unknown",
                "prerequisite_knowledge": [],
                "key_assessment_concepts": []
            }
    
    async def _extract_educational_segments(self, document_text: str, structure: Dict) -> List[EducationalSegment]:
        """
        Extract meaningful educational segments from the document
        """
        segments = []
        
        # Split document into chunks for processing
        chunks = self._split_by_educational_units(document_text, structure)
        
        # Process each chunk with LLM (limit to avoid too many API calls)
        for i, chunk in enumerate(chunks[:20]):  # Limit to 20 chunks
            segment = await self._analyze_educational_chunk(chunk, i)
            if segment:
                segments.append(segment)
        
        return segments
    
    def _split_by_educational_units(self, text: str, structure: Dict) -> List[str]:
        """
        Split document into meaningful educational units
        """
        lines = text.split('\n')
        chunks = []
        
        # Use structure analysis to guide splitting
        sections = structure.get("educational_structure", {}).get("sections", [])
        
        if sections:
            for section in sections:
                start = section.get("start_line", 0)
                end = section.get("end_line", len(lines))
                section_text = '\n'.join(lines[start:end])
                if section_text.strip():
                    chunks.append(section_text)
        else:
            # Fallback: split by paragraphs and headings
            paragraphs = text.split('\n\n')
            for para in paragraphs:
                if len(para.strip()) > 100:  # Only include substantial paragraphs
                    chunks.append(para)
        
        return chunks[:50]  # Limit to 50 chunks
    
    async def _analyze_educational_chunk(self, chunk_text: str, chunk_index: int) -> Optional[EducationalSegment]:
        """
        Analyze a chunk for educational content
        """
        # Limit chunk size
        analysis_chunk = chunk_text[:2000] if len(chunk_text) > 2000 else chunk_text
        
        prompt = f"""You are a math teacher analyzing a piece of educational material.

MATERIAL CHUNK:
{analysis_chunk}

ANALYSIS TASK:
1. What TYPE of educational content is this?
   Options: concept_explanation, worked_example, problem_set, definition, theorem, exercise, application
   
2. What SPECIFIC TOPIC is being taught/illustrated?
   Be specific: "Solving linear equations with fractions" not just "Algebra"
   
3. What DIFFICULTY level? (beginner/intermediate/advanced)
   
4. What LEARNING OBJECTIVES does this chunk address?
   List 1-3 specific objectives
   
5. What PREREQUISITE knowledge is needed for this chunk?
   
6. Does this contain ASSESSABLE CONTENT? (problems, questions, exercises)

Return JSON:
{{
  "content_type": "concept_explanation",
  "topic": "Specific math topic",
  "difficulty": "beginner|intermediate|advanced",
  "learning_objectives": ["obj1", "obj2"],
  "prerequisites": ["prereq1", "prereq2"],
  "has_assessable_content": true,
  "educational_value_score": 7,
  "key_math_notation": ["$2x + 5 = 15$", "$\\frac{{1}}{{2}}$"]
}}"""

        client = openai.OpenAI(api_key=self.api_key)
        
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert math teacher analyzing educational content. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            analysis = json.loads(response.choices[0].message.content)
            
            return EducationalSegment(
                content=chunk_text,
                content_type=ContentType(analysis.get("content_type", "concept_explanation")),
                topic=analysis.get("topic", "Mathematics"),
                difficulty=analysis.get("difficulty", "intermediate"),
                learning_objectives=analysis.get("learning_objectives", []),
                prerequisites=analysis.get("prerequisites", []),
                metadata={
                    "has_assessable_content": analysis.get("has_assessable_content", False),
                    "educational_value_score": analysis.get("educational_value_score", 5),
                    "key_math_notation": analysis.get("key_math_notation", []),
                    "chunk_index": chunk_index
                }
            )
        except Exception as e:
            print(f"Error analyzing chunk {chunk_index}: {e}")
            return None
    
    async def _organize_educational_content(self, segments: List[EducationalSegment], metadata: Dict) -> Dict[str, Any]:
        """
        Organize content by topic and difficulty
        """
        organized = {}
        
        for segment in segments:
            topic = segment.topic
            if topic not in organized:
                organized[topic] = {
                    "beginner": [],
                    "intermediate": [],
                    "advanced": []
                }
            
            organized[topic][segment.difficulty].append({
                "content": segment.content,
                "content_type": segment.content_type.value,
                "learning_objectives": segment.learning_objectives,
                "metadata": segment.metadata
            })
        
        return organized
    
    async def _generate_learning_path(self, organized_content: Dict) -> List[Dict]:
        """
        Generate a logical learning path through the content
        """
        prompt = f"""You are a math curriculum designer creating a learning path from teacher-provided content.

ORGANIZED CONTENT:
{json.dumps(organized_content, indent=2)[:4000]}

TASK: Create a logical learning sequence for students.
Consider:
1. Prerequisite dependencies
2. Difficulty progression
3. Topic coherence
4. Natural learning flow

Return JSON object with learning_path array:
{{
  "learning_path": [
    {{
      "step": 1,
      "topic": "Topic name",
      "difficulty": "beginner",
      "content_type": "concept_explanation",
      "learning_objectives": ["obj1", "obj2"],
      "estimated_time_minutes": 15
    }}
  ]
}}"""

        client = openai.OpenAI(api_key=self.api_key)
        
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert math curriculum designer. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get("learning_path", [])
        except Exception as e:
            print(f"Error generating learning path: {e}")
            return []


class DocumentBasedActivityGenerator:
    """Generates activities specifically from teacher's document content"""
    
    def __init__(self):
        self.processor = SmartDocumentProcessor()
        
    async def generate_activity_from_document(self, document_content: str, document_metadata: Dict, activity_config: Dict) -> Dict[str, Any]:
        """
        Generate a complete activity based on teacher's document
        """
        # Process document with educational focus
        processed = await self.processor.process_teacher_document(document_content, document_metadata)
        
        # Generate questions SPECIFIC to the document content
        questions = await self._generate_document_specific_questions(
            processed, 
            activity_config
        )
        
        # Create activity structure
        activity = {
            "title": activity_config.get('title', 'Document-Based Activity'),
            "description": activity_config.get('description', f"Generated from: {document_metadata.get('title', 'document')}"),
            "questions": questions,
            "topics": processed['metadata']['topics_covered'],
            "learning_objectives": self._extract_learning_objectives(processed['educational_segments']),
            "metadata": {
                "generation_method": "llm_document_based",
                "document_title": document_metadata.get('title', ''),
                "questions_source": "document_content_only",
                "educational_analysis": processed['metadata']
            }
        }
        
        return activity
    
    def _extract_learning_objectives(self, segments: List[Dict]) -> List[str]:
        """Extract unique learning objectives from segments"""
        objectives = set()
        for segment in segments:
            for obj in segment.get('learning_objectives', []):
                objectives.add(obj)
        return list(objectives)
    
    async def _generate_document_specific_questions(self, processed_doc: Dict, config: Dict) -> List[Dict]:
        """
        Generate questions that ONLY use content from the teacher's document
        """
        num_questions = config.get('num_questions', 10)
        difficulty = config.get('difficulty', 'intermediate')
        
        # Select relevant segments for question generation
        segments = self._select_segments_for_questions(processed_doc, difficulty, num_questions)
        
        questions = []
        questions_per_segment = max(1, num_questions // len(segments)) if segments else 0
        
        for segment in segments:
            segment_questions = await self._generate_questions_from_segment(segment, config, questions_per_segment)
            questions.extend(segment_questions)
            if len(questions) >= num_questions:
                break
        
        return questions[:num_questions]
    
    def _select_segments_for_questions(self, processed_doc: Dict, difficulty: str, num_needed: int) -> List[Dict]:
        """Select the most relevant segments for question generation"""
        segments = processed_doc.get('educational_segments', [])
        
        # Filter by difficulty
        filtered = [s for s in segments if s.get('difficulty') == difficulty]
        
        # Prioritize segments with assessable content
        assessable = [s for s in filtered if s.get('metadata', {}).get('has_assessable_content', False)]
        
        # If not enough assessable segments, include others
        if len(assessable) < num_needed:
            additional = [s for s in filtered if s not in assessable]
            assessable.extend(additional)
        
        return assessable[:num_needed]
    
    async def _generate_questions_from_segment(self, segment: Dict, config: Dict, num_questions: int = 2) -> List[Dict]:
        """
        Generate questions from a specific educational segment
        """
        segment_content = segment.get('content', '')[:1500]  # Limit content size
        
        prompt = f"""You are a math teacher creating assessment questions based EXACTLY on this teaching material.

TEACHING MATERIAL (from teacher's document):
{segment_content}

CONTEXT:
- Topic: {segment.get('topic', 'Mathematics')}
- Difficulty: {segment.get('difficulty', 'intermediate')}
- Learning Objectives: {segment.get('learning_objectives', [])}

CRITICAL INSTRUCTION: Create questions that DIRECTLY use, reference, or build upon the SPECIFIC content in the teaching material above.

**DO NOT** create generic math questions.
**DO** use the exact examples, numbers, and approaches from the material.
**DO** reference specific parts of the material if appropriate.

Generate {num_questions} questions with these requirements:
1. Questions must be ANSWERABLE using ONLY the information in the material above
2. Use the SAME mathematical notation and style as the material
3. Test understanding of the SPECIFIC concepts taught in this segment
4. Include the correct answer and explanation

Return JSON object with questions array:
{{
  "questions": [
    {{
      "question_text": "Question here",
      "question_type": "multiple_choice|short_answer",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A or text answer",
      "explanation": "Explanation here",
      "difficulty": "beginner|intermediate|advanced"
    }}
  ]
}}"""

        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You create math questions that directly test understanding of specific teaching material. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            questions = result.get('questions', [])
            
            # Add segment metadata to each question
            for q in questions:
                q['metadata'] = {
                    'source_segment_topic': segment.get('topic', ''),
                    'source_segment_type': segment.get('content_type', ''),
                    'based_on_teacher_material': True,
                    'original_learning_objectives': segment.get('learning_objectives', [])
                }
            
            return questions
        except Exception as e:
            print(f"Error generating questions from segment: {e}")
            return []










