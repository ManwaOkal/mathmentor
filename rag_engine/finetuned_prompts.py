"""
Fine-tuned prompts that use teacher's curated examples to guide AI responses.
Teaching examples apply to all activities and follow the same design pattern as conversational tutor prompts.
"""
from typing import List, Dict, Optional, Any

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


def filter_examples_by_activity(
    examples: List[Dict],
    activity_id: Optional[str] = None,
    activity_title: Optional[str] = None,
    activity_description: Optional[str] = None,
    topic: Optional[str] = None
) -> List[Dict]:
    """
    Filter teaching examples by relevance (applies to all activities).
    Priority: topic match > all examples
    
    Args:
        examples: List of all teaching examples
        activity_id: (Not used - examples apply to all activities)
        activity_title: Activity title for topic matching
        activity_description: Activity description for topic matching
        topic: Topic for matching
        
    Returns:
        Filtered list of relevant examples (up to 10)
    """
    if not examples:
        return []
    
    # Filter by topic/keyword matching for relevance
    search_terms = []
    if topic:
        search_terms.append(topic.lower())
    if activity_title:
        search_terms.append(activity_title.lower())
    if activity_description:
        # Extract key terms from description (simple approach)
        words = activity_description.lower().split()
        search_terms.extend([w for w in words if len(w) > 4])  # Only meaningful words
    
    if search_terms:
        relevant = []
        for example in examples:
            example_topic = example.get('topic', '').lower()
            # Check if any search term matches the example topic
            if any(term in example_topic or example_topic in term for term in search_terms if len(term) > 3):
                relevant.append(example)
        
        if relevant:
            return relevant[:10]  # Return up to 10 most relevant
    
    # Return most recent examples (up to 10) - applies to all activities
    return examples[:10]


def format_activity_specific_finetuned_prompt(
    student_input: str,
    teaching_examples: List[Dict],
    activity_id: Optional[str] = None,
    activity_title: Optional[str] = None,
    activity_description: Optional[str] = None,
    teaching_style: str = "guided",
    difficulty: str = "intermediate",
    topic: Optional[str] = None,
    conversation_history: Optional[List[Dict]] = None,
    teaching_phase: str = "teaching"
) -> str:
    """
    Fine-tuned tutor prompt that applies teaching examples to all activities.
    Examples are filtered by topic relevance but apply globally across all activities.
    
    Args:
        student_input: Current student question or input
        teaching_examples: List of all teaching examples (applies to all activities)
        activity_id: (Not used - examples apply to all activities)
        activity_title: Activity title for context and topic matching
        activity_description: Activity description (teacher's instructions)
        teaching_style: Teaching style (socratic, direct, guided, discovery)
        difficulty: Difficulty level (beginner, intermediate, advanced)
        topic: Topic for matching examples by relevance
        conversation_history: Previous conversation messages
        teaching_phase: Current teaching phase (teaching, ready_check, questioning, review)
        
    Returns:
        Formatted prompt string with fine-tuning that applies to all activities
    """
    # Filter examples by relevance (applies to all activities)
    relevant_examples = filter_examples_by_activity(
        examples=teaching_examples,
        activity_id=None,  # Not used - examples apply to all activities
        activity_title=activity_title,
        activity_description=activity_description,
        topic=topic
    )
    
    # Build activity context section
    activity_context = ""
    if activity_title:
        activity_context += f"Activity: {activity_title}\n"
    if activity_description:
        activity_context += f"Teacher's Instructions: {activity_description}\n"
    if topic:
        activity_context += f"Topic: {topic}\n"
    
    # Define teaching style guidance (same as in prompts.py)
    teaching_style_guidance = {
        'socratic': 'SOCRATIC STYLE: Ask questions to guide discovery. Don\'t give direct answers - help students think through problems by asking probing questions. Encourage them to explain their reasoning.',
        'direct': 'DIRECT STYLE: Explain concepts clearly and directly. Provide clear explanations, definitions, and step-by-step instructions. Be explicit about methods and procedures.',
        'guided': 'GUIDED STYLE: Provide step-by-step guidance with explanations. Break down problems into manageable steps, explain each step, and provide support as needed.',
        'discovery': 'DISCOVERY STYLE: Let students explore and discover concepts themselves. Provide minimal guidance, ask open-ended questions, and let them experiment.',
        'teacher': 'TEACHER STYLE: Act as a traditional teacher who listens to student needs and requests. Explain concepts step-by-step in a clear, structured manner. After explaining each step or concept, ask "Do you understand?" or "Does that make sense?" and wait for confirmation before proceeding. Give students opportunities to answer questions and demonstrate understanding. Be patient, encouraging, and responsive to what the student wants to learn.'
    }
    
    # Define difficulty level guidance (same as in prompts.py)
    difficulty_guidance = {
        'beginner': 'BEGINNER LEVEL: Use simple language, basic examples, and fundamental concepts. Avoid advanced terminology. Break everything into very small steps.',
        'intermediate': 'INTERMEDIATE LEVEL: Use standard mathematical language and notation. Include both basic and moderately complex examples.',
        'advanced': 'ADVANCED LEVEL: Use precise mathematical language and notation. Include complex examples and applications.'
    }
    
    style_instruction = teaching_style_guidance.get(teaching_style.lower(), teaching_style_guidance['guided'])
    difficulty_instruction = difficulty_guidance.get(difficulty.lower(), difficulty_guidance['intermediate'])
    
    # Build examples section
    examples_section = ""
    if relevant_examples:
        examples_section = f"""
**TEACHING EXAMPLES (learn from these - applies to all activities):**

{format_examples_for_prompt(relevant_examples)}

**CRITICAL**: These examples guide how you teach across all activities. Match the teaching style, level of detail, and approach shown in these examples.
"""
    else:
        # Extract general principles from all examples
        all_examples = teaching_examples[:3] if teaching_examples else []
        if all_examples:
            examples_section = f"""
**GENERAL TEACHING PRINCIPLES (from teacher's examples):**

{extract_teaching_principles(all_examples)}
"""
    
    # Build conversation history section
    history_section = ""
    if conversation_history:
        history_section = f"""
**CONVERSATION HISTORY:**
{format_conversation_history(conversation_history)}
"""
    
    # Build the prompt based on teaching phase
    if teaching_phase == "teaching":
        prompt = f"""You are MathMentor, an AI math tutor. You have been programmed by the student's teacher to teach using their specific methods and instructions. You are fine-tuned with teaching examples that apply to all activities.

{activity_context}
**CRITICAL - TEACHING STYLE (YOU MUST USE THIS EXACTLY):**
{style_instruction}

**CRITICAL - DIFFICULTY LEVEL (YOU MUST ADJUST TO THIS):**
{difficulty_instruction}
{examples_section}
{history_section}
**CURRENT STUDENT INPUT:**
"{student_input}"

**YOUR TASK**: 
- You have been programmed by the teacher to follow their specific teaching approach
- Use {teaching_style} teaching style EXACTLY as specified above
- Adjust to {difficulty} difficulty level EXACTLY as specified above
- Follow the teacher's instructions and examples above
- Provide comprehensive teaching that matches the examples
- Use proper math notation with $...$
- Be encouraging and supportive

**CRITICAL - HANDLING STUDENT RESPONSES**:
- If the student says "okay", "ok", "yes", "sure", "alright" - these are acknowledgments, NOT requests to restart
- Continue naturally with your teaching - acknowledge briefly if needed, then continue with the next concept
- DO NOT restart the lesson or repeat what you just said when the student says "okay"
- DO NOT treat "okay" as a signal to move to questions - only move when they explicitly say "ready"
- If you've already started teaching, continue with the next part naturally

**CRITICAL**: Your response should match the style, depth, and approach shown in the teaching examples above.

Your response:"""
    
    elif teaching_phase == "questioning":
        prompt = f"""You are MathMentor, guiding a student through practice questions with fine-tuning from teaching examples.

{activity_context}
**CRITICAL - TEACHING STYLE (YOU MUST USE THIS EXACTLY):**
{style_instruction}

**CRITICAL - DIFFICULTY LEVEL (YOU MUST ADJUST TO THIS):**
{difficulty_instruction}
{examples_section}
{history_section}
**STUDENT'S RESPONSE:**
"{student_input}"

**YOUR TASK - CRITICAL ORDER**: 
1. **FIRST**: Determine if the student's answer is CORRECT by analyzing their response
2. **If answer is CORRECT**: Acknowledge it immediately with clear praise (e.g., "That's correct!", "Exactly right!", "Perfect!") and move forward - DO NOT ask to double-check, verify, or confirm
3. **If answer is WRONG or INCOMPLETE**: Guide them to discover the correct approach using {teaching_style} style
4. Use proper math notation with $...$
5. Be encouraging and supportive

**CRITICAL**: 
- If the student gives the correct answer, acknowledge it and move on - do NOT ask them to verify or double-check
- Your feedback should match the approach and style shown in the teaching examples above
- Guide without giving away answers directly

Your response:"""
    
    else:  # ready_check or review
        prompt = f"""You are MathMentor, an AI math tutor fine-tuned with teaching examples that apply to all activities.

{activity_context}
**CRITICAL - TEACHING STYLE (YOU MUST USE THIS EXACTLY):**
{style_instruction}

**CRITICAL - DIFFICULTY LEVEL (YOU MUST ADJUST TO THIS):**
{difficulty_instruction}
{examples_section}
{history_section}
**STUDENT INPUT:**
"{student_input}"

**YOUR TASK**: 
- Use {teaching_style} teaching style EXACTLY as specified above
- Adjust to {difficulty} difficulty level EXACTLY as specified above
- Follow the teacher's instructions and examples above
- Use proper math notation with $...$
- Be encouraging and supportive

Your response:"""
    
    return prompt

