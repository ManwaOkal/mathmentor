"""
Generates responses using OpenAI LLM with RAG context.
"""
import os
from typing import Optional, Dict, Any, List
from openai import OpenAI
from rag_engine.prompts import (
    format_tutor_prompt,
    format_concept_explanation,
    format_problem_solving,
    format_hint,
    format_practice_generator,
    format_test_question_generator
)


class ResponseGenerator:
    """
    Generates math tutoring responses using OpenAI LLM.
    """
    
    def __init__(self, model: Optional[str] = None):
        """
        Initialize response generator.
        
        Args:
            model: OpenAI model to use. Defaults to OPENAI_MODEL env var or gpt-3.5-turbo
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.client = OpenAI(api_key=api_key)
        # Use model from parameter, env var, or default to gpt-3.5-turbo
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    
    def generate_response(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        timeout: int = 30
    ) -> str:
        """
        Generate response from LLM.
        
        Args:
            prompt: Complete prompt string
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response
            timeout: Request timeout in seconds
            
        Returns:
            Generated response text
        """
        try:
            import time
            start_time = time.time()
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are MathMentor, an expert high school math tutor. Always use LaTeX notation for mathematical expressions (wrap in $ for inline, $$ for block equations). Be brief and concise - aim for 2-4 sentences maximum. Get straight to the point."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout
            )
            
            elapsed = time.time() - start_time
            if elapsed > 10:
                print(f"⚠️ Slow API response: {elapsed:.2f}s")
            
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Failed to generate response: {str(e)}")
    
    def answer_question(
        self,
        question: str,
        context: str,
        topic: Optional[str] = None,
        skill_level: str = "intermediate",
        previous_mistakes: Optional[str] = None
    ) -> str:
        """
        Answer a student's question using RAG context.
        
        Args:
            question: Student's question
            context: Retrieved context from vector search
            topic: Current math topic
            skill_level: Student's skill level
            previous_mistakes: Previous mistakes (optional)
            
        Returns:
            Generated answer
        """
        prompt = format_tutor_prompt(
            question=question,
            context=context,
            topic=topic,
            level=skill_level,
            mistakes=previous_mistakes
        )
        
        return self.generate_response(prompt, max_tokens=800)  # Reduced for faster responses
    
    def explain_concept(
        self,
        concept_name: str,
        context: str,
        skill_level: str = "intermediate"
    ) -> str:
        """
        Explain a math concept.
        
        Args:
            concept_name: Name of the concept
            context: Retrieved context
            skill_level: Student's skill level
            
        Returns:
            Concept explanation
        """
        prompt = format_concept_explanation(
            concept_name=concept_name,
            context=context,
            skill_level=skill_level
        )
        
        return self.generate_response(prompt, max_tokens=800)  # Reduced for faster responses
    
    def solve_problem(
        self,
        problem: str,
        context: str,
        skill_level: str = "intermediate"
    ) -> str:
        """
        Solve a math problem step-by-step.
        
        Args:
            problem: Problem statement
            context: Retrieved context
            skill_level: Student's skill level
            
        Returns:
            Step-by-step solution
        """
        prompt = format_problem_solving(
            problem=problem,
            context=context,
            skill_level=skill_level
        )
        
        return self.generate_response(prompt, max_tokens=1500)
    
    def provide_hint(
        self,
        problem: str,
        attempt: str,
        hint_level: int,
        context: str
    ) -> str:
        """
        Provide a hint for a problem.
        
        Args:
            problem: Problem statement
            attempt: Student's attempt so far
            hint_level: Level of hint (1-3)
            context: Retrieved context
            
        Returns:
            Hint text
        """
        prompt = format_hint(
            problem=problem,
            attempt=attempt,
            hint_level=hint_level,
            context=context
        )
        
        return self.generate_response(prompt, max_tokens=500)
    
    def generate_practice_problems(
        self,
        concept_name: str,
        difficulty: str,
        skill_level: str,
        context: str,
        num_problems: int = 1
    ) -> str:
        """
        Generate practice problems.
        
        Args:
            concept_name: Math concept
            difficulty: Problem difficulty
            skill_level: Student's skill level
            context: Retrieved context
            num_problems: Number of problems to generate
            
        Returns:
            Generated problems with solutions
        """
        prompt = format_practice_generator(
            concept_name=concept_name,
            difficulty=difficulty,
            skill_level=skill_level,
            context=context,
            num_problems=num_problems
        )
        
        return self.generate_response(prompt, max_tokens=1500)  # Reduced for faster responses
    
    def generate_test_questions(
        self,
        concept_name: str,
        difficulty: str,
        context: str,
        num_questions: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate multiple choice test questions.
        
        Args:
            concept_name: Math concept
            difficulty: Question difficulty
            context: Retrieved context
            num_questions: Number of questions to generate
            
        Returns:
            List of test questions with options and correct answers
        """
        import json
        import re
        
        prompt = format_test_question_generator(
            concept_name=concept_name,
            difficulty=difficulty,
            context=context,
            num_questions=num_questions
        )
        
        response = self.generate_response(prompt, max_tokens=2000, temperature=0.7)  # Reduced for faster responses
        
        # Try to extract JSON from response
        try:
            # Look for JSON in the response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                data = json.loads(json_str)
                if 'questions' in data and isinstance(data['questions'], list):
                    return data['questions']
        except json.JSONDecodeError:
            pass
        
        # Fallback: return empty list if parsing fails
        return []


