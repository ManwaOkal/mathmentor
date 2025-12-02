"""
AI-powered assessment and feedback generation for student activities.
"""
import os
from typing import Dict, Any, List
from openai import OpenAI
from lib.supabase_client import get_supabase_client


class AssessmentEngine:
    """AI-powered assessment and feedback generation."""
    
    def __init__(self, model: str = "gpt-3.5-turbo"):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.supabase = get_supabase_client()
    
    async def assess_understanding(
        self,
        student_activity_id: str,
        responses: Dict[str, Any],
        document_id: str
    ) -> Dict[str, Any]:
        """
        Comprehensive understanding assessment.
        
        Args:
            student_activity_id: Student activity ID
            responses: Student responses {question_id: answer}
            document_id: Document ID for context
            
        Returns:
            Assessment dict with scores, feedback, recommendations
        """
        try:
            # Get document context
            doc_result = self.supabase.table('teacher_documents').select('*').eq('document_id', document_id).single().execute()
            document = doc_result.data if doc_result.data else {}
            
            # Get document chunks for context
            chunks_result = self.supabase.table('document_chunks').select('content').eq('document_id', document_id).limit(5).execute()
            chunks = [c['content'] for c in (chunks_result.data or [])]
            
            # Get questions for context
            activity_result = self.supabase.table('student_activities').select('activity_id').eq('student_activity_id', student_activity_id).single().execute()
            activity_id = activity_result.data['activity_id'] if activity_result.data else None
            
            questions = []
            if activity_id:
                questions_result = self.supabase.table('activity_questions').select('*').eq('activity_id', activity_id).execute()
                questions = questions_result.data if questions_result.data else []
            
            # Prepare assessment prompt
            assessment_prompt = self._format_assessment_prompt(
                document=document,
                chunks=chunks,
                questions=questions,
                responses=responses
            )
            
            # Generate assessment
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert math teacher assessing a student's understanding. Provide detailed, constructive feedback."
                    },
                    {
                        "role": "user",
                        "content": assessment_prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            assessment_text = response.choices[0].message.content
            
            # Parse assessment (simplified - in production, use structured output)
            assessment = self._parse_assessment(assessment_text, responses, questions)
            
            return assessment
            
        except Exception as e:
            # Fallback assessment
            return {
                "overall_assessment": "needs_review",
                "summary": f"Assessment completed with basic scoring. Error: {str(e)}",
                "concept_breakdown": {},
                "recommendations": [
                    "Review the material",
                    "Practice similar problems",
                    "Ask your teacher for help"
                ],
                "overall_score": 0.5
            }
    
    def _format_assessment_prompt(
        self,
        document: Dict[str, Any],
        chunks: List[str],
        questions: List[Dict[str, Any]],
        responses: Dict[str, Any]
    ) -> str:
        """Format prompt for AI assessment."""
        return f"""You are an expert math teacher assessing a student's understanding based on their activity responses.

Document: {document.get('title', 'Math Content')}
Document excerpts: {chunks[:3]}

Questions and Student Responses:
{self._format_questions_responses(questions, responses)}

Please provide:
1. Overall assessment (pass/fail with threshold 70%)
2. Summary of understanding (2-3 sentences)
3. Concept-by-concept breakdown (score 0.0-1.0 for each concept)
4. Specific areas of strength
5. Specific areas needing improvement
6. Personalized recommendations for improvement (3-5 items)
7. Suggestions for next learning steps

Format your response clearly with sections.
"""
    
    def _format_questions_responses(self, questions: List[Dict], responses: Dict) -> str:
        """Format questions and responses for prompt."""
        formatted = []
        for q in questions:
            q_id = q.get('question_id', '')
            q_text = q.get('question_text', '')
            student_answer = responses.get(q_id, 'No answer')
            correct_answer = q.get('correct_answer', 'N/A')
            
            formatted.append(f"""
Question: {q_text}
Student Answer: {student_answer}
Correct Answer: {correct_answer}
""")
        
        return "\n".join(formatted)
    
    def _parse_assessment(self, assessment_text: str, responses: Dict, questions: List[Dict]) -> Dict[str, Any]:
        """Parse AI assessment text into structured format."""
        # Simplified parsing - in production, use structured output or better parsing
        import re
        
        # Extract overall assessment
        overall_match = re.search(r'(pass|fail|needs.review)', assessment_text.lower())
        overall_assessment = overall_match.group(1) if overall_match else 'needs_review'
        
        # Extract summary (first paragraph)
        summary_match = re.search(r'Summary[:\s]+(.+?)(?=\n\n|\n[A-Z]|$)', assessment_text, re.DOTALL | re.IGNORECASE)
        summary = summary_match.group(1).strip() if summary_match else assessment_text[:200]
        
        # Extract recommendations (bullet points)
        recommendations_match = re.findall(r'[-•]\s*(.+?)(?=\n|$)', assessment_text)
        recommendations = [r.strip() for r in recommendations_match[:5]] if recommendations_match else [
            "Review the material",
            "Practice similar problems",
            "Ask your teacher for help"
        ]
        
        # Calculate concept breakdown (simplified)
        concept_breakdown = {}
        for q in questions:
            concept = q.get('metadata', {}).get('concept', 'General')
            if concept not in concept_breakdown:
                concept_breakdown[concept] = 0.7  # Default score
        
        # Calculate overall score from responses
        correct_count = sum(1 for q in questions if str(responses.get(q.get('question_id'))) == str(q.get('correct_answer')))
        overall_score = correct_count / len(questions) if questions else 0.5
        
        return {
            "overall_assessment": overall_assessment,
            "summary": summary,
            "concept_breakdown": concept_breakdown,
            "recommendations": recommendations,
            "overall_score": overall_score
        }
    
    async def generate_remediation_activities(
        self,
        student_id: str,
        weak_areas: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Generate targeted practice for weak areas.
        
        Args:
            student_id: Student ID
            weak_areas: List of concepts student struggles with
            
        Returns:
            List of remediation activities
        """
        prompt = f"""Create targeted remediation activities for a student struggling with:
{', '.join(weak_areas)}

For each weak area, provide:
1. A brief review explanation
2. 3 practice problems (easy → medium → hard)
3. Hints for each problem
4. Links to relevant learning resources

Return as structured text.
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert math tutor creating personalized remediation activities."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            # Parse response (simplified)
            remediation_text = response.choices[0].message.content
            
            return [
                {
                    "concept": area,
                    "review": f"Review material for {area}",
                    "problems": [],
                    "hints": []
                }
                for area in weak_areas
            ]
        except Exception as e:
            print(f"Error generating remediation: {e}")
            return []






