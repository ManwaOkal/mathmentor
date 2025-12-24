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
from rag_engine.finetuned_prompts import format_activity_specific_finetuned_prompt
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
        
        # Automatically assign existing classroom activities to the new student
        classroom_id = classroom['classroom_id']
        assigned_activities_count = sync_classroom_activities_for_student(supabase, user['id'], classroom_id)
        
        if assigned_activities_count > 0:
            print(f"Auto-assigned {assigned_activities_count} activities to new student {user['id']} in classroom {classroom_id}")
        
        return {
            "message": "Successfully joined classroom",
            "classroom_id": classroom['classroom_id'],
            "classroom_name": classroom['name'],
            "activities_assigned": assigned_activities_count
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

def sync_classroom_activities_for_student(supabase, student_id: str, classroom_id: str) -> int:
    """
    Helper function to sync all classroom activities for a student.
    Returns the number of activities assigned.
    """
    try:
        # Get all activities for this classroom
        # 1. Activities directly linked via classroom_id
        direct_activities_result = supabase.table('learning_activities').select('activity_id, activity_type').eq('classroom_id', classroom_id).execute()
        direct_activity_ids = []
        activity_question_counts = {}
        if direct_activities_result.data:
            for act in direct_activities_result.data:
                activity_id = act['activity_id']
                direct_activity_ids.append(activity_id)
                # Get question count (conversational activities don't have questions)
                if act.get('activity_type') == 'conversational':
                    activity_question_counts[activity_id] = None
                else:
                    questions_result = supabase.table('activity_questions').select('question_id').eq('activity_id', activity_id).execute()
                    activity_question_counts[activity_id] = len(questions_result.data) if questions_result.data else 0
        
        # 2. Activities linked via documents (document-based activities)
        docs_result = supabase.table('teacher_documents').select('document_id').eq('classroom_id', classroom_id).execute()
        document_ids = [doc['document_id'] for doc in (docs_result.data or [])]
        doc_activity_ids = []
        if document_ids:
            doc_activities_result = supabase.table('learning_activities').select('activity_id, activity_type').in_('document_id', document_ids).execute()
            if doc_activities_result.data:
                for act in doc_activities_result.data:
                    if act['activity_id'] not in direct_activity_ids:  # Avoid duplicates
                        activity_id = act['activity_id']
                        doc_activity_ids.append(activity_id)
                        # Get question count
                        if act.get('activity_type') == 'conversational':
                            activity_question_counts[activity_id] = None
                        else:
                            questions_result = supabase.table('activity_questions').select('question_id').eq('activity_id', activity_id).execute()
                            activity_question_counts[activity_id] = len(questions_result.data) if questions_result.data else 0
        
        # 3. Activities linked via metadata/settings (fallback for conversational activities)
        # Only check if we haven't found activities via other methods (performance optimization)
        if not direct_activity_ids and not doc_activity_ids:
            all_activities_result = supabase.table('learning_activities').select('activity_id, metadata, settings, activity_type').limit(500).execute()
            metadata_activity_ids = []
            if all_activities_result.data:
                for act in all_activities_result.data:
                    metadata = act.get('metadata') or act.get('settings') or {}
                    if metadata.get('classroom_id') == classroom_id:
                        if act['activity_id'] not in direct_activity_ids and act['activity_id'] not in doc_activity_ids:
                            activity_id = act['activity_id']
                            metadata_activity_ids.append(activity_id)
                            # Get question count if conversational (usually 0)
                            if act.get('activity_type') == 'conversational' or act.get('metadata', {}).get('conversational') or act.get('settings', {}).get('conversational'):
                                activity_question_counts[activity_id] = None
                            else:
                                questions_result = supabase.table('activity_questions').select('question_id').eq('activity_id', activity_id).execute()
                                activity_question_counts[activity_id] = len(questions_result.data) if questions_result.data else 0
        else:
            metadata_activity_ids = []
        
        # Combine all activity IDs
        all_activity_ids = list(set(direct_activity_ids + doc_activity_ids + metadata_activity_ids))
        
        # Get document_id for document-based activities
        doc_activities_with_docs = {}
        if document_ids:
            doc_acts_result = supabase.table('learning_activities').select('activity_id, document_id').in_('document_id', document_ids).execute()
            if doc_acts_result.data:
                for act in doc_acts_result.data:
                    doc_activities_with_docs[act['activity_id']] = act.get('document_id')
        
        # Assign activities to the student
        assignments = []
        for activity_id in all_activity_ids:
            # Check if already assigned
            existing = supabase.table('student_activities').select('student_activity_id').eq('activity_id', activity_id).eq('student_id', student_id).execute()
            
            if not existing.data or len(existing.data) == 0:
                assignment_data = {
                    'activity_id': activity_id,
                    'student_id': student_id,
                    'status': 'assigned',
                    'total_questions': activity_question_counts.get(activity_id),
                    'responses': {}
                }
                # Add document_id if this is a document-based activity
                if activity_id in doc_activities_with_docs:
                    assignment_data['document_id'] = doc_activities_with_docs[activity_id]
                
                assignments.append(assignment_data)
        
        # Insert all assignments
        if assignments:
            assign_result = supabase.table('student_activities').insert(assignments).execute()
            return len(assign_result.data) if assign_result.data else 0
        
        return 0
    except Exception as e:
        import traceback
        print(f"Error syncing activities for student {student_id} in classroom {classroom_id}: {e}")
        print(traceback.format_exc())
        return 0

@router.get("/activities")
async def get_student_activities(
    classroom_id: Optional[str] = None,
    status: Optional[str] = None,
    sync: Optional[str] = None,  # Query param comes as string, check for 'true'
    user: dict = Depends(get_current_student)
):
    """Get activities assigned to the student. Optionally syncs missing activities."""
    try:
        supabase = get_supabase_client()
        
        # Only sync if explicitly requested (for initial load or manual refresh)
        should_sync = sync and sync.lower() == 'true'
        if classroom_id and should_sync:
            try:
                enrollment_check = supabase.table('student_enrollments').select('enrollment_id').eq('classroom_id', classroom_id).eq('student_id', user['id']).single().execute()
                if enrollment_check.data:
                    synced_count = sync_classroom_activities_for_student(supabase, user['id'], classroom_id)
                    if synced_count > 0:
                        print(f"Auto-synced {synced_count} missing activities for student {user['id']} in classroom {classroom_id}")
            except Exception as sync_error:
                print(f"Warning: Failed to sync activities: {sync_error}")
        
        # Optimized query - fetch only what we need
        if classroom_id:
            # Get document IDs for this classroom (single query)
            docs_result = supabase.table('teacher_documents').select('document_id').eq('classroom_id', classroom_id).execute()
            doc_ids = [d['document_id'] for d in (docs_result.data or [])]
            
            # Get activity IDs for this classroom (single query)
            try:
                classroom_activities_result = supabase.table('learning_activities').select('activity_id').eq('classroom_id', classroom_id).execute()
                classroom_activity_ids = [a['activity_id'] for a in (classroom_activities_result.data or [])]
            except:
                # Fallback: check metadata (but limit to recent activities for performance)
                classroom_activities_result = supabase.table('learning_activities').select('activity_id, metadata, settings').limit(1000).execute()
                classroom_activity_ids = []
                for act in (classroom_activities_result.data or []):
                    metadata = act.get('metadata') or act.get('settings') or {}
                    if metadata.get('classroom_id') == classroom_id:
                        classroom_activity_ids.append(act['activity_id'])
            
            if not doc_ids and not classroom_activity_ids:
                return {"activities": []}
            
            # Build optimized query with filters
            query = supabase.table('student_activities').select(
                'student_activity_id, activity_id, document_id, status, score, feedback, started_at, completed_at, total_questions, learning_activities(title, description, activity_type)'
            ).eq('student_id', user['id'])
            
            # Filter by activity_id if we have classroom activity IDs
            if classroom_activity_ids:
                query = query.in_('activity_id', classroom_activity_ids[:100])  # Limit to prevent query size issues
            
            # Filter by document_id if we have document IDs
            if doc_ids:
                if classroom_activity_ids:
                    # Use OR logic: fetch both sets and combine
                    doc_query = supabase.table('student_activities').select(
                        'student_activity_id, activity_id, document_id, status, score, feedback, started_at, completed_at, total_questions, learning_activities(title, description, activity_type)'
                    ).eq('student_id', user['id']).in_('document_id', doc_ids[:100])
                    
                    if status:
                        doc_query = doc_query.eq('status', status)
                    
                    doc_result = doc_query.execute()
                    doc_activities = doc_result.data if doc_result.data else []
                    
                    if status:
                        query = query.eq('status', status)
                    
                    result = query.execute()
                    activities = result.data if result.data else []
                    
                    # Combine and deduplicate
                    seen_ids = set()
                    combined = []
                    for act in activities + doc_activities:
                        act_id = act.get('student_activity_id')
                        if act_id and act_id not in seen_ids:
                            seen_ids.add(act_id)
                            combined.append(act)
                    activities = combined
                else:
                    # Only document-based activities
                    query = query.in_('document_id', doc_ids[:100])
                    if status:
                        query = query.eq('status', status)
                    result = query.execute()
                    activities = result.data if result.data else []
            else:
                # Only classroom activity IDs
                if status:
                    query = query.eq('status', status)
                result = query.execute()
                activities = result.data if result.data else []
        else:
            # No classroom filter - get all activities for student
            query = supabase.table('student_activities').select(
                'student_activity_id, activity_id, document_id, status, score, feedback, started_at, completed_at, total_questions, learning_activities(title, description, activity_type)'
            ).eq('student_id', user['id'])
            
            if status:
                query = query.eq('status', status)
            
            result = query.execute()
            activities = result.data if result.data else []
        
        # Sort activities: in_progress/completed first, then by started_at or completed_at
        activities.sort(key=lambda x: (
            0 if x.get('status') in ['in_progress', 'completed'] else 1,
            x.get('started_at') or x.get('completed_at') or '',
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
        
        # CRITICAL: If student response is just "okay", "ok", "yes", "sure", etc., 
        # don't change phase - these are acknowledgments, not phase triggers
        if request.student_response:
            response_lower = request.student_response.lower().strip()
            casual_acknowledgments = ['okay', 'ok', 'yes', 'yep', 'yeah', 'sure', 'alright', 'got it', 'i see', 'i understand']
            if response_lower in casual_acknowledgments:
                # Don't change phase based on casual acknowledgment
                # If we're in teaching phase, stay in teaching phase
                # If we're in questioning phase, stay in questioning phase
                # Only allow phase changes from explicit readiness phrases
                pass  # Keep current phase
        
        # Get current question if in questioning phase
        current_question = None
        if teaching_phase == "questioning" and request.current_question_index is not None:
            if questions and 0 <= request.current_question_index < len(questions):
                current_question = questions[request.current_question_index]
        
        # Check if student's answer is correct (for questioning phase)
        is_answer_correct = False
        if teaching_phase == "questioning" and current_question:
            correct_answer = current_question.get('correct_answer')
            
            # Get student response from request or last user message in conversation
            student_response = request.student_response.strip() if request.student_response else ""
            if not student_response and request.conversation_history:
                # Get the last user message
                for msg in reversed(request.conversation_history):
                    if msg.get('role') == 'user':
                        student_response = msg.get('content', '').strip()
                        break
            
            if correct_answer and student_response:
                import re
                # Normalize both answers for comparison
                correct_normalized = str(correct_answer).strip().lower()
                student_normalized = student_response.lower()
                
                # Remove common words/phrases that don't affect correctness
                student_normalized = re.sub(r'\b(the answer is|answer|equals|is|x\s*=\s*)', '', student_normalized).strip()
                
                # Check for direct match
                if student_normalized == correct_normalized:
                    is_answer_correct = True
                else:
                    # Extract numbers from both
                    correct_numbers = re.findall(r'-?\d+\.?\d*', correct_normalized)
                    student_numbers = re.findall(r'-?\d+\.?\d*', student_normalized)
                    
                    if correct_numbers:
                        correct_num = correct_numbers[0]
                        # Check various formats
                        # Direct number match
                        if correct_num in student_numbers:
                            is_answer_correct = True
                        # "x=3" or "x = 3" format
                        elif re.search(rf'x\s*=\s*{re.escape(correct_num)}', student_normalized):
                            is_answer_correct = True
                        # "the answer is 3" format
                        elif re.search(rf'(answer|equals|is)\s+{re.escape(correct_num)}', student_normalized):
                            is_answer_correct = True
                        # Check if student response ends with the correct number
                        elif student_numbers and student_numbers[-1] == correct_num:
                            is_answer_correct = True
        
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
                activity_metadata = activity.get('metadata', {})
                settings = activity.get('settings', {})
                teaching_style = settings.get('teaching_style') or activity_metadata.get('teaching_style') or 'guided'
                difficulty = activity.get('difficulty', 'intermediate')
                
                # Get all teaching examples for this teacher (applies to all activities)
                teaching_examples = []
                try:
                    teacher_id = activity.get('teacher_id')
                    
                    # Get all examples for this teacher (applies globally to all activities)
                    examples_result = supabase.table('teaching_examples').select('*').eq('teacher_id', teacher_id).order('created_at', desc=True).limit(10).execute()
                    teaching_examples = examples_result.data if examples_result.data else []
                except Exception as e:
                    print(f"Error fetching teaching examples: {e}")
                    teaching_examples = []
                
                # Use activity-specific fine-tuning if examples are available
                if teaching_examples:
                    topic = settings.get('topic') or activity_metadata.get('topic') or activity.get('title', '')
                    
                    # Extract student input
                    student_input = request.student_response
                    if not student_input and request.conversation_history:
                        for msg in reversed(request.conversation_history):
                            if msg.get('role') == 'user':
                                student_input = msg.get('content', '')
                                break
                    if not student_input:
                        student_input = ''
                    
                    prompt = format_activity_specific_finetuned_prompt(
                        student_input=student_input,
                        teaching_examples=teaching_examples,
                        activity_id=request.activity_id,
                        activity_title=activity.get('title', 'Math Activity'),
                        activity_description=activity.get('description', ''),
                        teaching_style=teaching_style,
                        difficulty=difficulty,
                        topic=topic,
                        conversation_history=request.conversation_history,
                        teaching_phase=teaching_phase
                    )
                else:
                    # Fallback to regular prompt without fine-tuning
                    prompt = format_conversational_tutor_prompt(
                        activity_title=activity.get('title', 'Math Activity'),
                        activity_description=activity.get('description', ''),
                        questions=questions,
                        conversation_history=request.conversation_history,
                        current_question_index=request.current_question_index,
                        student_response=request.student_response,
                        current_question=current_question,
                        teaching_phase=teaching_phase,
                        teaching_style=teaching_style,
                        difficulty=difficulty
                    )
        else:
            # Use regular prompt for non-document-based activities
            activity_metadata = activity.get('metadata', {})
            settings = activity.get('settings', {})
            teaching_style = settings.get('teaching_style') or activity_metadata.get('teaching_style') or 'guided'
            difficulty = activity.get('difficulty', 'intermediate')
            
            # Get all teaching examples for this teacher (applies to all activities)
            teaching_examples = []
            try:
                teacher_id = activity.get('teacher_id')
                
                # Get all examples for this teacher (applies globally to all activities)
                examples_result = supabase.table('teaching_examples').select('*').eq('teacher_id', teacher_id).order('created_at', desc=True).limit(10).execute()
                teaching_examples = examples_result.data if examples_result.data else []
            except Exception as e:
                print(f"Error fetching teaching examples: {e}")
                teaching_examples = []
            
            # Use activity-specific fine-tuning if examples are available
            if teaching_examples:
                # Get topic from settings/metadata/title
                topic = settings.get('topic') or activity_metadata.get('topic') or activity.get('title', '')
                
                # Extract student input from conversation history or student response
                student_input = request.student_response
                if not student_input and request.conversation_history:
                    # Get the last user message
                    for msg in reversed(request.conversation_history):
                        if msg.get('role') == 'user':
                            student_input = msg.get('content', '')
                            break
                if not student_input:
                    student_input = ''
                
                prompt = format_activity_specific_finetuned_prompt(
                    student_input=student_input,
                    teaching_examples=teaching_examples,
                    activity_id=request.activity_id,
                    activity_title=activity.get('title', 'Math Activity'),
                    activity_description=activity.get('description', ''),
                    teaching_style=teaching_style,
                    difficulty=difficulty,
                    topic=topic,
                    conversation_history=request.conversation_history,
                    teaching_phase=teaching_phase
                )
            else:
                # Fallback to regular prompt without fine-tuning
                prompt = format_conversational_tutor_prompt(
                    activity_title=activity.get('title', 'Math Activity'),
                    activity_description=activity.get('description', ''),
                    questions=questions,
                    conversation_history=request.conversation_history,
                    current_question_index=request.current_question_index,
                    student_response=request.student_response,
                    current_question=current_question,
                    teaching_phase=teaching_phase,
                    teaching_style=teaching_style,
                    difficulty=difficulty
                )
        
        # Add explicit correctness instruction to prompt if answer is correct
        if is_answer_correct and teaching_phase == "questioning":
            correctness_instruction = "\n\n**CRITICAL**: The student's answer is CORRECT. Acknowledge this immediately with praise (e.g., 'That's correct!', 'Exactly right!', 'Perfect!') and move forward. DO NOT ask them to double-check, verify, or confirm - they already got it right. Either move to the next question or provide an extension."
            prompt = prompt + correctness_instruction
        
        ai_response = generator.generate_response(
            prompt=prompt,
            temperature=0.85,  # Higher temperature for more creative, engaging, and natural responses
            max_tokens=3000  # Reduced by 25% for faster response times
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
            
            # Pattern: \times (multiplication) - wrap expressions with \times
            # Match patterns like: 2\times2, A\times B, 2\times2 matrix, etc.
            # First, protect already-wrapped expressions to avoid double-wrapping
            # Then match: number\timesnumber, letter\timesletter, number\timesletter, letter\timesnumber
            text = re.sub(r'(?<!\$)(\d+)\\times(\d+)', r'$\1\\times\2$', text)
            text = re.sub(r'(?<!\$)([A-Za-z])\\times([A-Za-z])', r'$\1\\times\2$', text)
            text = re.sub(r'(?<!\$)(\d+)\\times([A-Za-z])', r'$\1\\times\2$', text)
            text = re.sub(r'(?<!\$)([A-Za-z])\\times(\d+)', r'$\1\\times\2$', text)
            # Catch more complex patterns like "2\times2 matrix" - wrap just the math part
            text = re.sub(r'(?<!\$)([^\s$]+)\\times([^\s$]+)(?=\s|$|\.|,|;|:|\))', r'$\1\\times\2$', text)
            
            # Pattern: \cdot (dot multiplication) - similar patterns
            text = re.sub(r'(?<!\$)(\d+)\\cdot(\d+)', r'$\1\\cdot\2$', text)
            text = re.sub(r'(?<!\$)([A-Za-z])\\cdot([A-Za-z])', r'$\1\\cdot\2$', text)
            
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
            # Only trigger on explicit confirmation, not casual "yes" or "okay"
            if request.student_response:
                response_lower = request.student_response.lower().strip()
                # More specific triggers - avoid casual "yes" or "okay"
                explicit_confirmations = ['correct', 'right', 'got it', 'i got it', 'that\'s right', 'exactly']
                if any(phrase in response_lower for phrase in explicit_confirmations):
                    next_question_index = (request.current_question_index or 0) + 1 if request.current_question_index is not None else 0
        elif teaching_phase == "ready_check":
            # Only trigger on explicit readiness phrases, not casual "okay" or "yes"
            if request.student_response:
                response_lower = request.student_response.lower().strip()
                # Explicit readiness phrases - must be clear intent to start questions
                readiness_phrases = [
                    'ready', 'i\'m ready', 'i am ready', 'ready to start', 'ready for questions',
                    'let\'s start', 'let\'s begin', 'start questions', 'begin questions',
                    'yes, i\'m ready', 'yes, ready', 'yes i\'m ready'
                ]
                # Check if response contains a readiness phrase AND is not just casual "okay" or "yes"
                is_explicit_ready = any(phrase in response_lower for phrase in readiness_phrases)
                # Don't trigger on standalone "okay", "yes", "ok", "yep" - these are too casual
                is_casual_response = response_lower in ['okay', 'ok', 'yes', 'yep', 'yeah', 'sure', 'alright']
                
                if is_explicit_ready and not is_casual_response:
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
        
        # Always save score - use provided score or default to 0
        score_to_save = request.score if request.score is not None else 0
        # Ensure score is a valid number and explicitly set it
        try:
            score_value = round(float(score_to_save), 2)
            # Ensure score is between 0 and 100
            score_value = max(0, min(100, score_value))
            update_data['score'] = score_value
            print(f"DEBUG: Saving score {score_value} for student_activity_id {student_activity_id}")
        except (ValueError, TypeError) as e:
            print(f"ERROR: Invalid score value {score_to_save}: {e}")
            update_data['score'] = 0
        
        # Always save feedback - use provided feedback or generate dynamically using AI
        if request.feedback and request.feedback.strip():
            update_data['feedback'] = request.feedback
        else:
            # Dynamically generate feedback using AI based on conversation and score
            try:
                # Get activity details for context
                activity_result = supabase.table('learning_activities').select('*').eq('activity_id', student_activity_result.data.get('activity_id')).single().execute()
                activity = activity_result.data if activity_result.data else {}
                metadata = activity.get('metadata', {})
                topic = metadata.get('topic', activity.get('title', 'this topic'))
                difficulty = activity.get('difficulty', 'intermediate')
                
                # Format conversation history
                conversation_text = "\n".join([
                    f"{msg.get('role', 'user').title()}: {msg.get('content', '')}"
                    for msg in request.conversation_history[-10:]  # Last 10 messages for context
                ])
                
                # Generate dynamic feedback using AI
                prompt = f"""Generate personalized, encouraging feedback for a student who completed a math learning activity.

TOPIC: {topic}
DIFFICULTY: {difficulty}
STUDENT SCORE: {score_to_save}%
CONVERSATION SUMMARY:
{conversation_text}

Generate feedback that:
1. Acknowledges their effort and specific things they did well
2. Provides constructive guidance based on their score and conversation
3. Suggests specific next steps for improvement
4. Is encouraging and supportive
5. Is personalized to their actual work in the conversation

Keep it concise (2-3 sentences) but meaningful. Reference specific aspects of their work if possible.

Feedback:"""
                
                generator = ResponseGenerator()
                ai_feedback = generator.generate_response(
                    prompt=prompt,
                    temperature=0.7,
                    max_tokens=200
                )
                
                # Clean up the feedback (remove quotes if wrapped)
                ai_feedback = ai_feedback.strip().strip('"').strip("'")
                update_data['feedback'] = ai_feedback if ai_feedback else f"Activity completed with a score of {score_to_save}%. Continue practicing to improve your understanding."
                
            except Exception as e:
                # Fallback: generate simple feedback if AI generation fails
                print(f"Error generating dynamic feedback: {e}")
                # Still generate context-aware feedback without AI
                conversation_summary = " ".join([
                    msg.get('content', '')[:50] 
                    for msg in request.conversation_history[-3:] 
                    if msg.get('role') == 'user'
                ])
                
                if score_to_save >= 80:
                    update_data['feedback'] = f"Excellent work! You demonstrated strong understanding of {topic}. Your score of {score_to_save}% reflects your solid grasp of the concepts."
                elif score_to_save >= 60:
                    update_data['feedback'] = f"Good effort! You showed understanding of {topic} with a score of {score_to_save}%. Keep practicing to strengthen your skills."
                elif score_to_save > 0:
                    update_data['feedback'] = f"You completed the activity on {topic} with a score of {score_to_save}%. Review the material and try similar problems to improve."
                else:
                    update_data['feedback'] = f"Activity on {topic} completed. Focus on practicing problems and demonstrating mathematical work to improve your understanding."
        
        # Save final conversation and mark as completed
        print(f"DEBUG: Updating student_activity with data: {update_data}")
        result = supabase.table('student_activities').update(update_data).eq('student_activity_id', student_activity_id).execute()
        
        # Verify the update worked
        if result.data:
            print(f"DEBUG: Update successful. Saved score: {result.data[0].get('score')}, feedback: {result.data[0].get('feedback')[:50] if result.data[0].get('feedback') else 'None'}...")
        else:
            print(f"WARNING: Update returned no data")
        
        return {"success": True, "message": "Activity completed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/{activity_id}/introduction")
async def get_activity_introduction(
    activity_id: str,
    user: dict = Depends(get_current_student),
    authorization: Optional[str] = Header(None)
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
        
        # Check both metadata and settings for activity details
        metadata = activity.get('metadata', {})
        settings = activity.get('settings', {})
        
        # Handle JSON string settings if needed
        if isinstance(settings, str):
            try:
                import json
                settings = json.loads(settings)
            except:
                settings = {}
        if isinstance(metadata, str):
            try:
                import json
                metadata = json.loads(metadata)
            except:
                metadata = {}
        
        # Get activity details from various possible locations
        topic = settings.get('topic') or metadata.get('topic') or activity.get('title', 'this topic')
        
        # Get learning objectives
        learning_objectives = activity.get('learning_objectives', []) or settings.get('learning_objectives', []) or metadata.get('learning_objectives', [])
        
        # Format learning objectives summary
        if learning_objectives:
            if isinstance(learning_objectives, list) and len(learning_objectives) > 0:
                learning_objective_summary = ', '.join([str(obj) for obj in learning_objectives[:3]])  # Limit to first 3
            elif isinstance(learning_objectives, str):
                learning_objective_summary = learning_objectives
            else:
                learning_objective_summary = topic  # Fallback to topic if no objectives
        else:
            learning_objective_summary = topic  # Fallback to topic if no objectives
        
        # Get activity title
        activity_title = activity.get('title', 'Math Activity')
        
        # Get student name from JWT token user_metadata and extract first name only
        student_first_name = 'Student'  # Default fallback
        try:
            if authorization and authorization.startswith("Bearer "):
                token = authorization.replace("Bearer ", "")
                from lib.jwt_verify import verify_supabase_token
                user_info = verify_supabase_token(token)
                if user_info:
                    user_metadata = user_info.get('user_metadata', {})
                    # Try to get name from user_metadata
                    full_name = user_metadata.get('name') or user_metadata.get('full_name') or user_metadata.get('display_name')
                    # Extract first name only (split by space and take first part)
                    if full_name:
                        student_first_name = full_name.split()[0].strip()
                    # If no name in metadata, use email username
                    if not student_first_name or student_first_name == '':
                        email = user_info.get('email') or user.get('email', '')
                        if email:
                            student_first_name = email.split('@')[0].capitalize()
        except Exception as e:
            # Fallback: use email username
            email = user.get('email', '')
            if email:
                student_first_name = email.split('@')[0].capitalize()
        
        # Ensure we have a valid name
        if not student_first_name or student_first_name == '':
            student_first_name = 'Student'
        
        # Get teaching style from settings or metadata (check nested structures too)
        teaching_style = None
        if isinstance(settings, dict):
            teaching_style = settings.get('teaching_style')
        if not teaching_style and isinstance(metadata, dict):
            teaching_style = metadata.get('teaching_style')
        # Also check if settings itself is a dict with nested structure
        if not teaching_style and isinstance(settings, dict):
            # Check for nested structures
            if 'topic' in settings and isinstance(settings.get('topic'), dict):
                teaching_style = settings.get('topic', {}).get('teaching_style')
        
        # Default to guided if not found
        if not teaching_style:
            teaching_style = 'guided'
        
        # Define brief teaching style explanations for the introduction
        teaching_style_explanations = {
            'socratic': 'I\'ll guide you by asking questions to help you discover the answers yourself, rather than giving you direct solutions.',
            'direct': 'I\'ll explain concepts clearly and directly, providing step-by-step instructions and clear explanations.',
            'guided': 'I\'ll work through problems with you step-by-step, providing guidance and support as you learn.',
            'discovery': 'I\'ll encourage you to explore and discover concepts yourself, with minimal guidance to help you think independently.',
            'teacher': 'I\'ll teach you step-by-step in a clear, structured way, checking your understanding as we go and adapting to what you need.'
        }
        
        # Get the teaching style explanation
        teaching_explanation = teaching_style_explanations.get(teaching_style.lower() if isinstance(teaching_style, str) else 'guided', teaching_style_explanations['guided'])
        
        # Format introduction without teaching style explanation - make activity title stand out
        introduction = f"Hi {student_first_name}! I'm MathMentor, your math tutor. Today we'll be working on **{activity_title}**. This will help you practice {learning_objective_summary}. Take your time, try things out, and don't worry about getting everything right the first time - this activity is here to help you learn! When you're ready, let's begin!"
        
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
        settings = activity.get('settings', {})
        
        # Get topic from settings (where conversational activities store it), then metadata, then title
        topic = settings.get('topic') or metadata.get('topic') or activity.get('title', 'this topic')
        teaching_style = settings.get('teaching_style') or metadata.get('teaching_style') or 'guided'
        difficulty = activity.get('difficulty', 'intermediate')
        
        # Get teacher's description - this is what the teacher wants the AI to teach
        description = activity.get('description', '')
        # If description is empty or is a default fallback, don't use it
        default_description = f"Conversational learning about {topic}"
        if not description or description.strip() == '' or description.strip() == default_description:
            description = None
        
        # Get all teaching examples for this teacher (applies to all activities)
        teaching_examples = []
        try:
            teacher_id = activity.get('teacher_id')
            
            # Get all examples for this teacher (applies globally to all activities)
            examples_result = supabase.table('teaching_examples').select('*').eq('teacher_id', teacher_id).order('created_at', desc=True).limit(10).execute()
            teaching_examples = examples_result.data if examples_result.data else []
        except Exception as e:
            print(f"Error fetching teaching examples: {e}")
            teaching_examples = []
        
        # Filter examples by topic (for backward compatibility)
        relevant_examples = [ex for ex in teaching_examples if topic.lower() in ex.get('topic', '').lower()][:3]
        if not relevant_examples:
            relevant_examples = teaching_examples[:3]
        
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
        
        # Define teaching style guidance
        teaching_style_guidance = {
            'socratic': 'SOCRATIC STYLE: Ask questions to guide discovery. Don\'t give direct answers - help students think through problems by asking probing questions. Encourage them to explain their reasoning. Example: "What do you think happens when...?" "Why might that be?" "Can you explain your thinking?"',
            'direct': 'DIRECT STYLE: Explain concepts clearly and directly. Provide clear explanations, definitions, and step-by-step instructions. Be explicit about methods and procedures. Example: "Here\'s how we solve this: First... then... finally..."',
            'guided': 'GUIDED STYLE: Provide step-by-step guidance with explanations. Break down problems into manageable steps, explain each step, and provide support as needed. Balance between explaining and letting students work. Example: "Let\'s work through this together. First, we need to..."',
            'discovery': 'DISCOVERY STYLE: Let students explore and discover concepts themselves. Provide minimal guidance, ask open-ended questions, and let them experiment. Guide them when stuck but encourage independent thinking. Example: "Try working with this and see what patterns you notice..."',
            'teacher': 'TEACHER STYLE: Act as a traditional teacher who listens to student needs and requests. Explain concepts step-by-step in a clear, structured manner. Use confident, authoritative language. Check understanding with statements like "Now explain these steps in your own words" rather than asking "Does that make sense?" Give students opportunities to answer questions and demonstrate understanding. Be patient, encouraging, and responsive to what the student wants to learn. Example: "Let me explain this step by step. First, [explanation with display math]. Now, [next step with display math]. Now explain these steps in your own words."'
        }
        
        # Define difficulty level guidance
        difficulty_guidance = {
            'beginner': 'BEGINNER LEVEL: Use simple language, basic examples, and fundamental concepts. Avoid advanced terminology. Break everything into very small steps. Use concrete examples and analogies. Be very patient and encouraging.',
            'intermediate': 'INTERMEDIATE LEVEL: Use standard mathematical language and notation. Include both basic and moderately complex examples. Balance between explanation and practice. Use appropriate technical terms.',
            'advanced': 'ADVANCED LEVEL: Use precise mathematical language and notation. Include complex examples and applications. Can move faster through concepts. Expect deeper understanding and abstract thinking.'
        }
        
        style_instruction = teaching_style_guidance.get(teaching_style, teaching_style_guidance['guided'])
        difficulty_instruction = difficulty_guidance.get(difficulty, difficulty_guidance['intermediate'])
        
        if request.current_phase == 'introduction':
            teacher_instructions = f"\n\nTEACHER'S INSTRUCTIONS (FOLLOW THESE EXACTLY):\n{description}\n" if description else ""
            prompt = f"""You are starting a learning session about: {topic}

**CRITICAL - TEACHING STYLE (YOU MUST USE THIS EXACTLY):**
{style_instruction}

**CRITICAL - DIFFICULTY LEVEL (YOU MUST ADJUST TO THIS):**
{difficulty_instruction}

{teacher_instructions}
Create a welcoming introduction that:
1. Greets the student warmly
2. **IMPORTANT**: Explain that you've been programmed by their teacher to teach using the teacher's specific methods and instructions
3. Explains what you'll learn together - use the teacher's instructions above to guide what to teach
4. Uses the {teaching_style} teaching style as specified
5. Adjusts complexity to {difficulty} level
6. Sets expectations for the conversation
7. Makes them feel comfortable to ask questions

Keep it friendly, inviting, and BRIEF (2-3 sentences maximum)!"""
        
        elif request.current_phase == 'teach':
            teacher_instructions = f"""
TEACHER'S INSTRUCTIONS (THIS IS WHAT YOU MUST TEACH - FOLLOW THESE EXACTLY):
{description}

CRITICAL: The teacher has specifically instructed you to teach: "{description}"
Your teaching MUST align with what the teacher wants students to learn. Use this as your primary guide for what concepts to cover, how to explain them, and what examples to use.
""" if description else ""
            
            prompt = f"""You are in the TEACHING phase about: {topic}

**CRITICAL - TEACHING STYLE (YOU MUST USE THIS EXACTLY):**
{style_instruction}

**CRITICAL - DIFFICULTY LEVEL (YOU MUST ADJUST TO THIS):**
{difficulty_instruction}

{teacher_instructions}
{examples_context}

CONVERSATION SO FAR:
{conversation_text}

STUDENT'S LATEST INPUT:
"{request.student_input}"

Your task: Teach the concept clearly.
- Use {teaching_style} teaching style EXACTLY as specified above - this determines HOW you teach
- Adjust to {difficulty} difficulty level EXACTLY as specified above - this determines complexity and depth
- Follow the teacher's instructions above EXACTLY - this is what they want students to learn
- Explain step-by-step according to what the teacher specified
- Use examples that align with the teacher's teaching goals and difficulty level
- Check for understanding using the appropriate style
- Use $...$ for math notation
- Keep it conversational
- Be BRIEF (2-4 sentences maximum)

Respond to continue teaching:"""
        
        elif request.current_phase == 'practice':
            teacher_instructions = f"""
TEACHER'S INSTRUCTIONS (REMEMBER WHAT THE TEACHER WANTS STUDENTS TO LEARN):
{description}

CRITICAL: Guide practice based on what the teacher wants students to learn: "{description}"
Make sure practice questions and guidance align with the teacher's learning objectives.
""" if description else ""
            
            prompt = f"""You are in the PRACTICE phase. The student has learned about {topic}.

**CRITICAL - TEACHING STYLE (YOU MUST USE THIS EXACTLY):**
{style_instruction}

**CRITICAL - DIFFICULTY LEVEL (YOU MUST ADJUST TO THIS):**
{difficulty_instruction}

{teacher_instructions}
{examples_context}

CONVERSATION HISTORY:
{conversation_text}

STUDENT'S INPUT:
"{request.student_input}"

Your task: Guide practice without giving answers.
- Use {teaching_style} teaching style EXACTLY as specified above - this determines HOW you guide practice
- Adjust practice difficulty to {difficulty} level EXACTLY as specified above
- Focus practice on what the teacher wants students to learn (see instructions above)
- Ask questions appropriate to the teaching style and difficulty level
- Provide hints if stuck (style-appropriate)
- Encourage thinking using the specified teaching style
- Connect back to what was taught (aligned with teacher's instructions)
- Assess their approach
- Be BRIEF (2-3 sentences maximum)

Keep it conversational and supportive:"""
        
        elif request.current_phase == 'evaluate':
            teacher_instructions = f"""
TEACHER'S INSTRUCTIONS (EVALUATE BASED ON WHAT THE TEACHER WANTS STUDENTS TO LEARN):
{description}

CRITICAL: Assess whether the student has learned what the teacher specified: "{description}"
Your evaluation should focus on whether they understand the concepts the teacher wanted them to learn.
""" if description else ""
            
            prompt = f"""You are in the EVALUATION phase. Assess the student's understanding of {topic}.

**CRITICAL - TEACHING STYLE (YOU MUST USE THIS EXACTLY):**
{style_instruction}

**CRITICAL - DIFFICULTY LEVEL (YOU MUST ADJUST TO THIS):**
{difficulty_instruction}

{teacher_instructions}
{examples_context}

CONVERSATION HISTORY:
{conversation_text}

STUDENT'S INPUT:
"{request.student_input}"

Your task: Assess understanding through conversation.
- Use {teaching_style} teaching style EXACTLY as specified above - this determines HOW you assess
- Evaluate at {difficulty} difficulty level EXACTLY as specified above - adjust expectations accordingly
- Evaluate based on what the teacher wants students to learn (see instructions above)
- Ask assessment questions appropriate to the teaching style and difficulty level
- Listen to their explanations
- Provide constructive feedback
- Identify gaps in understanding related to the teacher's learning objectives
- Prepare to summarize their learning
- Be BRIEF (2-3 sentences maximum)

Be supportive but honest in assessment:"""
        
        else:
            teacher_instructions = f"\n\nTEACHER'S INSTRUCTIONS: {description}\n" if description else ""
            prompt = f"""Respond to the student naturally about {topic}.
{teacher_instructions}
Student: "{request.student_input}"

Response:"""
        
        # Generate response
        generator = ResponseGenerator()
        response = generator.generate_response(
            prompt=prompt,
            temperature=0.7,
            max_tokens=500  # Reduced for faster response times
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
        
        # Get questions for this activity to check correctness
        questions_result = supabase.table('activity_questions').select('*').eq('activity_id', request.activity_id).order('created_at').execute()
        questions = questions_result.data if questions_result.data else []
        
        # Extract student answers from conversation and check correctness
        import re
        answer_analysis = []
        for question in questions:
            question_text = question.get('question_text', '')
            correct_answer = question.get('correct_answer', '')
            question_type = question.get('question_type', 'short_answer')
            
            if not correct_answer:
                continue
            
            # Search conversation for student's answer to this question
            student_answer_found = None
            for msg in reversed(request.conversation_history):
                if msg.get('role') == 'user':
                    content = msg.get('content', '').lower()
                    # Check if this message might be answering the question
                    # Look for numbers or mathematical expressions
                    if re.search(r'\d+', content) or any(keyword in content for keyword in ['answer', 'equals', '=', 'x=']):
                        student_answer_found = msg.get('content', '').strip()
                        break
            
            # Check if answer is correct
            is_correct = False
            if student_answer_found and correct_answer:
                correct_normalized = str(correct_answer).strip().lower()
                student_normalized = student_answer_found.lower()
                
                # Remove common words/phrases
                student_normalized = re.sub(r'\b(the answer is|answer|equals|is|x\s*=\s*)', '', student_normalized).strip()
                
                # Check for direct match
                if student_normalized == correct_normalized:
                    is_correct = True
                else:
                    # Extract numbers and check
                    correct_numbers = re.findall(r'-?\d+\.?\d*', correct_normalized)
                    student_numbers = re.findall(r'-?\d+\.?\d*', student_normalized)
                    
                    if correct_numbers:
                        correct_num = correct_numbers[0]
                        if correct_num in student_numbers:
                            is_correct = True
                        elif re.search(rf'x\s*=\s*{re.escape(correct_num)}', student_normalized):
                            is_correct = True
                        elif re.search(rf'(answer|equals|is)\s+{re.escape(correct_num)}', student_normalized):
                            is_correct = True
                        elif student_numbers and student_numbers[-1] == correct_num:
                            is_correct = True
            
            answer_analysis.append({
                'question': question_text[:100],  # Truncate for prompt
                'correct_answer': correct_answer,
                'student_answer': student_answer_found or 'No answer provided',
                'is_correct': is_correct
            })
        
        # Build correctness summary
        total_questions = len(answer_analysis)
        correct_count = sum(1 for a in answer_analysis if a['is_correct'])
        answered_count = sum(1 for a in answer_analysis if a['student_answer'] != 'No answer provided')
        
        correctness_summary = ""
        if answer_analysis:
            correctness_summary = "\n\n**CRITICAL - ANSWER CORRECTNESS VERIFICATION:**\n"
            correctness_summary += f"Total questions: {total_questions}\n"
            correctness_summary += f"Questions answered: {answered_count}\n"
            correctness_summary += f"Correct answers: {correct_count}\n"
            correctness_summary += f"Incorrect/unanswered: {total_questions - correct_count}\n\n"
            correctness_summary += "**VERIFIED ANSWER ANALYSIS:**\n"
            for i, analysis in enumerate(answer_analysis, 1):
                status = "✓ CORRECT" if analysis['is_correct'] else ("✗ INCORRECT" if analysis['student_answer'] != 'No answer provided' else "? NOT ANSWERED")
                correctness_summary += f"Q{i}: {status} - Student said: '{analysis['student_answer'][:50]}' | Correct answer: '{analysis['correct_answer']}'\n"
            correctness_summary += "\n**CRITICAL**: Use this verified correctness data. Do NOT misdiagnose correct answers as incorrect.\n"
        
        conversation_text = "\n".join([
            f"{msg.get('role', 'user').title()}: {msg.get('content', '')}"
            for msg in request.conversation_history
        ])
        
        prompt = f"""Assess a student's understanding from this learning conversation. Be STRICT but FAIR - give appropriate scores based on actual mathematical work demonstrated AND verified answer correctness.

TOPIC: {topic}
DIFFICULTY: {difficulty}
CONVERSATION:
{conversation_text}
{correctness_summary}

**CRITICAL ASSESSMENT RULES:**
1. **FIRST**: Check the "VERIFIED ANSWER ANALYSIS" section above - it shows which answers are CORRECT vs INCORRECT
2. **NEVER** label a correct answer as incorrect - if the analysis shows "✓ CORRECT", acknowledge it as correct
3. **NEVER** invent errors that don't exist - only identify actual mistakes shown in the verified analysis
4. If a student correctly solved a problem (e.g., "4x + 6 = 18" → "x = 3"), acknowledge their correct work

ANALYSIS CRITERIA:
1. Conceptual understanding (0-25 points) - Assess based on demonstrations of understanding through examples, explanations, or solving problems
2. Application ability (0-25 points) - Assess based on attempts to solve problems or apply concepts
3. Problem-solving approach (0-25 points) - Assess based on working through problems, showing steps, and reasoning
4. Communication of ideas (0-25 points) - Assess based on explanations of mathematical thinking or reasoning

SCORING GUIDELINES:
- If conversation is ONLY greetings (hello, hi, thanks) with NO mathematical content: score MUST be 0%
- If conversation has NO numbers, equations, calculations, problem-solving attempts, or mathematical explanations: score MUST be 0%
- If they only ask questions without any mathematical work: score 0-20%
- If they attempt problems but make errors: score 30-70% (give credit for attempts and partial understanding)
- If they solve problems correctly with clear steps (verified in analysis above): score 70-90% (reward correct solutions appropriately)
- If they demonstrate deep understanding with multiple correct solutions and explanations: score 90-100%

**CRITICAL**: 
- Use the verified correctness data above - do NOT misdiagnose correct answers
- If the student got answers correct, acknowledge it in feedback
- Only identify actual errors shown in the verified analysis
- Check for mathematical indicators: numbers, equations, calculations, solving steps, problem attempts, mathematical explanations, formulas, or mathematical reasoning

If NO mathematical work is detected (only greetings, casual conversation, or non-mathematical questions), return score: 0

Return JSON: {{"score": <number 0-100>, "feedback": "<detailed feedback that accurately reflects verified correctness>"}}"""

        generator = ResponseGenerator()
        response = generator.generate_response(
            prompt=prompt,
            temperature=0.1,
            max_tokens=500  # Increased to allow for correctness analysis
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
                # Fallback: calculate score based on correctness
                base_score = (correct_count / total_questions * 100) if total_questions > 0 else 50
                assessment = {
                    "score": int(base_score),
                    "feedback": f"Answered {answered_count} of {total_questions} questions. {correct_count} correct. {'Good work on the problems you solved correctly!' if correct_count > 0 else 'Keep practicing to improve.'}"
                }
        except Exception as e:
            print(f"Error parsing assessment JSON: {e}")
            # Fallback: calculate score based on correctness
            base_score = (correct_count / total_questions * 100) if total_questions > 0 else 50
            assessment = {
                "score": int(base_score),
                "feedback": f"Answered {answered_count} of {total_questions} questions. {correct_count} correct. {'Good work on the problems you solved correctly!' if correct_count > 0 else 'Keep practicing to improve.'}"
            }
        
        return assessment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

