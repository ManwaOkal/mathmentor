"""
Student API endpoints for activities and progress.
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os
import re
from datetime import datetime
from lib.supabase_client import get_supabase_client
from lib.auth_helpers import get_user_role, is_student, UserRole
from rag_engine.generator import ResponseGenerator
from rag_engine.prompts import format_conversational_tutor_prompt
from rag_engine.document_prompts import format_document_specific_tutor_prompt
from utils.latex_fixer import fix_latex_formatting

router = APIRouter(prefix="/api/student", tags=["student"])

# Request/Response Models
class JoinClassroomRequest(BaseModel):
    join_code: str

class ActivityResponse(BaseModel):
    activity_id: str
    title: str
    description: Optional[str]
    activity_type: str
    difficulty: str
    questions: List[Dict[str, Any]]
    settings: Dict[str, Any]

class SubmitActivityRequest(BaseModel):
    responses: Dict[str, Any]  # {question_id: answer}

class AssessmentResponse(BaseModel):
    score: float  # Score percentage
    correct_count: int
    total_questions: int
    assessment: str  # 'pass', 'fail', 'needs_review'
    feedback: Optional[str] = None
    recommendations: Optional[List[str]] = None

class ConversationalTutorRequest(BaseModel):
    activity_id: str
    conversation_history: List[Dict[str, str]]  # [{"role": "user/assistant", "content": "..."}]
    student_response: Optional[str] = None
    current_question_index: Optional[int] = None
    teaching_phase: Optional[str] = None  # "teaching", "ready_check", "questioning", "review"
    questions: Optional[List[Dict[str, Any]]] = None  # Questions for phase determination

class PhaseResponseRequest(BaseModel):
    activity_id: str
    student_input: str
    current_phase: str  # "introduction", "teach", "practice", "evaluate"
    conversation_history: List[Dict[str, str]]

class AssessUnderstandingRequest(BaseModel):
    activity_id: str
    conversation_history: List[Dict[str, str]]

class SaveConversationRequest(BaseModel):
    conversation_history: List[Dict[str, str]]  # Full conversation history

class CompleteConversationalActivityRequest(BaseModel):
    conversation_history: List[Dict[str, str]]  # Final conversation history
    score: Optional[float] = None  # Understanding score
    feedback: Optional[str] = None  # Assessment feedback

# Helper function to get current student
async def get_current_student(authorization: Optional[str] = Header(None)):
    """Get current student user from Supabase JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = authorization.replace("Bearer ", "")
    
    # Try to verify Supabase JWT token
    from lib.jwt_verify import verify_supabase_token
    user_info = verify_supabase_token(token)
    
    if user_info and user_info.get("id"):
        user_id = user_info["id"]
        user_metadata = user_info.get("user_metadata", {})
        role = user_info.get("role", "student")
        
        return {"id": user_id, "role": role.lower(), "email": user_info.get("email")}
    
    # Fallback: if token verification fails, check if it's a UUID (backward compatibility)
    import re
    uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
    if uuid_pattern.match(token):
        # Legacy support: assume UUID means student for now
        return {"id": token, "role": "student"}
    
    raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

@router.post("/classrooms/join")
async def join_classroom(
    request: JoinClassroomRequest,
    user: dict = Depends(get_current_student)
):
    """Join a classroom using join code."""
    try:
        supabase = get_supabase_client()
        
        # Validate user_id is a valid UUID format
        import re
        uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
        if not uuid_pattern.match(user['id']):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid user_id format. Expected UUID, got: {user['id']}. Please clear localStorage and sign in again."
            )
        
        # Ensure user exists in auth.users (creates if doesn't exist) - set role to 'student'
        try:
            supabase.rpc('ensure_user_exists', {
                'p_user_id': user['id'],
                'p_email': None,
                'p_role': 'student'
            }).execute()
        except Exception as rpc_error:
            # If RPC doesn't exist, that's okay - user might already exist
            # But log it for debugging
            print(f"Warning: ensure_user_exists RPC failed (might not exist): {rpc_error}")
        
        # Find classroom by join code
        classroom_result = supabase.table('classrooms').select('*').eq('join_code', request.join_code.upper()).single().execute()
        
        if not classroom_result.data:
            raise HTTPException(status_code=404, detail="Invalid join code")
        
        classroom = classroom_result.data
        
        # Check if already enrolled
        existing = supabase.table('student_enrollments').select('*').eq('classroom_id', classroom['classroom_id']).eq('student_id', user['id']).execute()
        
        if existing.data:
            return {
                "message": "Already enrolled in this classroom",
                "classroom_id": classroom['classroom_id'],
                "classroom_name": classroom['name']
            }
        
        # Create enrollment
        try:
            enrollment_result = supabase.table('student_enrollments').insert({
                'classroom_id': classroom['classroom_id'],
                'student_id': user['id']
            }).execute()
        except Exception as insert_error:
            error_str = str(insert_error)
            # Check for foreign key constraint error
            if 'foreign key constraint' in error_str.lower() or '23503' in error_str:
                raise HTTPException(
                    status_code=500,
                    detail=f"Student user not found in database. Please run migration 004_fix_teacher_user_creation.sql. Error: {error_str}"
                )
            raise
        
        if not enrollment_result.data:
            raise HTTPException(status_code=500, detail="Failed to join classroom")
        
        return {
            "message": "Successfully joined classroom",
            "classroom_id": classroom['classroom_id'],
            "classroom_name": classroom['name']
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)

@router.get("/classrooms")
async def get_student_classrooms(user: dict = Depends(get_current_student)):
    """Get all classrooms the student is enrolled in."""
    try:
        supabase = get_supabase_client()
        student_id = user['id']
        
        print(f"Fetching classrooms for student_id: {student_id}")
        
        # Query enrollments with classroom data
        result = supabase.table('student_enrollments').select('*, classrooms(*)').eq('student_id', student_id).execute()
        
        print(f"Query result: {result}")
        print(f"Result data: {result.data}")
        
        # Return enrollments with classroom data nested
        if result.data:
            print(f"Found {len(result.data)} enrollments")
            return result.data
        
        print("No enrollments found")
        return []
    except Exception as e:
        import traceback
        error_detail = f"Error fetching student classrooms: {str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print(error_detail)
        raise HTTPException(status_code=500, detail=error_detail)

@router.get("/activities")
async def get_student_activities(
    classroom_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_student)
):
    """Get activities assigned to the student."""
    try:
        supabase = get_supabase_client()
        
        # Build query with proper joins
        query = supabase.table('student_activities').select(
            '*, learning_activities(*, teacher_documents(classroom_id))'
        ).eq('student_id', user['id'])
        
        if classroom_id:
            # Filter by classroom - activities can be linked via:
            # 1. document_id -> teacher_documents.classroom_id (document-based activities)
            # 2. learning_activities.classroom_id (conversational activities)
            
            # Get document IDs for this classroom
            docs_result = supabase.table('teacher_documents').select('document_id').eq('classroom_id', classroom_id).execute()
            doc_ids = [d['document_id'] for d in (docs_result.data or [])]
            
            # Get activity IDs linked directly to classroom (conversational activities)
            # Try to get activities with classroom_id column first
            try:
                classroom_activities_result = supabase.table('learning_activities').select('activity_id').eq('classroom_id', classroom_id).execute()
                classroom_activity_ids = [a['activity_id'] for a in (classroom_activities_result.data or [])]
            except:
                # If classroom_id column doesn't exist, check metadata
                classroom_activities_result = supabase.table('learning_activities').select('activity_id, metadata, settings').execute()
                classroom_activity_ids = []
                for act in (classroom_activities_result.data or []):
                    metadata = act.get('metadata') or act.get('settings') or {}
                    if metadata.get('classroom_id') == classroom_id:
                        classroom_activity_ids.append(act['activity_id'])
            
            # Build filter: activities with document_id in classroom OR activity_id in classroom activities
            # Since Supabase doesn't easily support OR with different columns, fetch all and filter
            if doc_ids or classroom_activity_ids:
                # Fetch all student activities for this student
                temp_query = supabase.table('student_activities').select(
                    '*, learning_activities(*, teacher_documents(classroom_id))'
                ).eq('student_id', user['id'])
                
                if status:
                    temp_query = temp_query.eq('status', status)
                
                result = temp_query.execute()
                all_activities = result.data if result.data else []
                
                # Filter by classroom: include if document_id matches OR activity_id matches
                activities = []
                for act in all_activities:
                    activity_id = act.get('activity_id')
                    document_id = act.get('document_id')
                    
                    # Include if:
                    # 1. Has document_id and it's in doc_ids (document-based), OR
                    # 2. activity_id is in classroom_activity_ids (conversational)
                    if (document_id and document_id in doc_ids) or \
                       (activity_id and activity_id in classroom_activity_ids):
                        activities.append(act)
            else:
                # No activities in this classroom
                return {"activities": []}
        else:
            # No classroom filter - get all activities for student
            if status:
                query = query.eq('status', status)
            
            result = query.execute()
            activities = result.data if result.data else []
        
        # Sort activities: in_progress/completed first, then by started_at or completed_at
        activities.sort(key=lambda x: (
            0 if x.get('status') in ['in_progress', 'completed'] else 1,  # Active activities first
            x.get('started_at') or x.get('completed_at') or '',  # Then by timestamp
        ), reverse=True)
        
        return {"activities": activities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/{activity_id}")
async def get_activity_details(
    activity_id: str,
    user: dict = Depends(get_current_student)
):
    """Get full activity details with questions."""
    try:
        supabase = get_supabase_client()
        
        # Get student activity
        student_activity_result = supabase.table('student_activities').select('*').eq('activity_id', activity_id).eq('student_id', user['id']).single().execute()
        
        if not student_activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        student_activity = student_activity_result.data
        
        # Get learning activity details
        activity_result = supabase.table('learning_activities').select('*').eq('activity_id', activity_id).single().execute()
        
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity details not found")
        
        activity = activity_result.data
        
        # Get questions
        questions_result = supabase.table('activity_questions').select('*').eq('activity_id', activity_id).order('created_at').execute()
        questions = questions_result.data if questions_result.data else []
        
        # Remove correct answers if not completed
        if student_activity.get('status') != 'completed':
            for q in questions:
                if 'correct_answer' in q:
                    del q['correct_answer']
        
        return {
            "activity": activity,
            "student_activity": student_activity,
            "questions": questions
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/{activity_id}/start")
async def start_activity(
    activity_id: str,
    user: dict = Depends(get_current_student)
):
    """Student starts an assigned activity."""
    try:
        supabase = get_supabase_client()
        
        # Check if already started
        existing_result = supabase.table('student_activities').select('*').eq('activity_id', activity_id).eq('student_id', user['id']).single().execute()
        
        if existing_result.data:
            return {"student_activity_id": existing_result.data['student_activity_id']}
        
        # Get activity details
        activity_result = supabase.table('learning_activities').select('*').eq('activity_id', activity_id).single().execute()
        
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        activity = activity_result.data
        
        # Get question count
        questions_result = supabase.table('activity_questions').select('question_id').eq('activity_id', activity_id).execute()
        total_questions = len(questions_result.data) if questions_result.data else 0
        
        # Create student activity
        student_activity_data = {
            'activity_id': activity_id,
            'student_id': user['id'],
            'document_id': activity.get('document_id'),
            'status': 'in_progress',
            'started_at': 'now()',
            'total_questions': total_questions,
            'responses': {}
        }
        
        result = supabase.table('student_activities').insert(student_activity_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to start activity")
        
        return {"student_activity_id": result.data[0]['student_activity_id']}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/{student_activity_id}/submit", response_model=AssessmentResponse)
async def submit_activity_responses(
    student_activity_id: str,
    request: SubmitActivityRequest,
    user: dict = Depends(get_current_student)
):
    """Submit activity responses for grading."""
    try:
        supabase = get_supabase_client()
        
        # Validate student owns this activity
        student_activity_result = supabase.table('student_activities').select('*').eq('student_activity_id', student_activity_id).eq('student_id', user['id']).single().execute()
        
        if not student_activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        student_activity = student_activity_result.data
        
        # Get questions for grading
        activity_result = supabase.table('learning_activities').select('*').eq('activity_id', student_activity['activity_id']).single().execute()
        activity = activity_result.data
        
        questions_result = supabase.table('activity_questions').select('*').eq('activity_id', student_activity['activity_id']).execute()
        questions = questions_result.data if questions_result.data else []
        
        # Grade responses
        graded_responses = []
        correct_count = 0
        
        for question in questions:
            question_id = str(question['question_id'])  # Ensure it's a string
            student_answer = request.responses.get(question_id) or request.responses.get(str(question_id))
            correct_answer = question.get('correct_answer')
            question_type = question.get('question_type', 'multiple_choice')
            
            is_correct = False
            if student_answer is not None and correct_answer is not None:
                # Compare answers (handle different types)
                if question_type == 'multiple_choice':
                    # For multiple choice, compare as strings (indices)
                    is_correct = str(student_answer).strip() == str(correct_answer).strip()
                elif question_type == 'short_answer':
                    # For short answer, do case-insensitive comparison
                    is_correct = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
                else:
                    # For other types, direct comparison
                    if isinstance(correct_answer, str):
                        is_correct = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
                    else:
                        is_correct = student_answer == correct_answer
            
            if is_correct:
                correct_count += 1
            
            # Store response
            response_data = {
                'student_activity_id': student_activity_id,
                'question_id': question_id,
                'student_answer': str(student_answer) if student_answer is not None else None,
                'is_correct': is_correct
            }
            
            try:
                supabase.table('student_responses').insert(response_data).execute()
            except Exception as e:
                # If response already exists, update it instead
                print(f"Warning: Could not insert response for question {question_id}: {e}")
                try:
                    supabase.table('student_responses').update({
                        'student_answer': response_data['student_answer'],
                        'is_correct': is_correct
                    }).eq('student_activity_id', student_activity_id).eq('question_id', question_id).execute()
                except Exception as update_error:
                    print(f"Warning: Could not update response either: {update_error}")
            
            graded_responses.append(response_data)
        
        # Calculate score
        total_questions = len(questions)
        score_percentage = round((correct_count / total_questions * 100) if total_questions > 0 else 0, 2)
        
        # Determine assessment
        assessment_status = 'pass' if score_percentage >= 70 else 'fail'
        
        # TODO: AI assessment of understanding
        # For now, use basic feedback
        feedback = f"You scored {correct_count} out of {total_questions} ({score_percentage:.1f}%). "
        if assessment_status == 'pass':
            feedback += "Great job! You've demonstrated good understanding of the material."
        else:
            feedback += "Keep practicing! Review the material and try again."
        
        # Update student activity
        supabase.table('student_activities').update({
            'status': 'completed',
            'completed_at': 'now()',
            'correct_answers': correct_count,
            'score': round(score_percentage, 2),
            'assessment': assessment_status,
            'feedback': feedback,
            'responses': request.responses
        }).eq('student_activity_id', student_activity_id).execute()
        
        # TODO: Create progress snapshot with AI assessment
        # For now, return basic results
        
        return AssessmentResponse(
            score=score_percentage,
            correct_count=correct_count,
            total_questions=total_questions,
            assessment=assessment_status,
            feedback=feedback,
            recommendations=[]  # TODO: AI-generated recommendations
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/progress")
async def get_student_progress(user_id: str = Depends(get_current_student)):
    """Get student's overall progress."""
    try:
        supabase = get_supabase_client()
        
        # Get recent activities
        activities_result = supabase.table('student_activities').select('*, learning_activities(title, description)').eq('student_id', user['id']).order('completed_at', desc=True).limit(10).execute()
        
        # Get progress snapshots
        snapshots_result = supabase.table('student_progress_snapshots').select('*').eq('student_id', user['id']).order('captured_at', desc=True).limit(5).execute()
        
        # Calculate overall understanding (simplified)
        overall_score = 0
        if snapshots_result.data:
            scores = [s.get('overall_understanding_score', 0) for s in snapshots_result.data if s.get('overall_understanding_score')]
            overall_score = sum(scores) / len(scores) if scores else 0
        
        return {
            "recent_activities": activities_result.data if activities_result.data else [],
            "progress_snapshots": snapshots_result.data if snapshots_result.data else [],
            "overall_understanding_score": round(overall_score * 100, 2),
            "mastery_summary": {},  # TODO: Implement
            "learning_path": [],  # TODO: Implement
            "teacher_feedback": []  # TODO: Implement
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/conversational-tutor")
async def conversational_tutor(
    request: ConversationalTutorRequest,
    user: dict = Depends(get_current_student)
):
    """Get AI-generated conversational tutor response."""
    try:
        supabase = get_supabase_client()
        
        # Verify student has access to activity
        student_activity_result = supabase.table('student_activities').select('*').eq('activity_id', request.activity_id).eq('student_id', user['id']).single().execute()
        
        if not student_activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Get activity (no questions needed - purely conversational)
        activity_result = supabase.table('learning_activities').select('*').eq('activity_id', request.activity_id).single().execute()
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        activity = activity_result.data
        
        # Check if OpenAI API key is available
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(status_code=500, detail="AI tutor not available. OPENAI_API_KEY not configured.")
        
        # Get questions if available
        questions_result = supabase.table('activity_questions').select('*').eq('activity_id', request.activity_id).order('created_at').execute()
        questions = questions_result.data if questions_result.data else []
        
        # Determine teaching phase
        from rag_engine.prompts import determine_teaching_phase_logic
        teaching_phase = request.teaching_phase
        if not teaching_phase:
            teaching_phase = determine_teaching_phase_logic(
                conversation_history=request.conversation_history,
                current_question_index=request.current_question_index,
                total_questions=len(questions) if questions else 0
            )
        
        # Get current question if in questioning phase
        current_question = None
        if teaching_phase == "questioning" and request.current_question_index is not None:
            if questions and 0 <= request.current_question_index < len(questions):
                current_question = questions[request.current_question_index]
        
        # Generate conversational response
        generator = ResponseGenerator()
        
        # Check if this is a document-based activity with intelligent processing
        activity_metadata = activity.get('metadata', {})
        is_document_based = activity_metadata.get('generation_method') == 'llm_document_based'
        
        if is_document_based:
            # Get document segments from document metadata
            document_id = activity.get('document_id')
            document_segments = []
            
            if document_id:
                try:
                    doc_result = supabase.table('teacher_documents').select('metadata').eq('document_id', document_id).single().execute()
                    if doc_result.data:
                        processed_content = doc_result.data.get('metadata', {}).get('processed_content', {})
                        document_segments = processed_content.get('educational_segments', [])
                except Exception as e:
                    print(f"Error fetching document segments: {e}")
            
            # Use document-specific prompt if segments are available
            if document_segments:
                prompt = format_document_specific_tutor_prompt(
                    activity_data={
                        'title': activity.get('title', 'Math Activity'),
                        'description': activity.get('description', ''),
                        'topics': activity_metadata.get('educational_analysis', {}).get('topics_covered', []),
                        'difficulty': activity.get('difficulty', 'intermediate'),
                        'current_question': current_question
                    },
                    document_segments=document_segments,
                    conversation_history=request.conversation_history,
                    student_response=request.student_response,
                    current_phase=teaching_phase
                )
            else:
                # Fallback to regular prompt if segments not available
                prompt = format_conversational_tutor_prompt(
                    activity_title=activity.get('title', 'Math Activity'),
                    activity_description=activity.get('description', ''),
                    questions=questions,
                    conversation_history=request.conversation_history,
                    current_question_index=request.current_question_index,
                    student_response=request.student_response,
                    current_question=current_question,
                    teaching_phase=teaching_phase
                )
        else:
            # Use regular prompt for non-document-based activities
            prompt = format_conversational_tutor_prompt(
                activity_title=activity.get('title', 'Math Activity'),
                activity_description=activity.get('description', ''),
                questions=questions,
                conversation_history=request.conversation_history,
                current_question_index=request.current_question_index,
                student_response=request.student_response,
                current_question=current_question,
                teaching_phase=teaching_phase
            )
        
        ai_response = generator.generate_response(
            prompt=prompt,
            temperature=0.85,  # Higher temperature for more creative, engaging, and natural responses
            max_tokens=4000  # Much higher token limit for comprehensive, detailed, thorough responses - FULL POWER!
        )
        
        # Post-process: Fix LaTeX formatting issues (fixes buggy patterns like $m = $\frac{...}${...}$)
        response_text = ai_response.strip()
        response_text = fix_latex_formatting(response_text)
        
        # Also wrap any unwrapped math expressions (legacy function for backward compatibility)
        def wrap_math_expressions(text: str) -> str:
            """Automatically wrap math expressions in LaTeX delimiters."""
            # First, protect already-wrapped LaTeX expressions
            protected = {}
            protected_count = 0
            
            # Find and protect expressions that already have $ delimiters
            def protect_wrapped(match):
                nonlocal protected_count
                key = f"__PROTECTED_{protected_count}__"
                protected[key] = match.group(0)
                protected_count += 1
                return key
            
            # Protect already-wrapped inline math ($...$)
            text = re.sub(r'\$[^$\n]+\$', protect_wrapped, text)
            # Protect already-wrapped display math ($$...$$)
            text = re.sub(r'\$\$[^$\n]+\$\$', protect_wrapped, text)
            
            # Pattern 0: LaTeX commands with backslashes (like \frac, \sqrt, \pm) - wrap entire expression
            # Match patterns like: x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
            # This pattern matches LaTeX commands and their arguments
            
            # First, handle complete formulas with LaTeX commands (most specific first)
            # Pattern: variable = \frac{...}{...} (quadratic formula, etc.)
            text = re.sub(r'([a-zA-Z]\s*=\s*\\frac\{[^}]+\}\{[^}]+\})', r'$\1$', text)
            
            # Pattern: \frac{...}{...} (general fractions)
            text = re.sub(r'(?<!\$)(\\frac\{[^}]+\}\{[^}]+\})(?!\$)', r'$\1$', text)
            
            # Pattern: \sqrt{...} (square roots)
            text = re.sub(r'(?<!\$)(\\sqrt\{[^}]+\})(?!\$)', r'$\1$', text)
            
            # Pattern: \pm (plus-minus) - wrap if not already wrapped
            text = re.sub(r'(?<!\$)(\\pm)(?!\$)', r'$\1$', text)
            
            # Pattern: Other common LaTeX commands
            text = re.sub(r'(?<!\$)(\\[a-zA-Z]+\{[^}]*\})(?!\$)', r'$\1$', text)
            
            # Common math patterns - apply in order of specificity
            # Pattern 1: Complex expressions with exponents (x^2+2x+1, x^2+3x+4)
            text = re.sub(r'(?<!\$)(?<![a-zA-Z0-9])([a-zA-Z]\^\d+\s*[+\-]\s*\d*[a-zA-Z](?:\^\d+)?\s*[+\-]\s*\d+)(?![a-zA-Z0-9\$])', r'$\1$', text)
            # Pattern 2: Three-term expressions (2x-3y+z, x+5-2y)
            text = re.sub(r'(?<!\$)(?<![a-zA-Z0-9])(\d*[a-zA-Z](?:\^\d+)?\s*[+\-]\s*\d*[a-zA-Z](?:\^\d+)?\s*[+\-]\s*\d*[a-zA-Z](?:\^\d+)?)(?![a-zA-Z0-9\$])', r'$\1$', text)
            # Pattern 3: Two-term expressions (x+5, 2x-1, 3a-4b, x+1)
            text = re.sub(r'(?<!\$)(?<![a-zA-Z0-9])(\d*[a-zA-Z](?:\^\d+)?\s*[+\-]\s*\d+)(?![a-zA-Z0-9\$])', r'$\1$', text)
            text = re.sub(r'(?<!\$)(?<![a-zA-Z0-9])(\d*[a-zA-Z](?:\^\d+)?\s*[+\-]\s*\d*[a-zA-Z](?:\^\d+)?)(?![a-zA-Z0-9\$])', r'$\1$', text)
            # Pattern 4: Single term with coefficient (2x, 3y^2, -4a, 5x, 3y2)
            text = re.sub(r'(?<!\$)(?<![a-zA-Z0-9])(-?\d+[a-zA-Z](?:\d+|\^\d+)?)(?![a-zA-Z0-9\$])', r'$\1$', text)
            # Pattern 5: Variable with exponent (x^2, y^3)
            text = re.sub(r'(?<!\$)(?<![a-zA-Z0-9])([a-zA-Z]\^\d+)(?![a-zA-Z0-9\$])', r'$\1$', text)
            # Pattern 6: Standalone numbers when in math context (coefficient 4, etc.)
            text = re.sub(r'(coefficient|term|value)\s+is\s+(-?\d+)(?=\s|\.|$)', r'\1 is $\2$', text)
            
            # Restore protected expressions
            for key, value in protected.items():
                text = text.replace(key, value)
            
            # Clean up: fix double wrapping
            text = re.sub(r'\$\$([^$]+)\$\$', r'$\1$', text)
            text = re.sub(r'\$(\$[^$]+\$)\$', r'\1', text)
            
            return text
        
        # Apply both fixes: first fix LaTeX bugs, then wrap any remaining unwrapped expressions
        processed_response = wrap_math_expressions(response_text)
        
        # Determine next question index based on phase
        next_question_index = request.current_question_index
        if teaching_phase == "questioning":
            # If student got it right or we're moving forward, increment
            # This is a simple heuristic - you might want to make it smarter
            if request.student_response and any(word in request.student_response.lower() for word in ['correct', 'right', 'yes', 'got it']):
                next_question_index = (request.current_question_index or 0) + 1 if request.current_question_index is not None else 0
        elif teaching_phase == "ready_check":
            # If student says ready, move to questioning phase
            if request.student_response and any(word in request.student_response.lower() for word in ['ready', 'yes', 'start']):
                next_question_index = 0
        
        return {
            "response": processed_response,
            "phase": teaching_phase,
            "next_question_index": next_question_index
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/{student_activity_id}/save-conversation")
async def save_conversation(
    student_activity_id: str,
    request: SaveConversationRequest,
    user: dict = Depends(get_current_student)
):
    """Save conversation history for teacher review."""
    try:
        supabase = get_supabase_client()
        
        # Verify student owns this activity
        student_activity_result = supabase.table('student_activities').select('*').eq('student_activity_id', student_activity_id).eq('student_id', user['id']).single().execute()
        
        if not student_activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Save conversation to metadata
        supabase.table('student_activities').update({
            'metadata': {
                **student_activity_result.data.get('metadata', {}),
                'conversation_history': request.conversation_history,
                'last_updated': datetime.now().isoformat()
            }
        }).eq('student_activity_id', student_activity_id).execute()
        
        return {"success": True, "message": "Conversation saved"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/{student_activity_id}/complete-conversational")
async def complete_conversational_activity(
    student_activity_id: str,
    request: CompleteConversationalActivityRequest,
    user: dict = Depends(get_current_student)
):
    """Complete a conversational activity - save final conversation and mark as completed."""
    try:
        supabase = get_supabase_client()
        
        # Verify student owns this activity
        student_activity_result = supabase.table('student_activities').select('*').eq('student_activity_id', student_activity_id).eq('student_id', user['id']).single().execute()
        
        if not student_activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Prepare update data
        update_data = {
            'status': 'completed',
            'completed_at': datetime.now().isoformat(),  # ISO format for Supabase timestamp
            'metadata': {
                **student_activity_result.data.get('metadata', {}),
                'conversation_history': request.conversation_history,
                'completed_at': datetime.now().isoformat()
            }
        }
        
        # Add score and feedback if provided
        if request.score is not None:
            update_data['score'] = request.score
        if request.feedback:
            update_data['feedback'] = request.feedback
        
        # Save final conversation and mark as completed
        supabase.table('student_activities').update(update_data).eq('student_activity_id', student_activity_id).execute()
        
        return {"success": True, "message": "Activity completed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/{activity_id}/introduction")
async def get_activity_introduction(
    activity_id: str,
    user: dict = Depends(get_current_student)
):
    """Get AI introduction for an activity"""
    try:
        supabase = get_supabase_client()
        
        # Verify student has access to activity
        student_activity_result = supabase.table('student_activities').select('*').eq('activity_id', activity_id).eq('student_id', user['id']).single().execute()
        
        if not student_activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Get activity
        activity_result = supabase.table('learning_activities').select('*').eq('activity_id', activity_id).single().execute()
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        activity = activity_result.data
        metadata = activity.get('metadata', {})
        topic = metadata.get('topic', activity.get('title', 'this topic'))
        teaching_style = metadata.get('teaching_style', 'guided')
        
        # Generate introduction
        prompt = f"""You are MathMentor, an AI math tutor. Create a welcoming introduction for a learning session about: {topic}

Teaching Style: {teaching_style}

Create an introduction that:
1. Greets the student warmly
2. Explains what you'll learn together
3. Sets expectations for the conversation
4. Makes them feel comfortable to ask questions

Keep it friendly and inviting! Use $...$ for math notation if needed."""

        generator = ResponseGenerator()
        introduction = generator.generate_response(
            prompt=prompt,
            temperature=0.7,
            max_tokens=300
        )
        
        return {"introduction": introduction}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/phase-response")
async def get_phase_response(
    request: PhaseResponseRequest,
    user: dict = Depends(get_current_student)
):
    """Get AI response based on current teaching phase"""
    try:
        supabase = get_supabase_client()
        
        # Verify student has access to activity
        student_activity_result = supabase.table('student_activities').select('*').eq('activity_id', request.activity_id).eq('student_id', user['id']).single().execute()
        
        if not student_activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Get activity details
        activity_result = supabase.table('learning_activities').select('*').eq('activity_id', request.activity_id).single().execute()
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        activity = activity_result.data
        metadata = activity.get('metadata', {})
        topic = metadata.get('topic', activity.get('title', 'this topic'))
        teaching_style = metadata.get('teaching_style', 'guided')
        difficulty = activity.get('difficulty', 'intermediate')
        
        # Get relevant teaching examples
        try:
            teacher_id = activity.get('teacher_id')
            examples_result = supabase.table('teaching_examples').select('*').eq('teacher_id', teacher_id).order('created_at', desc=True).limit(5).execute()
            examples = examples_result.data if examples_result.data else []
        except:
            examples = []
        
        # Filter examples by topic
        relevant_examples = [ex for ex in examples if topic.lower() in ex.get('topic', '').lower()][:3]
        if not relevant_examples:
            relevant_examples = examples[:3]
        
        # Create phase-specific prompt
        examples_context = ""
        if relevant_examples:
            examples_context = "LEARN FROM THESE TEACHING EXAMPLES:\n"
            for i, ex in enumerate(relevant_examples):
                examples_context += f"""
Example {i+1} - Topic: {ex.get('topic', 'N/A')}
Student: {ex.get('teacher_input', '')}
AI Response: {ex.get('desired_ai_response', '')}
---
"""
        
        conversation_text = "\n".join([
            f"{msg.get('role', 'user').title()}: {msg.get('content', '')}"
            for msg in request.conversation_history[-5:]
        ])
        
        if request.current_phase == 'introduction':
            prompt = f"""You are starting a learning session about: {topic}

Teaching Style: {teaching_style}
Difficulty: {difficulty}

Create a welcoming introduction that:
1. Greets the student warmly
2. Explains what you'll learn together
3. Sets expectations for the conversation
4. Makes them feel comfortable to ask questions

Keep it friendly and inviting!"""
        
        elif request.current_phase == 'teach':
            prompt = f"""You are in the TEACHING phase about: {topic}

{examples_context}

CONVERSATION SO FAR:
{conversation_text}

STUDENT'S LATEST INPUT:
"{request.student_input}"

Your task: Teach the concept clearly using {teaching_style} style.
- Explain step-by-step
- Use examples if helpful
- Check for understanding
- Use $...$ for math notation
- Keep it conversational

Respond to continue teaching:"""
        
        elif request.current_phase == 'practice':
            prompt = f"""You are in the PRACTICE phase. The student has learned about {topic}.

{examples_context}

CONVERSATION HISTORY:
{conversation_text}

STUDENT'S INPUT:
"{request.student_input}"

Your task: Guide practice without giving answers.
- Ask questions to check understanding
- Provide hints if stuck
- Encourage thinking
- Connect back to what was taught
- Assess their approach

Keep it conversational and supportive:"""
        
        elif request.current_phase == 'evaluate':
            prompt = f"""You are in the EVALUATION phase. Assess the student's understanding of {topic}.

{examples_context}

CONVERSATION HISTORY:
{conversation_text}

STUDENT'S INPUT:
"{request.student_input}"

Your task: Assess understanding through conversation.
- Ask assessment questions
- Listen to their explanations
- Provide constructive feedback
- Identify gaps in understanding
- Prepare to summarize their learning

Be supportive but honest in assessment:"""
        
        else:
            prompt = f"""Respond to the student naturally about {topic}.

Student: "{request.student_input}"

Response:"""
        
        # Generate response
        generator = ResponseGenerator()
        response = generator.generate_response(
            prompt=prompt,
            temperature=0.7,
            max_tokens=1000
        )
        
        # Determine next phase based on conversation length and phase
        next_phase = request.current_phase
        conversation_length = len(request.conversation_history) + 1
        
        # Simple phase progression logic
        if request.current_phase == 'introduction' and conversation_length >= 2:
            next_phase = 'teach'
        elif request.current_phase == 'teach' and conversation_length >= 6:
            next_phase = 'practice'
        elif request.current_phase == 'practice' and conversation_length >= 10:
            next_phase = 'evaluate'
        elif request.current_phase == 'evaluate' and conversation_length >= 13:
            next_phase = 'complete'
        
        return {
            "response": response,
            "next_phase": next_phase,
            "current_phase": request.current_phase
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/assess-understanding")
async def assess_understanding(
    request: AssessUnderstandingRequest,
    user: dict = Depends(get_current_student)
):
    """Assess student understanding from conversation"""
    try:
        supabase = get_supabase_client()
        
        # Verify student has access to activity
        student_activity_result = supabase.table('student_activities').select('*').eq('activity_id', request.activity_id).eq('student_id', user['id']).single().execute()
        
        if not student_activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Get activity
        activity_result = supabase.table('learning_activities').select('*').eq('activity_id', request.activity_id).single().execute()
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        activity = activity_result.data
        metadata = activity.get('metadata', {})
        topic = metadata.get('topic', activity.get('title', 'this topic'))
        difficulty = activity.get('difficulty', 'intermediate')
        
        conversation_text = "\n".join([
            f"{msg.get('role', 'user').title()}: {msg.get('content', '')}"
            for msg in request.conversation_history
        ])
        
        prompt = f"""Assess a student's understanding from this learning conversation. Be EXTREMELY STRICT - only give scores above 0% if there is clear evidence of actual mathematical work, problem-solving, calculations, or mathematical explanations.

TOPIC: {topic}
DIFFICULTY: {difficulty}
CONVERSATION:
{conversation_text}

ANALYSIS CRITERIA (be extremely strict):
1. Conceptual understanding (0-10) - Only high if they demonstrate understanding through examples, explanations, or solving problems
2. Application ability (0-10) - Only high if they actually attempt to solve problems or apply concepts
3. Problem-solving approach (0-10) - Only high if they show working through problems, not just asking questions
4. Communication of ideas (0-10) - Only high if they explain their mathematical thinking or reasoning

CRITICAL RULES - FOLLOW STRICTLY:
- If conversation is ONLY greetings (hello, hi, thanks) with NO mathematical content: score MUST be 0%
- If conversation has NO numbers, equations, calculations, problem-solving attempts, or mathematical explanations: score MUST be 0%
- If they only ask questions without any mathematical work: score 0-20%
- If they attempt problems but make errors: score 30-60%
- If they solve problems correctly: score 60-85%
- If they demonstrate deep understanding with multiple correct solutions: score 85-95%

Check for mathematical indicators: numbers, equations, calculations, solving steps, problem attempts, mathematical explanations, formulas, or mathematical reasoning.

If NO mathematical work is detected (only greetings, casual conversation, or non-mathematical questions), return score: 0

Return JSON: {{"score": 0, "feedback": "No mathematical work demonstrated. Complete activities require solving problems or demonstrating understanding through mathematical work."}}"""

        generator = ResponseGenerator()
        response = generator.generate_response(
            prompt=prompt,
            temperature=0.1,
            max_tokens=500
        )
        
        # Try to parse JSON from response
        try:
            import json
            # Extract JSON from response if it's wrapped in text
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                assessment = json.loads(response[json_start:json_end])
            else:
                assessment = {"score": 75, "feedback": "Good progress shown in conversation."}
        except:
            assessment = {"score": 75, "feedback": "Good progress shown in conversation."}
        
        return assessment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

