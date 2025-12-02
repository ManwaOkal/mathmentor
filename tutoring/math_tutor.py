"""
Main MathTutor class that combines RAG retrieval and response generation.
"""
from typing import Optional, Dict, Any, List
from rag_engine.retriever import ContentRetriever
from rag_engine.generator import ResponseGenerator
from lib.supabase_client import get_supabase_client


class MathTutor:
    """
    Main tutoring interface combining:
    1. Concept explanation generator
    2. Step-by-step problem solver
    3. Adaptive difficulty adjustment
    4. Student progress tracking
    """
    
    def __init__(self, model: Optional[str] = None):
        """
        Initialize MathTutor.
        
        Args:
            model: OpenAI model to use. Defaults to OPENAI_MODEL env var or gpt-3.5-turbo
        """
        self.retriever = ContentRetriever()
        self.generator = ResponseGenerator(model=model)
        self.supabase = get_supabase_client()
    
    def ask_question(
        self,
        question: str,
        user_id: Optional[str] = None,
        concept_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Answer a student's question using RAG.
        
        Args:
            question: Student's question
            user_id: Optional user ID for personalization
            concept_id: Optional concept ID to filter context
            
        Returns:
            Dict with answer and metadata
        """
        # Get user context if available
        user_context = self._get_user_context(user_id) if user_id else {}
        skill_level = user_context.get('skill_level', 'intermediate')
        topic = user_context.get('current_topic')
        
        # Retrieve relevant context
        context = self.retriever.retrieve_and_format(
            query=question,
            limit=5,
            concept_id=concept_id
        )
        
        # Generate answer
        answer = self.generator.answer_question(
            question=question,
            context=context,
            topic=topic,
            skill_level=skill_level,
            previous_mistakes=user_context.get('recent_mistakes')
        )
        
        return {
            'answer': answer,
            'context_used': len(context) > 0,
            'skill_level': skill_level,
            'concept_id': concept_id
        }
    
    def explain_concept(
        self,
        concept_name: str,
        user_id: Optional[str] = None,
        concept_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Explain a math concept.
        
        Args:
            concept_name: Name of the concept
            user_id: Optional user ID
            concept_id: Optional concept ID
            
        Returns:
            Dict with explanation
        """
        # Get user context
        user_context = self._get_user_context(user_id) if user_id else {}
        skill_level = user_context.get('skill_level', 'intermediate')
        
        # Retrieve context
        context = self.retriever.retrieve_and_format(
            query=f"explain {concept_name}",
            limit=5,
            concept_id=concept_id
        )
        
        # Generate explanation
        explanation = self.generator.explain_concept(
            concept_name=concept_name,
            context=context,
            skill_level=skill_level
        )
        
        return {
            'explanation': explanation,
            'concept_name': concept_name,
            'skill_level': skill_level
        }
    
    def solve_problem(
        self,
        problem: str,
        user_id: Optional[str] = None,
        concept_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Solve a math problem step-by-step.
        
        Args:
            problem: Problem statement
            user_id: Optional user ID
            concept_id: Optional concept ID
            
        Returns:
            Dict with solution
        """
        # Get user context
        user_context = self._get_user_context(user_id) if user_id else {}
        skill_level = user_context.get('skill_level', 'intermediate')
        
        # Retrieve context
        context = self.retriever.retrieve_and_format(
            query=problem,
            limit=5,
            concept_id=concept_id
        )
        
        # Generate solution
        solution = self.generator.solve_problem(
            problem=problem,
            context=context,
            skill_level=skill_level
        )
        
        return {
            'solution': solution,
            'problem': problem,
            'skill_level': skill_level
        }
    
    def provide_hint(
        self,
        problem: str,
        attempt: str,
        hint_level: int = 1,
        user_id: Optional[str] = None,
        concept_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Provide a hint for a problem.
        
        Args:
            problem: Problem statement
            attempt: Student's attempt
            hint_level: Level of hint (1-3)
            user_id: Optional user ID
            concept_id: Optional concept ID
            
        Returns:
            Dict with hint
        """
        # Retrieve context
        context = self.retriever.retrieve_and_format(
            query=problem,
            limit=3,
            concept_id=concept_id
        )
        
        # Generate hint
        hint = self.generator.provide_hint(
            problem=problem,
            attempt=attempt,
            hint_level=hint_level,
            context=context
        )
        
        return {
            'hint': hint,
            'hint_level': hint_level,
            'problem': problem
        }
    
    def generate_practice(
        self,
        concept_name: str,
        difficulty: str = "intermediate",
        num_problems: int = 1,
        user_id: Optional[str] = None,
        concept_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate practice problems.
        
        Args:
            concept_name: Math concept
            difficulty: Problem difficulty
            num_problems: Number of problems
            user_id: Optional user ID
            concept_id: Optional concept ID
            
        Returns:
            Dict with generated problems
        """
        # Get user context
        user_context = self._get_user_context(user_id) if user_id else {}
        skill_level = user_context.get('skill_level', 'intermediate')
        
        # Retrieve context
        context = self.retriever.retrieve_and_format(
            query=concept_name,
            limit=5,
            concept_id=concept_id
        )
        
        # Generate problems
        problems = self.generator.generate_practice_problems(
            concept_name=concept_name,
            difficulty=difficulty,
            skill_level=skill_level,
            context=context,
            num_problems=num_problems
        )
        
        return {
            'problems': problems,
            'concept_name': concept_name,
            'difficulty': difficulty,
            'num_problems': num_problems
        }
    
    def generate_test_questions(
        self,
        concept_name: str,
        difficulty: str = "intermediate",
        num_questions: int = 5,
        user_id: Optional[str] = None,
        concept_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate multiple choice test questions.
        
        Args:
            concept_name: Math concept
            difficulty: Question difficulty
            num_questions: Number of questions
            user_id: Optional user ID
            concept_id: Optional concept ID
            
        Returns:
            Dict with generated test questions
        """
        # Retrieve context
        context = self.retriever.retrieve_and_format(
            query=concept_name,
            limit=5,
            concept_id=concept_id
        )
        
        # Generate test questions
        questions = self.generator.generate_test_questions(
            concept_name=concept_name,
            difficulty=difficulty,
            context=context,
            num_questions=num_questions
        )
        
        return {
            'questions': questions,
            'concept_name': concept_name,
            'difficulty': difficulty,
            'num_questions': len(questions)
        }
    
    def _get_user_context(self, user_id: str) -> Dict[str, Any]:
        """
        Get user context for personalization.
        
        Args:
            user_id: User ID
            
        Returns:
            User context dict
        """
        try:
            # Get user profile
            user_result = self.supabase.table('users').select('*').eq('id', user_id).execute()
            if user_result.data:
                user = user_result.data[0]
                
                # Get recent mistakes (simplified - in production, query practice_sessions)
                return {
                    'skill_level': user.get('skill_level', 'intermediate'),
                    'current_topic': None,  # Could be tracked in sessions
                    'recent_mistakes': None  # Could query from practice_sessions
                }
        except Exception as e:
            print(f"Error getting user context: {e}")
        
        return {
            'skill_level': 'intermediate',
            'current_topic': None,
            'recent_mistakes': None
        }


