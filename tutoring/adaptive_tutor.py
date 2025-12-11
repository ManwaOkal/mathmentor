"""
Adaptive AI Tutor System with Memory, Teacher Adherence, and Progress Tracking
"""
from typing import List, Dict, Optional, Any, Tuple
import json
from datetime import datetime


class AdaptiveTutorSystem:
    """
    Comprehensive adaptive tutoring system that:
    1. Starts with clear introduction based on teacher's instructions
    2. Maintains memory of student progress
    3. Adapts to student needs while strictly following teacher guidance
    4. Progresses appropriately when student gets answers right
    5. Uses teacher's activity description as the foundation
    6. Tracks completion based on teacher's criteria
    """
    
    def __init__(self, teaching_examples: List[Dict], teacher_instructions: Dict):
        """
        Initialize tutor with teacher's examples and instructions.
        
        Args:
            teaching_examples: Teacher-curated examples for fine-tuning
            teacher_instructions: Teacher's instructions including activity details
        """
        self.teaching_examples = teaching_examples or []
        self.teacher_instructions = teacher_instructions or {}
        
        # Initialize student memory
        self.student_memory = {
            "session_start": datetime.now().isoformat(),
            "progress_level": 1,
            "correct_answers": [],
            "incorrect_answers": [],
            "current_question_index": 0,
            "concept_mastery": {},
            "learning_pace": "normal",
            "engagement_level": "active",
            "conversation_history": []
        }
        
        # Extract activity details from teacher instructions
        self.activity = {
            "title": teacher_instructions.get("activity_title", teacher_instructions.get("title", "Math Learning Activity")),
            "description": teacher_instructions.get("activity_description", teacher_instructions.get("description", "")),
            "learning_objectives": teacher_instructions.get("learning_objectives", []),
            "success_criteria": teacher_instructions.get("success_criteria", []),
            "duration_minutes": teacher_instructions.get("duration_minutes", teacher_instructions.get("estimated_time_minutes", 30)),
            "questions": teacher_instructions.get("questions", []),
            "teaching_approach": teacher_instructions.get("teaching_approach", teacher_instructions.get("teaching_style", "guided"))
        }
    
    def create_introduction(self) -> str:
        """
        Create clear introduction explaining what the tutor will do as instructed by teacher.
        """
        teaching_style = self._extract_teaching_style()
        success_criteria = self.activity["success_criteria"]
        
        return f"""🎯 **MathMentor AI Tutor - Learning Session**

Hello! I'm your AI math tutor, MathMentor. I've been specially configured by your teacher for this session.

📋 **Session Overview:**
**Activity:** {self.activity['title']}
**Description:** {self.activity['description']}

🎓 **Teacher's Instructions for This Session:**
I'll be following these specific guidelines:
• {teaching_style}
• Focusing on: {', '.join(self.activity['learning_objectives']) if self.activity['learning_objectives'] else 'key mathematical concepts'}
• Success is measured by: {', '.join(success_criteria) if success_criteria else 'demonstrating understanding of key concepts'}

🧠 **What We'll Do Today:**
1. I'll start by explaining the key concepts
2. We'll work through examples together
3. You'll practice with questions
4. I'll adapt based on how you're doing
5. We'll track your progress together

💡 **How I Work:**
- I maintain a memory of what you've learned
- I adapt difficulty based on your responses
- I celebrate your successes and help with challenges
- I strictly follow the teacher's teaching methods

Ready to begin? Let's start with understanding the main concepts!"""
    
    def generate_response(
        self,
        student_input: str,
        current_question: Optional[Dict] = None,
        student_answer: Optional[str] = None
    ) -> Tuple[str, Dict]:
        """
        Generate adaptive response based on student input, memory, and teacher instructions.
        
        Returns:
            Tuple of (response_text, updated_memory)
        """
        # Update memory with current interaction
        self._update_memory(student_input, student_answer, current_question)
        
        # Determine the type of interaction
        if student_answer and current_question:
            response = self._handle_answer(student_answer, current_question)
        elif "?" in student_input:
            response = self._answer_question(student_input)
        elif any(word in student_input.lower() for word in ["help", "confused", "don't understand", "explain"]):
            response = self._provide_help(student_input)
        elif any(word in student_input.lower() for word in ["yes", "ready", "continue"]):
            response = self._continue_to_next()
        elif any(word in student_input.lower() for word in ["no", "not yet", "need more"]):
            response = self._provide_more_explanation()
        else:
            response = self._general_response(student_input)
        
        # Update conversation history
        self.student_memory["conversation_history"].append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now().isoformat()
        })
        
        return response, self.student_memory
    
    def _handle_answer(self, student_answer: str, current_question: Dict) -> str:
        """Handle student's answer to a question with adaptive feedback."""
        is_correct = self._evaluate_answer(student_answer, current_question)
        
        if is_correct:
            # Update memory with correct answer
            self.student_memory["correct_answers"].append({
                "question_id": current_question.get("id", current_question.get("question_id", f"q_{self.student_memory['current_question_index']}")),
                "concept": current_question.get("concept", ""),
                "student_answer": student_answer,
                "timestamp": datetime.now().isoformat()
            })
            
            # Progress to next question
            self.student_memory["current_question_index"] += 1
            
            # Check if activity is complete
            if self._is_activity_complete():
                return self._create_completion_message()
            
            # Get next question
            next_question = self._get_next_question()
            
            # Create affirmation and progression response
            affirmation = self._generate_affirmation()
            
            return f"""✅ **Excellent! {affirmation}**

You correctly answered: "{student_answer}"

📊 **Progress Update:**
• Correct answers so far: {len(self.student_memory['correct_answers'])}
• You're mastering: {current_question.get('concept', 'this concept')}

➡️ **Next Question:**
{next_question.get('question_text', 'Next question')}

Take your time and show your work!"""
        
        else:
            # Update memory with incorrect answer
            self.student_memory["incorrect_answers"].append({
                "question_id": current_question.get("id", current_question.get("question_id")),
                "concept": current_question.get("concept", ""),
                "student_answer": student_answer,
                "timestamp": datetime.now().isoformat()
            })
            
            # Provide guidance based on teacher's approach
            return self._provide_corrective_guidance(student_answer, current_question)
    
    def _generate_affirmation(self) -> str:
        """Generate specific affirmation based on student's progress."""
        affirmations = [
            "Great work! You're really understanding this.",
            "Perfect! You've got the hang of it.",
            "Excellent! Your reasoning is spot on.",
            "Well done! You're making great progress.",
            "Awesome! You're building strong math skills.",
            "Impressive! You're thinking like a mathematician.",
            "Brilliant! You've mastered that concept.",
            "Superb! Your approach is exactly right."
        ]
        
        # Use different affirmations based on streak
        correct_streak = len(self.student_memory["correct_answers"])
        if correct_streak >= 3:
            return f"🎯 **You're on a roll!** {affirmations[5]}"
        elif correct_streak >= 2:
            return f"🌟 **Consistent excellence!** {affirmations[3]}"
        else:
            return affirmations[correct_streak % len(affirmations)]
    
    def _provide_corrective_guidance(self, student_answer: str, question: Dict) -> str:
        """Provide guidance when answer is incorrect, following teacher's approach."""
        teaching_approach = self.activity["teaching_approach"]
        
        if teaching_approach == "socratic":
            return f"""🤔 **Let's think this through together...**

Your answer: "{student_answer}"

Instead of telling you the answer, let me ask:
1. What was your reasoning for this answer?
2. Can you walk me through your steps?
3. Where do you think things might have gone differently?

Try approaching it from a different angle. What's another way to think about this problem?"""
        
        elif teaching_approach == "direct":
            return f"""📝 **Let me guide you through this...**

I see you answered: "{student_answer}"

Here's what to focus on:
1. Review: {question.get('concept', 'the key concept')}
2. Common mistake to avoid: [specific guidance]
3. Try this approach: [step-by-step suggestion]

Don't worry - mistakes are how we learn! Try again with this guidance."""
        
        else:  # guided approach (default)
            return f"""🧭 **Let me provide some guidance...**

Your answer: "{student_answer}"

**Step 1:** Let's revisit the key concept: {question.get('concept', '')}
**Step 2:** Check if your answer makes sense in context
**Step 3:** Try breaking the problem into smaller parts

What part are you finding challenging? Let's work through it together."""
    
    def _is_activity_complete(self) -> bool:
        """Check if activity is complete based on teacher's criteria."""
        total_questions = len(self.activity.get("questions", []))
        current_index = self.student_memory["current_question_index"]
        
        # Check completion based on teacher's criteria
        success_criteria = self.activity.get("success_criteria", [])
        
        if "complete_all_questions" in success_criteria:
            return current_index >= total_questions
        elif "master_key_concepts" in success_criteria:
            # Check if key concepts have been answered correctly
            key_concepts = [obj.lower() for obj in self.activity.get("learning_objectives", [])]
            correct_concepts = set()
            
            for answer in self.student_memory["correct_answers"]:
                if answer.get("concept", "").lower() in key_concepts:
                    correct_concepts.add(answer.get("concept", "").lower())
            
            return len(correct_concepts) >= len(key_concepts)
        elif any("threshold" in str(criterion).lower() for criterion in success_criteria):
            # Extract threshold value
            threshold_str = next((c for c in success_criteria if "threshold" in str(c).lower()), "80%")
            threshold_value = 80  # default
            try:
                # Try to extract number from threshold string
                import re
                match = re.search(r'(\d+)', str(threshold_str))
                if match:
                    threshold_value = int(match.group(1))
            except:
                pass
            
            total_attempted = len(self.student_memory["correct_answers"]) + len(self.student_memory["incorrect_answers"])
            if total_attempted == 0:
                return False
            
            accuracy = (len(self.student_memory["correct_answers"]) / total_attempted) * 100
            return accuracy >= threshold_value
        
        # Default: complete all questions
        return current_index >= total_questions
    
    def _create_completion_message(self) -> str:
        """Create completion message based on teacher's criteria."""
        total_questions = len(self.activity.get("questions", []))
        correct_count = len(self.student_memory["correct_answers"])
        total_attempted = len(self.student_memory["correct_answers"]) + len(self.student_memory["incorrect_answers"])
        accuracy = (correct_count / total_attempted * 100) if total_attempted > 0 else 0
        
        mastery_levels = {
            90: "Excellent mastery",
            80: "Strong understanding",
            70: "Good grasp",
            60: "Basic understanding",
            0: "Beginning level"
        }
        
        mastery = next(
            (text for threshold, text in mastery_levels.items() if accuracy >= threshold),
            "Beginning level"
        )
        
        # Get teacher's completion requirements
        success_criteria = self.activity.get("success_criteria", [])
        
        return f"""🎉 **Activity Complete!** 🎉

📊 **Your Results:**
• Questions completed: {total_attempted}
• Correct answers: {correct_count}
• Accuracy: {accuracy:.1f}%
• Mastery level: {mastery}

🏆 **Teacher's Success Criteria Met:**
{chr(10).join(f'• {criterion}' for criterion in success_criteria) if success_criteria else '• Completed the learning activity'}

📚 **Concepts Mastered:**
{self._list_mastered_concepts()}

🌟 **Teacher's Feedback:**
You've successfully completed the activity "{self.activity['title']}"!
{self.activity['description']}

Your progress has been saved. Great work today!"""
    
    def _list_mastered_concepts(self) -> str:
        """List concepts the student has mastered."""
        mastered = {}
        for answer in self.student_memory["correct_answers"]:
            concept = answer.get("concept", "")
            if concept:
                mastered[concept] = mastered.get(concept, 0) + 1
        
        if not mastered:
            return "• You're building foundational skills"
        
        return chr(10).join(f"• {concept} ({count} correct)" for concept, count in mastered.items())
    
    def _get_next_question(self) -> Dict:
        """Get the next question based on student's progress."""
        questions = self.activity.get("questions", [])
        current_index = self.student_memory["current_question_index"]
        
        if current_index < len(questions):
            return questions[current_index]
        
        # If no more questions, create a review question
        return {
            "id": "review",
            "question_text": "Let's review what you've learned. Can you explain the key concept in your own words?",
            "concept": "Review",
            "type": "reflection"
        }
    
    def _extract_teaching_style(self) -> str:
        """Extract teaching style from examples."""
        if not self.teaching_examples:
            return "Guided instruction with step-by-step explanations"
        
        styles = []
        for example in self.teaching_examples:
            style = example.get("teaching_style", "").lower()
            if style:
                styles.append(style)
        
        if not styles:
            return "Adaptive teaching based on student needs"
        
        # Count most common style
        style_counts = {}
        for style in styles:
            style_counts[style] = style_counts.get(style, 0) + 1
        
        most_common = max(style_counts.items(), key=lambda x: x[1])[0]
        
        style_descriptions = {
            "socratic": "Asking guiding questions to help you discover answers",
            "direct": "Providing clear explanations and examples",
            "guided": "Step-by-step guidance with scaffolding",
            "discovery": "Encouraging exploration and self-discovery"
        }
        
        return style_descriptions.get(most_common, "Guided instruction")
    
    def _evaluate_answer(self, student_answer: str, question: Dict) -> bool:
        """Evaluate if student's answer is correct."""
        correct_answer = question.get("correct_answer", "")
        
        if not correct_answer:
            # For open-ended questions, check if answer shows understanding
            return len(student_answer.strip()) > 10  # Simple heuristic
        
        # For multiple choice
        if question.get("type") == "multiple_choice" or question.get("question_type") == "multiple_choice":
            student_clean = student_answer.strip().upper().replace(".", "")
            correct_clean = str(correct_answer).strip().upper().replace(".", "")
            
            # Handle both letter and index responses
            if student_clean in ["A", "B", "C", "D", "E"]:
                student_index = ord(student_clean) - ord("A")
                try:
                    correct_index = int(correct_clean) if correct_clean.isdigit() else ord(correct_clean) - ord("A")
                    return student_index == correct_index
                except:
                    return student_clean == correct_clean
            else:
                return student_clean == correct_clean
        
        # For short answer
        return student_answer.strip().lower() == str(correct_answer).strip().lower()
    
    def _update_memory(self, student_input: str, student_answer: Optional[str], question: Optional[Dict]):
        """Update student memory with current interaction."""
        # Add to conversation history
        self.student_memory["conversation_history"].append({
            "role": "student",
            "content": student_answer if student_answer else student_input,
            "timestamp": datetime.now().isoformat()
        })
        
        # Update concept mastery
        if question and student_answer:
            concept = question.get("concept", "")
            if concept:
                current_count = self.student_memory["concept_mastery"].get(concept, {"correct": 0, "total": 0})
                current_count["total"] += 1
                
                if self._evaluate_answer(student_answer, question):
                    current_count["correct"] += 1
                
                self.student_memory["concept_mastery"][concept] = current_count
        
        # Update engagement level
        recent_history = self.student_memory["conversation_history"][-5:]
        student_messages = [msg for msg in recent_history if msg["role"] == "student"]
        
        if len(student_messages) >= 4:
            self.student_memory["engagement_level"] = "highly_engaged"
        elif len(student_messages) >= 2:
            self.student_memory["engagement_level"] = "engaged"
    
    def _answer_question(self, question: str) -> str:
        """Answer a student question following teacher's approach."""
        # Find relevant teaching examples
        relevant_examples = []
        for example in self.teaching_examples:
            if "?" in example.get("teacher_input", ""):
                relevant_examples.append(example)
                if len(relevant_examples) >= 2:
                    break
        
        if relevant_examples:
            example_text = "\n".join([
                f"Example: {ex.get('teacher_input', '')}\nResponse: {ex.get('desired_ai_response', '')}"
                for ex in relevant_examples
            ])
            
            return f"""📚 **Answering your question...**

Your question: "{question}"

Based on the teacher's examples, I'll help you think through this:

{example_text}

Let me guide you to discover the answer yourself. What have you tried so far?"""
        
        return f"""🤔 **Great question!**

You asked: "{question}"

Following the teacher's approach, let me help you explore this:
1. What do you already know about this topic?
2. What specific part is confusing?
3. Let's break it down together...

Can you share your current thinking?"""
    
    def _provide_help(self, student_input: str) -> str:
        """Provide help when student asks for it."""
        teaching_approach = self.activity["teaching_approach"]
        
        if teaching_approach == "socratic":
            return """🤔 **I'm here to help!**

Let me guide you with some questions:
1. What specific part are you stuck on?
2. What have you tried so far?
3. What do you think might be the first step?

Take your time - I'm here to help you discover the solution!"""
        
        elif teaching_approach == "direct":
            return """📚 **Let me help you understand...**

I'll provide clear guidance:
1. Let's review the key concept
2. I'll show you an example
3. Then you can try applying it

What specific concept would you like help with?"""
        
        else:  # guided
            return """🧭 **I'm here to guide you!**

Let's work through this step-by-step:
1. First, let's identify what you're trying to solve
2. Then we'll break it into smaller steps
3. Finally, we'll put it all together

What would you like help with?"""
    
    def _continue_to_next(self) -> str:
        """Handle when student says they're ready to continue."""
        next_question = self._get_next_question()
        
        if self._is_activity_complete():
            return self._create_completion_message()
        
        return f"""➡️ **Great! Let's continue...**

{next_question.get('question_text', 'Next question')}

Take your time and show your work!"""
    
    def _provide_more_explanation(self) -> str:
        """Provide more explanation when student needs it."""
        teaching_approach = self.activity["teaching_approach"]
        
        if teaching_approach == "socratic":
            return """🤔 **Let's explore this more deeply...**

I'll ask you some questions to help you think through this:
1. What do you understand so far?
2. What's still unclear?
3. Can you think of a similar problem you've solved?

Let's work through this together step by step."""
        
        elif teaching_approach == "direct":
            return """📚 **Let me explain this in more detail...**

I'll break this down further:
1. Here's the concept explained differently
2. Let's look at a detailed example
3. Then we'll practice together

What part would you like me to explain more?"""
        
        else:  # guided
            return """🧭 **Let's go deeper...**

I'll provide more detailed guidance:
1. Let's review the concept with more examples
2. I'll show you each step in detail
3. Then you can try it yourself

What would you like me to explain further?"""
    
    def _general_response(self, student_input: str) -> str:
        """Handle general student input."""
        # Check if this might be an answer to a question
        current_question = self._get_current_question()
        if current_question:
            return f"""💭 **I see you said: "{student_input}"**

Are you answering the current question, or do you have a different question?

Current question: {current_question.get('question_text', 'No current question')}

You can:
- Answer the question directly
- Ask for help
- Ask a question about the concept"""
        
        return f"""💬 **Thanks for sharing: "{student_input}"**

How can I help you today?
- Answer a question
- Explain a concept
- Get help with a problem
- Continue with the activity"""
    
    def _get_current_question(self) -> Optional[Dict]:
        """Get the current question based on progress."""
        questions = self.activity.get("questions", [])
        current_index = self.student_memory["current_question_index"]
        
        if current_index < len(questions):
            return questions[current_index]
        
        return None
    
    def get_session_summary(self) -> Dict:
        """Get comprehensive session summary."""
        total_questions = len(self.activity.get("questions", []))
        correct_count = len(self.student_memory["correct_answers"])
        total_attempted = len(self.student_memory["correct_answers"]) + len(self.student_memory["incorrect_answers"])
        accuracy = (correct_count / total_attempted * 100) if total_attempted > 0 else 0
        
        return {
            "activity": self.activity["title"],
            "start_time": self.student_memory["session_start"],
            "end_time": datetime.now().isoformat(),
            "duration_minutes": self._calculate_duration(),
            "progress": {
                "questions_attempted": total_attempted,
                "correct_answers": correct_count,
                "accuracy_percentage": round(accuracy, 1),
                "current_question_index": self.student_memory["current_question_index"]
            },
            "concept_mastery": self.student_memory["concept_mastery"],
            "engagement_level": self.student_memory["engagement_level"],
            "teacher_criteria_met": self._is_activity_complete(),
            "recommendations": self._generate_recommendations()
        }
    
    def _calculate_duration(self) -> int:
        """Calculate session duration in minutes."""
        start_time = datetime.fromisoformat(self.student_memory["session_start"])
        current_time = datetime.now()
        duration = current_time - start_time
        return int(duration.total_seconds() / 60)
    
    def _generate_recommendations(self) -> List[str]:
        """Generate personalized recommendations based on performance."""
        recommendations = []
        
        # Check concept mastery
        for concept, stats in self.student_memory["concept_mastery"].items():
            accuracy = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
            
            if accuracy < 70:
                recommendations.append(f"Review {concept} - focus on key principles")
            elif accuracy >= 90:
                recommendations.append(f"Excellent on {concept} - ready for advanced topics")
        
        # Add general recommendations
        total_correct = len(self.student_memory["correct_answers"])
        if total_correct >= 5:
            recommendations.append("Great progress! Consider more challenging problems")
        elif total_correct <= 2:
            recommendations.append("Take your time with foundational concepts")
        
        return recommendations[:3]  # Return top 3 recommendations

