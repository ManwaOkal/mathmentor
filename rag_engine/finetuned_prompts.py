"""
Fine-tuned prompts that use teacher's curated examples to guide AI responses.
"""
from typing import List, Dict, Optional

def create_teaching_prompt(student_input: str, teaching_examples: List[Dict]) -> str:
    """
    Create prompt that incorporates teaching examples for fine-tuning AI behavior.
    
    Args:
        student_input: The student's question or input
        teaching_examples: List of teaching examples from the teacher
        
    Returns:
        Formatted prompt string
    """
    if not teaching_examples:
        # Fallback to generic prompt
        return f"""You are MathMentor, an AI math tutor. Answer this student question clearly and helpfully.

Student: {student_input}

Answer:"""

    # Build context from examples
    examples_text = "\n\n".join([
        f"Example {i+1}:\n"
        f"Topic: {ex.get('topic', 'General')}\n"
        f"Difficulty: {ex.get('difficulty', 'intermediate')}\n"
        f"Teaching Style: {ex.get('teaching_style', 'guided')}\n"
        f"Student: {ex.get('teacher_input', '')}\n"
        f"Good Response: {ex.get('desired_ai_response', '')}"
        for i, ex in enumerate(teaching_examples)
    ])

    return f"""You are MathMentor, an AI math tutor. You have been trained with specific teaching examples.

TEACHING EXAMPLES (learn from these):

{examples_text}

Now, respond to this new student question:

Student: {student_input}

Guidelines:
1. Match the teaching style from the examples
2. Consider the difficulty level
3. Be helpful and encouraging
4. Use proper math notation with $...$
5. Reference concepts appropriately

Your response should follow the patterns shown in the teaching examples above.

Answer:"""


def format_finetuned_tutor_prompt(
    student_input: str,
    teaching_examples: List[Dict],
    conversation_history: Optional[List[Dict]] = None
) -> str:
    """
    Tutor prompt that uses teacher's curated examples as fine-tuning.
    
    Args:
        student_input: Current student question
        teaching_examples: List of teaching examples
        conversation_history: Previous conversation messages
        
    Returns:
        Formatted prompt string
    """
    # Filter examples by relevance (simple keyword matching)
    relevant_examples = find_relevant_examples(student_input, teaching_examples)
    
    if relevant_examples:
        # Use specific examples for guidance
        prompt = f"""You are MathMentor, an AI math tutor fine-tuned by a teacher.

TEACHER'S GUIDANCE EXAMPLES:

{format_examples_for_prompt(relevant_examples)}

CURRENT STUDENT QUESTION:

"{student_input}"

CONVERSATION HISTORY:

{format_conversation_history(conversation_history) if conversation_history else "None"}

RESPONSE GUIDELINES (from teacher's examples):
1. Match the TEACHING STYLE shown in examples
2. Use similar LEVEL OF DETAIL
3. Follow the same STRUCTURE and FORMATTING
4. Address LEARNING OBJECTIVES from examples
5. Use proper math notation with $...$
6. Be encouraging and supportive

CRITICAL: Your response should sound like it's from the same tutor shown in the examples.

Your response:"""
    else:
        # Fallback to general prompt with teacher's style
        most_recent_examples = teaching_examples[-3:] if teaching_examples else []
        
        prompt = f"""You are MathMentor, an AI math tutor trained with these teaching principles:

GENERAL TEACHING PRINCIPLES:

{extract_teaching_principles(most_recent_examples)}

STUDENT QUESTION:

"{student_input}"

Teach clearly and helpfully, following the teacher's preferred approach."""
    
    return prompt


def find_relevant_examples(student_input: str, examples: List[Dict]) -> List[Dict]:
    """Find examples relevant to the student's question"""
    input_lower = student_input.lower()
    relevant = []
    
    for example in examples:
        # Check topic match
        topic = example.get('topic', '').lower()
        if topic and topic in input_lower:
            relevant.append(example)
        # Check keyword overlap
        elif topic:
            keywords = topic.split()
            if any(keyword in input_lower for keyword in keywords if len(keyword) > 3):
                relevant.append(example)
    
    # Return up to 3 most relevant examples
    return relevant[:3]


def format_examples_for_prompt(examples: List[Dict]) -> str:
    """Format examples for the prompt"""
    formatted = []
    
    for i, example in enumerate(examples):
        learning_obj = ', '.join(example.get('learning_objectives', [])) or 'General understanding'
        formatted.append(f"""EXAMPLE {i+1}:
Topic: {example.get('topic', 'General')}
Teaching Style: {example.get('teaching_style', 'guided')}
Difficulty: {example.get('difficulty', 'intermediate')}
Learning Objectives: {learning_obj}
Student: "{example.get('teacher_input', '')}"
Good Response: "{example.get('desired_ai_response', '')}"
---""")
    
    return "\n".join(formatted)


def extract_teaching_principles(examples: List[Dict]) -> str:
    """Extract general teaching principles from examples"""
    if not examples:
        return "1. Be clear and step-by-step\n2. Use examples\n3. Check understanding"
    
    principles = []
    
    # Analyze teaching styles
    styles = [ex.get('teaching_style', 'guided') for ex in examples]
    most_common_style = max(set(styles), key=styles.count) if styles else 'guided'
    
    if most_common_style == 'socratic':
        principles.append("• Ask questions to guide discovery")
        principles.append("• Help students think through problems")
    elif most_common_style == 'direct':
        principles.append("• Provide clear explanations")
        principles.append("• Show worked examples")
    elif most_common_style == 'guided':
        principles.append("• Break problems into steps")
        principles.append("• Provide scaffolding")
    else:  # discovery
        principles.append("• Encourage exploration")
        principles.append("• Let students try first")
    
    # Add common elements
    principles.append("• Use math notation properly")
    principles.append("• Be encouraging and patient")
    
    return "\n".join(principles)


def format_conversation_history(history: List[Dict]) -> str:
    """Format conversation history for prompt"""
    if not history:
        return "None"
    
    formatted = []
    for msg in history[-5:]:  # Last 5 messages
        role = msg.get('role', 'user')
        content = msg.get('content', '')
        formatted.append(f"{role.capitalize()}: {content}")
    
    return "\n".join(formatted)

