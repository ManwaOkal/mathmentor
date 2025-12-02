"""
Teacher API endpoints for classroom and document management.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Header, Query, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import uuid
import os
import asyncio
from datetime import datetime
from lib.supabase_client import get_supabase_client
from lib.auth_helpers import get_user_role, is_teacher, UserRole
from lib.storage import get_storage
from rag_engine.generator import ResponseGenerator
from rag_engine.prompts import format_document_question_generator, format_prompt_question_generator
from data_processing.smart_document_processor import SmartDocumentProcessor, DocumentBasedActivityGenerator
import json
import re

router = APIRouter(prefix="/api/teacher", tags=["teacher"])

# In-memory store for processing status (use Redis in production)
processing_tasks: Dict[str, Dict] = {}

# Request/Response Models
class CreateClassroomRequest(BaseModel):
    name: str
    description: Optional[str] = None

class ClassroomResponse(BaseModel):
    classroom_id: str
    teacher_id: str
    name: str
    description: Optional[str]
    join_code: str
    created_at: str
    updated_at: Optional[str] = None

class UploadDocumentRequest(BaseModel):
    classroom_id: str
    title: str
    description: Optional[str] = None
    generate_activities: bool = True
    chunking_strategy: str = "semantic"

class CreateActivityRequest(BaseModel):
    document_id: str
    title: str
    description: Optional[str] = None
    activity_type: str
    difficulty: str = "intermediate"
    num_questions: int = 10
    settings: Optional[dict] = {}

class CreateAsyncActivityRequest(BaseModel):
    document_id: str
    title: str
    difficulty: str = "intermediate"
    num_questions: int = 10
    classroom_id: Optional[str] = None
    use_ai_generation: bool = True

class TeachingExampleCreate(BaseModel):
    topic: str
    teacher_input: str
    desired_ai_response: str
    difficulty: str = "intermediate"
    teaching_style: str = "socratic"
    learning_objectives: List[str] = []
    assessment_criteria: List[str] = []

class TestAIRequest(BaseModel):
    student_input: str
    context_examples: Optional[List[dict]] = None

class TeachingFlowRequest(BaseModel):
    topic: str
    difficulty: str = "intermediate"
    teaching_style: str = "guided"
    learning_objectives: Optional[List[str]] = None
    assessment_criteria: Optional[List[str]] = None

class CreateConversationalActivityRequest(BaseModel):
    title: str
    description: Optional[str] = None
    topic: str
    difficulty: str = "intermediate"
    teaching_style: str = "guided"
    estimated_time_minutes: int = 15
    classroom_id: Optional[str] = None

# Helper function to get current teacher
async def get_current_teacher(authorization: Optional[str] = Header(None)):
    """Get current teacher user from Supabase JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = authorization.replace("Bearer ", "").strip()
    
    # Check if token is empty
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token is empty")
    
    # Try to verify Supabase JWT token
    from lib.jwt_verify import verify_supabase_token
    print(f"Teacher Auth: Verifying token (length: {len(token)}, preview: {token[:50]}...)")
    user_info = verify_supabase_token(token)
    
    if user_info and user_info.get("id"):
        user_id = user_info["id"]
        user_metadata = user_info.get("user_metadata", {})
        
        # Check if user is a teacher
        role = user_metadata.get("role", "student")
        print(f"Teacher Auth: User {user_id} has role {role}")
        
        if role.lower() not in ["teacher", "admin"]:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. User role is '{role}', but 'teacher' or 'admin' is required."
            )
        
        print(f"Teacher Auth: Authentication successful for user {user_id}")
        return {"id": user_id, "role": role.lower(), "email": user_info.get("email")}
    
    # Fallback: if token verification fails, check if it's a UUID (backward compatibility)
    import re
    uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
    if uuid_pattern.match(token):
        # Legacy support: assume UUID means teacher for now
        return {"id": token, "role": "teacher"}
    
    raise HTTPException(status_code=401, detail="Invalid or expired authentication token. Please log in again.")

@router.post("/classrooms", response_model=ClassroomResponse)
async def create_classroom(
    request: CreateClassroomRequest,
    user: dict = Depends(get_current_teacher)
):
    """Create a new classroom with auto-generated join code."""
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
        
        # Generate join code
        join_code = generate_join_code()
        
        # Create classroom using RPC function
        # The RPC function will automatically create the user if it doesn't exist
        try:
            result = supabase.rpc('create_classroom', {
                'p_teacher_id': user['id'],
                'p_name': request.name,
                'p_description': request.description
            }).execute()
        except Exception as rpc_error:
            # Check if RPC function doesn't exist
            error_str = str(rpc_error)
            if 'function' in error_str.lower() and 'does not exist' in error_str.lower():
                raise HTTPException(
                    status_code=500,
                    detail="Database function 'create_classroom' not found. Please run migrations: 003_teacher_student_platform.sql and 004_fix_teacher_user_creation.sql"
                )
            # Check for foreign key constraint error
            if 'foreign key constraint' in error_str.lower() or '23503' in error_str:
                raise HTTPException(
                    status_code=500,
                    detail=f"User not found in database. Please run migration 004_fix_teacher_user_creation.sql to enable auto-user creation. Error: {error_str}"
                )
            raise
        
        # Check for RPC errors
        if hasattr(result, 'error') and result.error:
            raise HTTPException(status_code=500, detail=f"RPC error: {result.error}")
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create classroom: No data returned from RPC")
        
        classroom_data = result.data[0]
        
        # Fetch full classroom data to get all fields
        full_classroom = supabase.table('classrooms').select('*').eq('classroom_id', classroom_data['classroom_id']).single().execute()
        
        if not full_classroom.data:
            raise HTTPException(status_code=500, detail="Failed to fetch created classroom")
        
        classroom = full_classroom.data
        
        return ClassroomResponse(
            classroom_id=classroom['classroom_id'],
            teacher_id=classroom.get('teacher_id', user['id']),
            name=classroom.get('name', request.name),
            description=classroom.get('description', request.description),
            join_code=classroom.get('join_code', classroom_data.get('join_code', '')),
            created_at=str(classroom.get('created_at', '')),
            updated_at=str(classroom.get('updated_at', classroom.get('created_at', '')))
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)

def generate_join_code() -> str:
    """Generate a unique 6-character join code."""
    import random
    import string
    
    supabase = get_supabase_client()
    
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # Check if code exists
        result = supabase.table('classrooms').select('join_code').eq('join_code', code).execute()
        if not result.data:
            return code

@router.get("/classrooms", response_model=List[ClassroomResponse])
async def get_teacher_classrooms(user: dict = Depends(get_current_teacher)):
    """Get all classrooms for the current teacher."""
    try:
        supabase = get_supabase_client()
        result = supabase.table('classrooms').select('*').eq('teacher_id', user['id']).order('created_at', desc=True).execute()
        
        if not result.data:
            return []
        
        return [
            ClassroomResponse(
                classroom_id=c['classroom_id'],
                teacher_id=c['teacher_id'],
                name=c['name'],
                description=c.get('description'),
                join_code=c['join_code'],
                created_at=str(c.get('created_at', '')),
                updated_at=str(c.get('updated_at', c.get('created_at', '')))
            )
            for c in result.data
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    user: dict = Depends(get_current_teacher)
):
    """Upload and process teacher document."""
    try:
        metadata_dict = json.loads(metadata)
        supabase = get_supabase_client()
        storage = get_storage()
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'txt'
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        
        # Read file content
        file_content = await file.read()
        
        # Upload to storage (Supabase Storage)
        try:
            file_url = await storage.upload_file(
                file_content=file_content,
                filename=unique_filename,
                content_type=file.content_type or 'application/octet-stream',
                folder="teacher-documents"
            )
        except Exception as storage_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to upload file to storage: {str(storage_error)}"
            )
        
        # Create document record
        document_data = {
            'teacher_id': user['id'],
            'classroom_id': metadata_dict.get('classroom_id'),
            'title': metadata_dict.get('title', file.filename),
            'description': metadata_dict.get('description'),
            'filename': file.filename,
            'file_url': file_url,
            'file_type': file.content_type or 'application/octet-stream',
            'file_size': len(file_content),
            'status': 'processing',
            'metadata': {
                'generate_activities': metadata_dict.get('generate_activities', True),
                'chunking_strategy': metadata_dict.get('chunking_strategy', 'semantic'),
                'storage_filename': unique_filename  # Store the unique filename for later deletion
            }
        }
        
        result = supabase.table('teacher_documents').insert(document_data).execute()
        
        if not result.data:
            # If database insert fails, try to clean up uploaded file
            try:
                await storage.delete_file(f"teacher-documents/{unique_filename}")
            except:
                pass
            raise HTTPException(status_code=500, detail="Failed to create document record")
        
        document_id = result.data[0]['document_id']
        
        # Trigger async document processing
        # Process document: extract text, chunk, generate embeddings, store chunks
        try:
            from tutoring.document_processor import DocumentProcessor
            processor = DocumentProcessor()
            
            # Process in background (non-blocking)
            asyncio.create_task(processor.process_document(document_id))
        except Exception as e:
            # If processing fails, log error but don't fail upload
            print(f"Warning: Could not start document processing: {e}")
            # Mark as ready anyway (processing can be retried later)
            try:
                supabase.table('teacher_documents').update({
                    'status': 'ready'
                }).eq('document_id', document_id).execute()
            except:
                pass
        
        return {
            "document_id": document_id,
            "status": "processing",
            "file_url": file_url,
            "message": "Document uploaded successfully. Processing in background..."
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/documents/{classroom_id}")
async def get_classroom_documents(
    classroom_id: str,
    user: dict = Depends(get_current_teacher)
):
    """Get all documents for a classroom."""
    try:
        supabase = get_supabase_client()
        result = supabase.table('teacher_documents').select('*').eq('classroom_id', classroom_id).eq('teacher_id', user['id']).order('uploaded_at', desc=True).execute()
        
        return {"documents": result.data if result.data else []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/{document_id}/process-intelligent")
async def process_document_intelligently(
    document_id: str,
    user: dict = Depends(get_current_teacher)
):
    """
    Process document using LLM to extract educational content intelligently.
    """
    try:
        supabase = get_supabase_client()
        
        # Get document
        doc_result = supabase.table('teacher_documents').select('*').eq('document_id', document_id).eq('teacher_id', user['id']).single().execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = doc_result.data
        
        # Check if OpenAI API key is available
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured. Cannot perform intelligent processing.")
        
        # Get document text from chunks
        chunks_result = supabase.table('document_chunks').select('content').eq('document_id', document_id).order('chunk_index').execute()
        
        if not chunks_result.data:
            raise HTTPException(status_code=400, detail="Document has no content. Please ensure document was processed first.")
        
        # Combine chunks into document text
        document_text = '\n\n'.join([chunk.get('content', '') for chunk in chunks_result.data if chunk.get('content', '').strip()])
        
        if not document_text.strip():
            raise HTTPException(status_code=400, detail="Document content is empty.")
        
        # Process with intelligent processor
        processor = SmartDocumentProcessor()
        result = await processor.process_teacher_document(
            document_text, 
            {
                "title": document.get('title', ''),
                "teacher_id": user['id'],
                "document_id": document_id
            }
        )
        
        # Store processed result
        supabase.table('teacher_documents').update({
            'metadata': {
                **document.get('metadata', {}),
                'processed_content': result,
                'educational_analysis': {
                    'topics_covered': result['metadata']['topics_covered'],
                    'total_segments': result['metadata']['total_segments'],
                    'processing_method': 'llm_educational_extraction'
                }
            }
        }).eq('document_id', document_id).execute()
        
        return {
            "success": True,
            "document_id": document_id,
            "analysis": {
                "topics_covered": result['metadata']['topics_covered'],
                "total_segments": result['metadata']['total_segments'],
                "structure_analysis": result.get('structure_analysis', {}),
                "learning_path": result.get('learning_path', [])
            },
            "message": "Document analyzed successfully. Ready to create activities."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intelligent processing failed: {str(e)}")

@router.post("/activities/create")
async def create_activity(
    request: CreateActivityRequest,
    user: dict = Depends(get_current_teacher)
):
    """Create a new learning activity."""
    try:
        supabase = get_supabase_client()
        
        # Verify document belongs to teacher
        doc_result = supabase.table('teacher_documents').select('*').eq('document_id', request.document_id).eq('teacher_id', user['id']).single().execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Create activity
        activity_data = {
            'document_id': request.document_id,
            'teacher_id': user['id'],
            'title': request.title,
            'description': request.description,
            'activity_type': request.activity_type,
            'difficulty': request.difficulty,
            'settings': request.settings or {}
        }
        
        result = supabase.table('learning_activities').insert(activity_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create activity")
        
        activity_id = result.data[0]['activity_id']
        
        # TODO: Generate questions based on num_questions and document chunks
        # For now, return activity without questions
        
        return {
            "activity_id": activity_id,
            "message": "Activity created successfully. Questions can be added manually or generated using AI."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/create-async")
async def create_activity_async(
    request: CreateAsyncActivityRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_teacher)
):
    """Start async activity generation"""
    try:
        supabase = get_supabase_client()
        
        # Verify document belongs to teacher
        doc_result = supabase.table('teacher_documents').select('*').eq('document_id', request.document_id).eq('teacher_id', user['id']).single().execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        
        # Create activity record first (in generating state)
        activity_data = {
            'document_id': request.document_id,
            'teacher_id': user['id'],
            'title': request.title,
            'activity_type': 'quiz',
            'difficulty': request.difficulty,
            'metadata': {
                'generation_method': 'ai_async',
                'status': 'generating',
                'task_id': task_id
            }
        }
        
        activity_result = supabase.table('learning_activities').insert(activity_data).execute()
        
        if not activity_result.data:
            raise HTTPException(status_code=500, detail="Failed to create activity")
        
        activity_id = activity_result.data[0]['activity_id']
        
        # Initialize task status
        processing_tasks[task_id] = {
            "status": "processing",
            "message": "Starting activity generation...",
            "progress": 0,
            "activity_id": activity_id,
            "error": None
        }
        
        # Start background task
        background_tasks.add_task(
            generate_activity_background,
            task_id,
            request,
            user['id'],
            activity_id
        )
        
        return {
            "task_id": task_id,
            "activity_id": activity_id,
            "status": "processing",
            "message": "Activity generation started"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/generation-status/{task_id}")
async def get_generation_status(task_id: str):
    """Get status of async activity generation"""
    if task_id not in processing_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return processing_tasks[task_id]

@router.post("/activities/{activity_id}/cancel")
async def cancel_activity_generation(
    activity_id: str,
    user: dict = Depends(get_current_teacher)
):
    """Cancel ongoing activity generation"""
    try:
        supabase = get_supabase_client()
        
        # Verify activity belongs to teacher
        activity_result = supabase.table('learning_activities').select('*').eq('activity_id', activity_id).eq('teacher_id', user['id']).single().execute()
        
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Find task by activity_id
        task_id = None
        for tid, task_data in processing_tasks.items():
            if task_data.get('activity_id') == activity_id:
                task_id = tid
                break
        
        if task_id:
            # Mark task as cancelled
            processing_tasks[task_id].update({
                "status": "failed",
                "message": "Activity generation cancelled",
                "error": "Cancelled by user"
            })
        
        # Update activity status
        supabase.table('learning_activities').update({
            'metadata': {
                'generation_method': 'ai_async',
                'status': 'cancelled',
                'cancelled_at': datetime.now().isoformat()
            }
        }).eq('activity_id', activity_id).execute()
        
        return {
            "message": "Activity generation cancelled",
            "activity_id": activity_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/create-simple")
async def create_simple_activity(
    request: CreateActivityRequest,
    user: dict = Depends(get_current_teacher)
):
    """Create activity without AI processing"""
    try:
        supabase = get_supabase_client()
        
        # Verify document belongs to teacher
        doc_result = supabase.table('teacher_documents').select('*').eq('document_id', request.document_id).eq('teacher_id', user['id']).single().execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Create activity record
        activity_id = str(uuid.uuid4())
        
        activity_data = {
            'activity_id': activity_id,
            'document_id': request.document_id,
            'teacher_id': user['id'],
            'title': request.title,
            'description': request.description,
            'activity_type': request.activity_type,
            'difficulty': request.difficulty,
            'metadata': {
                'generation_method': 'simple',
                'created_at': datetime.now().isoformat(),
                'num_questions': request.num_questions
            }
        }
        
        result = supabase.table('learning_activities').insert(activity_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create activity")
        
        return {
            "activity_id": activity_id,
            "message": "Activity created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    user: dict = Depends(get_current_teacher)
):
    """Get document information"""
    try:
        supabase = get_supabase_client()
        
        doc_result = supabase.table('teacher_documents').select('document_id, title, description, created_at').eq('document_id', document_id).eq('teacher_id', user['id']).single().execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return doc_result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def generate_activity_background(
    task_id: str,
    request: CreateAsyncActivityRequest,
    teacher_id: str,
    activity_id: str
):
    """Background task for activity generation"""
    try:
        supabase = get_supabase_client()
        
        # Update status
        processing_tasks[task_id].update({
            "message": "Analyzing document content...",
            "progress": 10
        })
        
        # Get document
        doc_result = supabase.table('teacher_documents').select('*').eq('document_id', request.document_id).eq('teacher_id', teacher_id).single().execute()
        
        if not doc_result.data:
            raise Exception("Document not found")
        
        document = doc_result.data
        
        # Step 1: Get document chunks
        processing_tasks[task_id].update({
            "message": "Extracting educational concepts...",
            "progress": 25
        })
        
        chunks_result = supabase.table('document_chunks').select('content').eq('document_id', request.document_id).order('chunk_index').execute()
        chunks = chunks_result.data if chunks_result.data else []
        
        if not chunks:
            raise ValueError("Document not processed yet. Please wait for processing to complete.")
        
        # Combine chunks into document content
        document_content = '\n\n'.join([
            f"Section {i+1}:\n{chunk.get('content', '')}" 
            for i, chunk in enumerate(chunks) 
            if chunk.get('content', '').strip()
        ])
        
        if not document_content.strip():
            raise ValueError("No content found in document chunks")
        
        # Step 2: Generate activity
        processing_tasks[task_id].update({
            "message": "Creating activity structure...",
            "progress": 50
        })
        
        # Step 3: Generate questions
        processing_tasks[task_id].update({
            "message": "Generating questions...",
            "progress": 75
        })
        
        # Check if OpenAI API key is available
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY not configured. Cannot generate AI questions.")
        
        # Initialize LLM generator
        generator = ResponseGenerator()
        
        # Generate questions using AI
        prompt = format_document_question_generator(
            document_content=document_content,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            question_types=None
        )
        
        # Get AI response
        ai_response = generator.generate_response(
            prompt=prompt,
            temperature=0.7,
            max_tokens=3000
        )
        
        # Parse JSON response
        data = None
        json_str = None
        
        # Try multiple strategies to extract JSON
        code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', ai_response, re.DOTALL)
        if code_block_match:
            json_str = code_block_match.group(1)
            try:
                data = json.loads(json_str)
            except json.JSONDecodeError:
                pass
        
        if not data:
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', ai_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                try:
                    data = json.loads(json_str)
                except json.JSONDecodeError:
                    # Try to find the largest valid JSON object
                    start_idx = ai_response.find('{')
                    if start_idx != -1:
                        brace_count = 0
                        end_idx = start_idx
                        for i in range(start_idx, len(ai_response)):
                            if ai_response[i] == '{':
                                brace_count += 1
                            elif ai_response[i] == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    end_idx = i
                                    break
                        if end_idx > start_idx:
                            try:
                                data = json.loads(ai_response[start_idx:end_idx+1])
                            except json.JSONDecodeError:
                                pass
        
        if not data or 'questions' not in data:
            raise ValueError("Failed to parse AI response. Invalid JSON format.")
        
        questions = data.get('questions', [])
        
        # Store questions
        questions_created = []
        for i, question in enumerate(questions):
            question_db_data = {
                'activity_id': activity_id,
                'question_text': question.get('question_text', ''),
                'question_type': question.get('question_type', 'short_answer'),
                'options': question.get('options'),
                'correct_answer': str(question.get('correct_answer', '')),
                'explanation': question.get('explanation', ''),
                'difficulty': question.get('difficulty', request.difficulty),
                'points': 1,
                'question_order': i + 1
            }
            
            question_result = supabase.table('activity_questions').insert(question_db_data).execute()
            if question_result.data:
                questions_created.append(question_result.data[0])
        
        # Update activity status
        supabase.table('learning_activities').update({
            'metadata': {
                'generation_method': 'ai_async',
                'status': 'completed',
                'questions_generated': len(questions_created),
                'completed_at': datetime.now().isoformat()
            }
        }).eq('activity_id', activity_id).execute()
        
        # Mark task as completed
        processing_tasks[task_id].update({
            "status": "completed",
            "message": f"Activity created with {len(questions_created)} questions",
            "progress": 100,
            "activity_id": activity_id
        })
        
    except Exception as e:
        print(f"Error in background task {task_id}: {e}")
        processing_tasks[task_id].update({
            "status": "failed",
            "message": "Activity generation failed",
            "error": str(e),
            "progress": 0
        })
        
        # Update activity status to failed
        try:
            supabase = get_supabase_client()
            supabase.table('learning_activities').update({
                'metadata': {
                    'generation_method': 'ai_async',
                    'status': 'failed',
                    'error': str(e)
                }
            }).eq('activity_id', activity_id).execute()
        except:
            pass

@router.get("/activities/{activity_id}/questions")
async def get_activity_questions(
    activity_id: str,
    user: dict = Depends(get_current_teacher)
):
    """Get all questions for an activity."""
    try:
        supabase = get_supabase_client()
        
        # Verify activity belongs to teacher
        try:
            activity_result = supabase.table('learning_activities').select('*').eq('activity_id', activity_id).eq('teacher_id', user['id']).single().execute()
        except Exception as e:
            # Handle case where activity doesn't exist
            error_str = str(e)
            if 'PGRST116' in error_str or '0 rows' in error_str:
                raise HTTPException(status_code=404, detail="Activity not found")
            raise
        
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Get questions - handle empty result gracefully
        try:
            questions_result = supabase.table('activity_questions').select('*').eq('activity_id', activity_id).order('created_at').execute()
            questions = questions_result.data if questions_result.data else []
        except Exception as e:
            # If query fails (e.g., no questions exist), return empty list
            error_str = str(e)
            if 'PGRST116' in error_str or '0 rows' in error_str:
                questions = []
            else:
                # Re-raise if it's a different error
                raise
        
        return {
            "activity": activity_result.data,
            "questions": questions
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/activities/{activity_id}")
async def delete_activity(
    activity_id: str,
    force: bool = Query(False, description="Force delete even if students are assigned"),
    user: dict = Depends(get_current_teacher)
):
    """Delete an activity and all its questions. Student assignments will also be deleted."""
    try:
        supabase = get_supabase_client()
        
        # Verify activity belongs to teacher
        activity_result = supabase.table('learning_activities').select('*').eq('activity_id', activity_id).eq('teacher_id', user['id']).single().execute()
        
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Check if there are any student activities
        student_activities_result = supabase.table('student_activities').select('student_activity_id, status').eq('activity_id', activity_id).execute()
        student_count = len(student_activities_result.data) if student_activities_result.data else 0
        
        if student_count > 0 and not force:
            # Check if any students have started/completed (not just assigned)
            started_count = sum(1 for sa in (student_activities_result.data or []) if sa.get('status') in ['in_progress', 'completed', 'graded'])
            
            if started_count > 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot delete activity: {started_count} student(s) have started or completed this activity. Use force=true to delete anyway (this will remove all student progress)."
                )
        
        # Delete student activities first (if any)
        if student_count > 0:
            supabase.table('student_activities').delete().eq('activity_id', activity_id).execute()
        
        # Delete the activity (cascade will handle questions)
        delete_result = supabase.table('learning_activities').delete().eq('activity_id', activity_id).eq('teacher_id', user['id']).execute()
        
        return {
            "success": True,
            "message": f"Activity deleted successfully. {student_count} student assignment(s) were also removed."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GenerateActivityFromPromptRequest(BaseModel):
    classroom_id: str
    title: str
    description: Optional[str] = None
    prompt: str
    difficulty: str = 'intermediate'
    num_questions: int = 10

class UnassignActivityRequest(BaseModel):
    activity_id: str
    student_ids: List[str]

@router.post("/activities/unassign")
async def unassign_activity(
    request: UnassignActivityRequest,
    user: dict = Depends(get_current_teacher)
):
    """Unassign an activity from one or more students."""
    try:
        supabase = get_supabase_client()
        
        # Verify activity belongs to teacher
        activity_result = supabase.table('learning_activities').select('*').eq('activity_id', request.activity_id).eq('teacher_id', user['id']).single().execute()
        
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Delete student activities for specified students
        # Only delete if status is 'assigned' (not started/completed)
        unassigned_count = 0
        for student_id in request.student_ids:
            student_activity_result = supabase.table('student_activities').select('*').eq('activity_id', request.activity_id).eq('student_id', student_id).single().execute()
            
            if student_activity_result.data:
                status = student_activity_result.data.get('status', 'assigned')
                if status == 'assigned':
                    supabase.table('student_activities').delete().eq('activity_id', request.activity_id).eq('student_id', student_id).execute()
                    unassigned_count += 1
                else:
                    # Can't unassign if student has started/completed
                    pass
        
        return {
            "success": True,
            "unassigned_count": unassigned_count,
            "message": f"Unassigned activity from {unassigned_count} student(s). Note: Students who have started or completed the activity cannot be unassigned."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/{classroom_id}")
async def get_classroom_activities(
    classroom_id: str,
    user: dict = Depends(get_current_teacher)
):
    """Get all activities for a classroom."""
    try:
        supabase = get_supabase_client()
        
        # Verify classroom belongs to teacher
        classroom_result = supabase.table('classrooms').select('*').eq('classroom_id', classroom_id).eq('teacher_id', user['id']).single().execute()
        
        if not classroom_result.data:
            raise HTTPException(status_code=404, detail="Classroom not found")
        
        # Get activities - both document-based and prompt-based
        # For document-based: get through documents
        docs_result = supabase.table('teacher_documents').select('document_id').eq('classroom_id', classroom_id).execute()
        document_ids = [doc['document_id'] for doc in (docs_result.data or [])]
        
        # Get activities for these documents
        activities = []
        if document_ids:
            doc_activities_result = supabase.table('learning_activities').select('*').in_('document_id', document_ids).execute()
            if doc_activities_result.data:
                activities.extend(doc_activities_result.data)
        
        # Also get prompt-based activities (no document_id) for this teacher
        prompt_activities_result = supabase.table('learning_activities').select('*').eq('teacher_id', user['id']).is_('document_id', 'null').execute()
        if prompt_activities_result.data:
            activities.extend(prompt_activities_result.data)
        
        # Sort by created_at descending
        activities.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return {"activities": activities}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AssignActivityRequest(BaseModel):
    activity_id: str
    student_ids: List[str]

@router.post("/activities/assign")
async def assign_activity(
    request: AssignActivityRequest,
    user: dict = Depends(get_current_teacher)
):
    """Assign an activity to one or more students."""
    try:
        supabase = get_supabase_client()
        
        # Verify activity belongs to teacher
        activity_result = supabase.table('learning_activities').select('*, teacher_documents(classroom_id)').eq('activity_id', request.activity_id).eq('teacher_id', user['id']).single().execute()
        
        if not activity_result.data:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        activity = activity_result.data
        document_id = activity.get('document_id')
        
        # Get question count
        questions_result = supabase.table('activity_questions').select('question_id').eq('activity_id', request.activity_id).execute()
        total_questions = len(questions_result.data) if questions_result.data else 0
        
        # Create student activity assignments
        assignments = []
        for student_id in request.student_ids:
            # Check if already assigned
            existing = supabase.table('student_activities').select('*').eq('activity_id', request.activity_id).eq('student_id', student_id).execute()
            
            if not existing.data:
                assignment_data = {
                    'activity_id': request.activity_id,
                    'student_id': student_id,
                    'document_id': document_id,
                    'status': 'assigned',
                    'total_questions': total_questions,
                    'responses': {}
                }
                assignments.append(assignment_data)
        
        if assignments:
            result = supabase.table('student_activities').insert(assignments).execute()
            assigned_count = len(result.data) if result.data else 0
        else:
            assigned_count = 0
        
        return {
            "assigned_count": assigned_count,
            "total_students": len(request.student_ids),
            "message": f"Activity assigned to {assigned_count} student(s)"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/generate")
async def generate_learning_activities(
    document_id: str = Query(..., description="Document ID to generate activities from"),
    num_questions: int = Query(10, description="Number of questions to generate"),
    question_types: Optional[List[str]] = Query(None, description="Types of questions to generate"),
    use_smart_processing: bool = Query(False, description="Use intelligent document-based processing"),
    user: dict = Depends(get_current_teacher)
):
    """AI-generated activities from document."""
    try:
        supabase = get_supabase_client()
        
        # Verify document belongs to teacher
        doc_result = supabase.table('teacher_documents').select('*').eq('document_id', document_id).eq('teacher_id', user['id']).single().execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = doc_result.data
        
        # Check if smart processing is requested and available
        if use_smart_processing:
            # Check if document has been intelligently processed
            educational_analysis = document.get('metadata', {}).get('educational_analysis')
            processed_content = document.get('metadata', {}).get('processed_content')
            
            if not processed_content:
                raise HTTPException(
                    status_code=400, 
                    detail="Document not intelligently processed yet. Please use 'AI Analysis' button first."
                )
            
            # Use DocumentBasedActivityGenerator for smart processing
            try:
                # Get document text from chunks
                chunks_result = supabase.table('document_chunks').select('content').eq('document_id', document_id).order('chunk_index').execute()
                document_text = '\n\n'.join([chunk.get('content', '') for chunk in chunks_result.data if chunk.get('content', '').strip()])
                
                generator = DocumentBasedActivityGenerator()
                activity_data = await generator.generate_activity_from_document(
                    document_content=document_text,
                    document_metadata={
                        "title": document.get('title', ''),
                        "teacher_id": user['id'],
                        "document_id": document_id
                    },
                    activity_config={
                        'title': f"AI-Generated Activity: {document.get('title', 'Document')}",
                        'description': f"Intelligently generated activity with {num_questions} questions based on document content",
                        'difficulty': 'intermediate',
                        'num_questions': num_questions
                    }
                )
                
                # Create activity record
                activity_db_data = {
                    'document_id': document_id,
                    'teacher_id': user['id'],
                    'title': activity_data['title'],
                    'description': activity_data['description'],
                    'activity_type': 'document_based',
                    'difficulty': 'intermediate',
                    'learning_objectives': activity_data.get('learning_objectives', []),
                    'metadata': activity_data.get('metadata', {})
                }
                
                activity_result = supabase.table('learning_activities').insert(activity_db_data).execute()
                
                if not activity_result.data:
                    raise HTTPException(status_code=500, detail="Failed to create activity")
                
                activity_id = activity_result.data[0]['activity_id']
                
                # Store questions
                questions_created = []
                for i, question in enumerate(activity_data.get('questions', [])):
                    question_db_data = {
                        'activity_id': activity_id,
                        'question_text': question.get('question_text', ''),
                        'question_type': question.get('question_type', 'short_answer'),
                        'options': question.get('options'),
                        'correct_answer': str(question.get('correct_answer', '')),
                        'explanation': question.get('explanation', ''),
                        'difficulty': question.get('difficulty', 'intermediate'),
                        'points': 1,
                        'metadata': question.get('metadata', {})
                    }
                    
                    question_result = supabase.table('activity_questions').insert(question_db_data).execute()
                    if question_result.data:
                        questions_created.append(question_result.data[0])
                
                return {
                    "success": True,
                    "activity_id": activity_id,
                    "activities_generated": 1,
                    "questions_generated": len(questions_created),
                    "method": "intelligent_document_based",
                    "topics_covered": activity_data.get('topics', [])
                }
                
            except Exception as e:
                print(f"Error in smart processing: {e}")
                # Fall back to regular processing
                use_smart_processing = False
        
        # Regular processing (fallback or default)
        # Get document chunks
        chunks_result = supabase.table('document_chunks').select('*').eq('document_id', document_id).order('chunk_index').execute()
        chunks = chunks_result.data if chunks_result.data else []
        
        if not chunks:
            raise HTTPException(status_code=400, detail="Document not processed yet. Please wait for processing to complete.")
        
        # Create a learning activity
        activity_data = {
            'document_id': document_id,
            'teacher_id': user['id'],
            'title': f"AI-Generated Quiz: {document.get('title', 'Document')}",
            'description': f"Automatically generated quiz with {num_questions} questions based on document content",
            'activity_type': 'quiz',
            'difficulty': 'intermediate',
            'settings': {
                'auto_generated': True,
                'num_questions': num_questions
            }
        }
        
        activity_result = supabase.table('learning_activities').insert(activity_data).execute()
        
        if not activity_result.data:
            raise HTTPException(status_code=500, detail="Failed to create activity")
        
        activity_id = activity_result.data[0]['activity_id']
        
        # Use AI to generate questions from document content
        questions_created = []
        
        try:
            # Combine chunks into document content
            document_content = '\n\n'.join([
                f"Section {i+1}:\n{chunk.get('content', '')}" 
                for i, chunk in enumerate(chunks) 
                if chunk.get('content', '').strip()
            ])
            
            if not document_content.strip():
                raise ValueError("No content found in document chunks")
            
            # Check if OpenAI API key is available
            if not os.getenv("OPENAI_API_KEY"):
                raise ValueError("OPENAI_API_KEY not configured. Cannot generate AI questions.")
            
            # Initialize LLM generator
            generator = ResponseGenerator()
            
            # Generate questions using AI
            prompt = format_document_question_generator(
                document_content=document_content,
                difficulty='intermediate',
                num_questions=num_questions,
                question_types=question_types
            )
            
            # Get AI response
            ai_response = generator.generate_response(
                prompt=prompt,
                temperature=0.7,
                max_tokens=3000
            )
            
            # Parse JSON response
            data = None
            json_str = None
            
            # Try multiple strategies to extract JSON
            # Strategy 1: Look for JSON in code blocks
            code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', ai_response, re.DOTALL)
            if code_block_match:
                json_str = code_block_match.group(1)
                try:
                    data = json.loads(json_str)
                except json.JSONDecodeError:
                    pass
            
            # Strategy 2: Look for JSON object directly
            if not data:
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', ai_response, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                    try:
                        data = json.loads(json_str)
                    except json.JSONDecodeError:
                        # Try to find the largest valid JSON object
                        # Start from the first { and try to find matching }
                        start_idx = ai_response.find('{')
                        if start_idx != -1:
                            brace_count = 0
                            end_idx = start_idx
                            for i in range(start_idx, len(ai_response)):
                                if ai_response[i] == '{':
                                    brace_count += 1
                                elif ai_response[i] == '}':
                                    brace_count -= 1
                                    if brace_count == 0:
                                        end_idx = i + 1
                                        break
                            if end_idx > start_idx:
                                json_str = ai_response[start_idx:end_idx]
                                try:
                                    data = json.loads(json_str)
                                except json.JSONDecodeError:
                                    pass
            
            # Strategy 3: Try parsing the entire response as JSON
            if not data:
                try:
                    data = json.loads(ai_response.strip())
                except json.JSONDecodeError:
                    pass
            
            if not data:
                # Log the full response for debugging
                print(f"ERROR: Could not parse AI JSON response")
                print(f"AI Response (first 1000 chars): {ai_response[:1000]}")
                raise ValueError(f"Could not parse AI response as JSON. Response preview: {ai_response[:200]}...")
            
            if 'questions' not in data or not isinstance(data['questions'], list):
                raise ValueError(f"Invalid response format: expected 'questions' array, got: {list(data.keys())}")
            
            if len(data['questions']) == 0:
                raise ValueError("AI generated 0 questions. Please try again.")
            
            # Process each generated question
            for q_data in data['questions']:
                question_text = q_data.get('question', '').strip()
                question_type = q_data.get('question_type', 'multiple_choice')
                options = q_data.get('options', [])
                correct_answer = q_data.get('correct_answer', '')
                explanation = q_data.get('explanation', '').strip()
                
                if not question_text:
                    print(f"Warning: Skipping question with empty text: {q_data}")
                    continue
                
                # Validate question type
                if question_type not in ['multiple_choice', 'short_answer', 'true_false', 'explanation']:
                    question_type = 'short_answer'  # Default fallback
                
                # Prepare question data
                question_db_data = {
                    'activity_id': activity_id,
                    'question_text': question_text,
                    'question_type': question_type,
                    'correct_answer': str(correct_answer),
                    'explanation': explanation or 'Work through this problem step by step.',
                    'difficulty': 'intermediate',
                    'points': 1,
                    'metadata': {
                        'auto_generated': True,
                        'ai_generated': True,
                        'document_title': document.get('title', '')
                    }
                }
                
                # Add options for multiple choice
                if question_type == 'multiple_choice':
                    if not options or len(options) == 0:
                        print(f"Warning: Multiple choice question missing options, converting to short_answer: {question_text[:50]}...")
                        question_type = 'short_answer'
                        question_db_data['question_type'] = 'short_answer'
                    else:
                        question_db_data['options'] = options
                
                # Store question
                question_result = supabase.table('activity_questions').insert(question_db_data).execute()
                if question_result.data:
                    questions_created.append(question_result.data[0]['question_id'])
        
        except ValueError as ve:
            # If API key missing or no content, return error
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as ai_error:
            # If AI generation fails, log error and return partial success
            error_msg = str(ai_error)
            print(f"Error generating questions with AI: {error_msg}")
            # If we got some questions, return them; otherwise raise error
            if len(questions_created) == 0:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to generate questions: {error_msg}. Please ensure OPENAI_API_KEY is configured."
                )
        
        return {
            "activity_id": activity_id,
            "activities_generated": 1,
            "questions_generated": len(questions_created),
            "message": f"Successfully generated activity with {len(questions_created)} questions using AI"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/generate-from-prompt")
async def generate_activity_from_prompt(
    request: GenerateActivityFromPromptRequest,
    user: dict = Depends(get_current_teacher)
):
    """Generate an activity with questions from a teacher's prompt (no document needed)."""
    try:
        supabase = get_supabase_client()
        
        # Verify classroom belongs to teacher
        classroom_result = supabase.table('classrooms').select('*').eq('classroom_id', request.classroom_id).eq('teacher_id', user['id']).single().execute()
        
        if not classroom_result.data:
            raise HTTPException(status_code=404, detail="Classroom not found")
        
        # Create a learning activity (no document_id needed)
        activity_data = {
            'teacher_id': user['id'],
            'title': request.title,
            'description': request.description or f"AI-generated activity: {request.prompt[:100]}...",
            'activity_type': 'quiz',
            'difficulty': request.difficulty,
            'settings': {
                'prompt_based': True,
                'teacher_prompt': request.prompt,
                'num_questions': request.num_questions
            }
        }
        
        activity_result = supabase.table('learning_activities').insert(activity_data).execute()
        
        if not activity_result.data:
            raise HTTPException(status_code=500, detail="Failed to create activity")
        
        activity_id = activity_result.data[0]['activity_id']
        
        # Use AI to generate questions from teacher's prompt
        questions_created = []
        
        try:
            # Check if OpenAI API key is available
            if not os.getenv("OPENAI_API_KEY"):
                raise ValueError("OPENAI_API_KEY not configured. Cannot generate AI questions.")
            
            # Initialize LLM generator
            generator = ResponseGenerator()
            
            # Generate questions using AI from prompt
            prompt = format_prompt_question_generator(
                teacher_prompt=request.prompt,
                difficulty=request.difficulty,
                num_questions=request.num_questions
            )
            
            # Get AI response
            ai_response = generator.generate_response(
                prompt=prompt,
                temperature=0.7,
                max_tokens=3000
            )
            
            # Parse JSON response (reuse the same parsing logic)
            data = None
            json_str = None
            
            # Try multiple strategies to extract JSON
            code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', ai_response, re.DOTALL)
            if code_block_match:
                json_str = code_block_match.group(1)
                try:
                    data = json.loads(json_str)
                except json.JSONDecodeError:
                    pass
            
            if not data:
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', ai_response, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                    try:
                        data = json.loads(json_str)
                    except json.JSONDecodeError:
                        start_idx = ai_response.find('{')
                        if start_idx != -1:
                            brace_count = 0
                            end_idx = start_idx
                            for i in range(start_idx, len(ai_response)):
                                if ai_response[i] == '{':
                                    brace_count += 1
                                elif ai_response[i] == '}':
                                    brace_count -= 1
                                    if brace_count == 0:
                                        end_idx = i + 1
                                        break
                            if end_idx > start_idx:
                                json_str = ai_response[start_idx:end_idx]
                                try:
                                    data = json.loads(json_str)
                                except json.JSONDecodeError:
                                    pass
            
            if not data:
                try:
                    data = json.loads(ai_response.strip())
                except json.JSONDecodeError:
                    pass
            
            if not data:
                print(f"ERROR: Could not parse AI JSON response")
                print(f"AI Response (first 1000 chars): {ai_response[:1000]}")
                raise ValueError(f"Could not parse AI response as JSON. Response preview: {ai_response[:200]}...")
            
            if 'questions' not in data or not isinstance(data['questions'], list):
                raise ValueError(f"Invalid response format: expected 'questions' array, got: {list(data.keys())}")
            
            if len(data['questions']) == 0:
                raise ValueError("AI generated 0 questions. Please try again.")
            
            # Process each generated question
            for q_data in data['questions']:
                question_text = q_data.get('question', '').strip()
                question_type = q_data.get('question_type', 'multiple_choice')
                options = q_data.get('options', [])
                correct_answer = q_data.get('correct_answer', '')
                explanation = q_data.get('explanation', '').strip()
                
                if not question_text:
                    print(f"Warning: Skipping question with empty text: {q_data}")
                    continue
                
                if question_type not in ['multiple_choice', 'short_answer', 'true_false', 'explanation']:
                    question_type = 'short_answer'
                
                question_db_data = {
                    'activity_id': activity_id,
                    'question_text': question_text,
                    'question_type': question_type,
                    'correct_answer': str(correct_answer),
                    'explanation': explanation or 'Work through this problem step by step.',
                    'difficulty': request.difficulty,
                    'points': 1,
                    'metadata': {
                        'auto_generated': True,
                        'ai_generated': True,
                        'prompt_based': True
                    }
                }
                
                if question_type == 'multiple_choice':
                    if not options or len(options) == 0:
                        print(f"Warning: Multiple choice question missing options, converting to short_answer: {question_text[:50]}...")
                        question_type = 'short_answer'
                        question_db_data['question_type'] = 'short_answer'
                    else:
                        question_db_data['options'] = options
                
                question_result = supabase.table('activity_questions').insert(question_db_data).execute()
                if question_result.data:
                    questions_created.append(question_result.data[0]['question_id'])
        
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as ai_error:
            error_msg = str(ai_error)
            print(f"Error generating questions with AI: {error_msg}")
            if len(questions_created) == 0:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to generate questions: {error_msg}. Please ensure OPENAI_API_KEY is configured."
                )
        
        return {
            "activity_id": activity_id,
            "questions_generated": len(questions_created),
            "message": f"Successfully generated activity with {len(questions_created)} questions using AI"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/{classroom_id}")
async def get_classroom_analytics(
    classroom_id: str,
    time_range: str = "week",
    user: dict = Depends(get_current_teacher)
):
    """Get comprehensive analytics for a classroom."""
    try:
        supabase = get_supabase_client()
        
        # Verify classroom belongs to teacher
        classroom_result = supabase.table('classrooms').select('*').eq('classroom_id', classroom_id).eq('teacher_id', user['id']).single().execute()
        
        if not classroom_result.data:
            raise HTTPException(status_code=404, detail="Classroom not found")
        
        # Get student enrollments
        enrollments_result = supabase.table('student_enrollments').select('student_id').eq('classroom_id', classroom_id).execute()
        student_ids = [e['student_id'] for e in (enrollments_result.data or [])]
        
        # Get student activities
        activities_result = supabase.table('student_activities').select('*').in_('student_id', student_ids).execute() if student_ids else None
        
        # Calculate metrics
        total_students = len(student_ids)
        total_activities = 0
        completed_activities = 0
        total_score = 0
        score_count = 0
        
        if activities_result and activities_result.data:
            for activity in activities_result.data:
                total_activities += 1
                if activity.get('status') == 'completed':
                    completed_activities += 1
                    if activity.get('score'):
                        total_score += activity['score']
                        score_count += 1
        
        average_score = (total_score / score_count) if score_count > 0 else 0
        
        # TODO: Get struggling concepts and generate AI insights
        # For now, return basic metrics
        
        return {
            "metrics": {
                "total_students": total_students,
                "active_students": total_students,  # Simplified
                "total_activities_assigned": total_activities,
                "completed_activities": completed_activities,
                "average_score": round(average_score, 2)
            },
            "student_performance": [],  # TODO: Implement
            "insights": "Analytics insights will be generated with AI integration",
            "struggling_concepts": [],
            "top_performers": {},
            "recommendations": []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/students/{classroom_id}")
async def get_classroom_students(
    classroom_id: str,
    user: dict = Depends(get_current_teacher)
):
    """Get all students enrolled in a classroom."""
    try:
        supabase = get_supabase_client()
        
        # Verify classroom belongs to teacher
        classroom_result = supabase.table('classrooms').select('*').eq('classroom_id', classroom_id).eq('teacher_id', user['id']).single().execute()
        
        if not classroom_result.data:
            raise HTTPException(status_code=404, detail="Classroom not found")
        
        # Get enrollments with student info
        # First, get enrollments
        enrollments_result = supabase.table('student_enrollments').select('student_id, enrolled_at').eq('classroom_id', classroom_id).execute()
        
        if not enrollments_result.data:
            return {"students": []}
        
        # Get user data from public.users table
        student_ids = [e['student_id'] for e in enrollments_result.data]
        users_result = supabase.table('users').select('id, email, name').in_('id', student_ids).execute()
        
        # Combine enrollment and user data
        users_dict = {u['id']: u for u in (users_result.data or [])}
        combined = []
        for enrollment in enrollments_result.data:
            user_data = users_dict.get(enrollment['student_id'], {})
            combined.append({
                'student_id': enrollment['student_id'],
                'enrolled_at': enrollment['enrolled_at'],
                'users': {
                    'email': user_data.get('email', 'Unknown'),
                    'name': user_data.get('name')
                }
            })
        
        return {"students": combined}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Teaching Examples Endpoints
@router.get("/examples")
async def get_teaching_examples(user: dict = Depends(get_current_teacher)):
    """Get all teaching examples for the teacher"""
    try:
        supabase = get_supabase_client()
        
        # Get examples from database (create table if needed)
        result = supabase.table('teaching_examples').select('*').eq('teacher_id', user['id']).order('created_at', desc=True).execute()
        
        examples = result.data if result.data else []
        
        # Also check memory store if it exists
        if hasattr(router, '_teaching_examples_memory'):
            memory_examples = [ex for ex in router._teaching_examples_memory if ex.get('teacher_id') == user['id']]
            # Merge and deduplicate by ID
            existing_ids = {ex['id'] for ex in examples}
            for mem_ex in memory_examples:
                if mem_ex['id'] not in existing_ids:
                    examples.append(mem_ex)
        
        return examples
    except Exception as e:
        # If table doesn't exist, check memory store
        if 'relation' in str(e).lower() and 'does not exist' in str(e).lower():
            if hasattr(router, '_teaching_examples_memory'):
                return [ex for ex in router._teaching_examples_memory if ex.get('teacher_id') == user['id']]
            return []
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/examples")
async def create_teaching_example(
    example: TeachingExampleCreate,
    user: dict = Depends(get_current_teacher)
):
    """Create a new teaching example"""
    try:
        supabase = get_supabase_client()
        
        example_id = str(uuid.uuid4())
        
        example_data = {
            'id': example_id,
            'teacher_id': user['id'],
            'topic': example.topic,
            'teacher_input': example.teacher_input,
            'desired_ai_response': example.desired_ai_response,
            'difficulty': example.difficulty,
            'teaching_style': example.teaching_style,
            'learning_objectives': example.learning_objectives,
            'assessment_criteria': getattr(example, 'assessment_criteria', []),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Try to insert (table might not exist yet)
        try:
            result = supabase.table('teaching_examples').insert(example_data).execute()
            if result.data:
                return {"id": example_id, "message": "Example created successfully"}
        except Exception as db_error:
            error_str = str(db_error).lower()
            # If table doesn't exist, create it in memory for now
            if 'relation' in error_str and 'does not exist' in error_str:
                # Store in memory as fallback
                if not hasattr(router, '_teaching_examples_memory'):
                    router._teaching_examples_memory = []
                router._teaching_examples_memory.append(example_data)
                return {"id": example_id, "message": "Example created successfully (stored in memory)"}
            # If column doesn't exist, remove it and try again
            elif 'assessment_criteria' in error_str and ('column' in error_str or 'pgrst204' in error_str):
                # Remove assessment_criteria from data and try again
                example_data_without_criteria = {k: v for k, v in example_data.items() if k != 'assessment_criteria'}
                try:
                    result = supabase.table('teaching_examples').insert(example_data_without_criteria).execute()
                    if result.data:
                        return {"id": example_id, "message": "Example created successfully (assessment_criteria column not available)"}
                except Exception as retry_error:
                    raise db_error  # Raise original error if retry also fails
            raise
        
        raise HTTPException(status_code=500, detail="Failed to create example")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/examples/{example_id}")
async def update_teaching_example(
    example_id: str,
    example: TeachingExampleCreate,
    user: dict = Depends(get_current_teacher)
):
    """Update a teaching example"""
    try:
        supabase = get_supabase_client()
        
        # Update example
        update_data = {
            'topic': example.topic,
            'teacher_input': example.teacher_input,
            'desired_ai_response': example.desired_ai_response,
            'difficulty': example.difficulty,
            'teaching_style': example.teaching_style,
            'learning_objectives': example.learning_objectives,
            'assessment_criteria': getattr(example, 'assessment_criteria', []),
            'updated_at': datetime.now().isoformat()
        }
        
        try:
            # Verify example belongs to teacher
            existing = supabase.table('teaching_examples').select('*').eq('id', example_id).eq('teacher_id', user['id']).single().execute()
            
            if not existing.data:
                raise HTTPException(status_code=404, detail="Example not found")
            
            result = supabase.table('teaching_examples').update(update_data).eq('id', example_id).eq('teacher_id', user['id']).execute()
            
            if result.data:
                return {"message": "Example updated successfully"}
        except Exception as db_error:
            error_str = str(db_error).lower()
            # If column doesn't exist, remove it and try again
            if 'assessment_criteria' in error_str and ('column' in error_str or 'pgrst204' in error_str):
                # Remove assessment_criteria from update data and try again
                update_data_without_criteria = {k: v for k, v in update_data.items() if k != 'assessment_criteria'}
                try:
                    result = supabase.table('teaching_examples').update(update_data_without_criteria).eq('id', example_id).eq('teacher_id', user['id']).execute()
                    if result.data:
                        return {"message": "Example updated successfully (assessment_criteria column not available)"}
                except Exception as retry_error:
                    raise db_error  # Raise original error if retry also fails
            # Check if it's in memory store
            if hasattr(router, '_teaching_examples_memory'):
                for i, ex in enumerate(router._teaching_examples_memory):
                    if ex['id'] == example_id and ex['teacher_id'] == user['id']:
                        router._teaching_examples_memory[i] = {
                            **ex,
                            **update_data,
                            'updated_at': datetime.now().isoformat()
                        }
                        return {"message": "Example updated successfully"}
            # If table doesn't exist, raise original error
            if 'relation' not in str(db_error).lower() or 'does not exist' not in str(db_error).lower():
                raise
        
        raise HTTPException(status_code=500, detail="Failed to update example")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/examples/{example_id}")
async def delete_teaching_example(
    example_id: str,
    user: dict = Depends(get_current_teacher)
):
    """Delete a teaching example"""
    try:
        supabase = get_supabase_client()
        
        # First verify the example exists and belongs to the teacher
        existing = supabase.table('teaching_examples').select('id').eq('id', example_id).eq('teacher_id', user['id']).execute()
        
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(status_code=404, detail="Example not found")
        
        # Delete from database (don't try to return the deleted row)
        supabase.table('teaching_examples').delete().eq('id', example_id).eq('teacher_id', user['id']).execute()
        
        # Also remove from memory store if it exists
        if hasattr(router, '_teaching_examples_memory'):
            router._teaching_examples_memory = [
                ex for ex in router._teaching_examples_memory 
                if not (ex['id'] == example_id and ex['teacher_id'] == user['id'])
            ]
        
        return {"message": "Example deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        # If table doesn't exist, try memory store
        if 'relation' in str(e).lower() and 'does not exist' in str(e).lower():
            if hasattr(router, '_teaching_examples_memory'):
                router._teaching_examples_memory = [
                    ex for ex in router._teaching_examples_memory 
                    if not (ex['id'] == example_id and ex['teacher_id'] == user['id'])
                ]
                return {"message": "Example deleted successfully"}
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-behavior")
async def test_ai_behavior(
    request: TestAIRequest,
    user: dict = Depends(get_current_teacher)
):
    """Test AI behavior with current teaching examples"""
    try:
        supabase = get_supabase_client()
        
        # Get teacher's examples
        try:
            result = supabase.table('teaching_examples').select('*').eq('teacher_id', user['id']).order('created_at', desc=True).limit(5).execute()
            examples = result.data if result.data else []
        except:
            # Fallback to memory store
            examples = getattr(router, '_teaching_examples_memory', [])
            examples = [ex for ex in examples if ex.get('teacher_id') == user['id']][-5:]
        
        # Create prompt based on teaching examples
        try:
            from rag_engine.finetuned_prompts import create_teaching_prompt
            prompt = create_teaching_prompt(request.student_input, examples)
        except ImportError:
            # Fallback if module doesn't exist
            prompt = f"""You are MathMentor, an AI math tutor. Answer this student question clearly and helpfully.

Student: {request.student_input}

Answer:"""
        
        # Call OpenAI
        generator = ResponseGenerator()
        response = generator.generate_response(
            prompt=prompt,
            temperature=0.7,
            max_tokens=1000
        )
        
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-teaching-flow")
async def test_teaching_flow(
    request: TeachingFlowRequest,
    user: dict = Depends(get_current_teacher)
):
    """Test complete teaching flow for a topic"""
    try:
        supabase = get_supabase_client()
        
        # Get relevant teaching examples
        try:
            result = supabase.table('teaching_examples').select('*').eq('teacher_id', user['id']).order('created_at', desc=True).limit(5).execute()
            examples = result.data if result.data else []
        except:
            examples = getattr(router, '_teaching_examples_memory', [])
            examples = [ex for ex in examples if ex.get('teacher_id') == user['id']][-5:]
        
        # Filter examples by topic if available
        relevant_examples = [ex for ex in examples if request.topic.lower() in ex.get('topic', '').lower()][:3]
        if not relevant_examples:
            relevant_examples = examples[:3]
        
        # Create teaching flow prompt
        examples_text = ""
        if relevant_examples:
            examples_text = "LEARN FROM THESE TEACHING EXAMPLES:\n"
            for i, ex in enumerate(relevant_examples):
                examples_text += f"""
Example {i+1} - Topic: {ex.get('topic', 'N/A')}
Student: {ex.get('teacher_input', '')}
AI Response: {ex.get('desired_ai_response', '')}
---
"""
        
        prompt = f"""You are MathMentor, an AI math tutor. Create a complete teaching flow for the topic below.

TOPIC TO TEACH: {request.topic}
DIFFICULTY: {request.difficulty}
TEACHING STYLE: {request.teaching_style}

{examples_text}

TEACHING FLOW REQUIREMENTS:

PHASE 1: TEACH (5-7 minutes)
- Introduce the concept clearly
- Use appropriate examples for {request.difficulty} level
- Explain step-by-step in {request.teaching_style} style
- Use $...$ for math notation

PHASE 2: PRACTICE (5-7 minutes)
- Engage student in guided conversation
- Ask questions to check understanding
- Provide feedback on their thinking
- Don't give answers - guide discovery

PHASE 3: EVALUATE (3-5 minutes)
- Assess understanding through conversation
- Ask assessment questions
- Provide constructive feedback
- Summarize what was learned

LEARNING OBJECTIVES to achieve:
{chr(10).join([f"• {obj}" for obj in (request.learning_objectives or ['Understand the core concept'])])}

ASSESSMENT CRITERIA:
{chr(10).join([f"• {criterion}" for criterion in (request.assessment_criteria or ['Can explain the concept', 'Can apply it to simple problems'])])}

GENERATE A COMPLETE TEACHING FLOW following this structure:

### TEACH PHASE
[Your teaching content here]

### PRACTICE PHASE
[Engagement questions and guidance]

### EVALUATE PHASE  
[Assessment questions and feedback]

The flow should feel natural and conversational, not like a quiz. Focus on understanding through dialogue."""

        # Generate response
        generator = ResponseGenerator()
        response = generator.generate_response(
            prompt=prompt,
            temperature=0.7,
            max_tokens=2000
        )
        
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activities/conversational")
async def create_conversational_activity(
    request: CreateConversationalActivityRequest,
    user: dict = Depends(get_current_teacher)
):
    """Create a conversational learning activity"""
    try:
        supabase = get_supabase_client()
        
        # Get relevant teaching examples
        try:
            result = supabase.table('teaching_examples').select('*').eq('teacher_id', user['id']).order('created_at', desc=True).limit(5).execute()
            examples = result.data if result.data else []
        except:
            examples = getattr(router, '_teaching_examples_memory', [])
            examples = [ex for ex in examples if ex.get('teacher_id') == user['id']][-5:]
        
        # Filter examples by topic
        relevant_examples = [ex for ex in examples if request.topic.lower() in ex.get('topic', '').lower()][:3]
        if not relevant_examples:
            relevant_examples = examples[:3]
        
        # Generate teaching flow (simplified to avoid timeout)
        # We'll generate a basic structure, full flow can be generated on-demand
        teaching_flow = f"""Conversational learning experience for: {request.topic}

Teaching Style: {request.teaching_style}
Difficulty: {request.difficulty}
Estimated Time: {request.estimated_time_minutes} minutes

Phases:
1. Introduction - Welcome and topic overview
2. Teaching - Explain core concepts with examples
3. Practice - Guided conversation and application
4. Evaluation - Assess understanding through dialogue

Based on {len(relevant_examples)} teaching examples."""
        
        # Optionally generate detailed flow (can be done async or on-demand)
        try:
            examples_text = ""
            if relevant_examples:
                examples_text = "LEARN FROM THESE TEACHING EXAMPLES:\n"
                for i, ex in enumerate(relevant_examples[:2]):  # Limit to 2 examples for speed
                    examples_text += f"\nExample {i+1}: {ex.get('topic', 'N/A')}\n"
            
            flow_prompt = f"""Create a brief conversational learning flow for: {request.topic}
Teaching Style: {request.teaching_style}, Difficulty: {request.difficulty}
{examples_text}
Keep it concise - focus on key teaching points and conversation structure."""
            
            generator = ResponseGenerator()
            detailed_flow = generator.generate_response(
                prompt=flow_prompt,
                temperature=0.7,
                max_tokens=400  # Very short to avoid timeout
            )
            if detailed_flow and len(detailed_flow) > 50:
                teaching_flow = detailed_flow
        except Exception as flow_error:
            # If generation fails, use basic structure
            print(f"Teaching flow generation failed, using basic structure: {flow_error}")
            pass
        
        # Create activity
        activity_id = str(uuid.uuid4())
        
        # Prepare metadata/settings data
        activity_metadata = {
            'topic': request.topic,
            'teaching_style': request.teaching_style,
            'teaching_flow': teaching_flow,
            'based_on_examples': len(relevant_examples),
            'conversational': True,
            'phases': ['introduction', 'teach', 'practice', 'evaluate']
        }
        
        # Store classroom_id in metadata as fallback if column doesn't exist
        if request.classroom_id:
            activity_metadata['classroom_id'] = request.classroom_id
        
        activity_data = {
            'activity_id': activity_id,
            'teacher_id': user['id'],
            'title': request.title,
            'description': request.description or f"Conversational learning about {request.topic}",
            'activity_type': 'conversational',
            'difficulty': request.difficulty,
            'estimated_time_minutes': request.estimated_time_minutes,
            'settings': activity_metadata  # Use settings column (exists in schema)
        }
        
        # Try to add metadata and classroom_id columns if migrations have been run
        # These will be added if the migration has been applied
        if request.classroom_id:
            activity_data['classroom_id'] = request.classroom_id
        
        activity_data['metadata'] = activity_metadata
        
        try:
            result = supabase.table('learning_activities').insert(activity_data).execute()
        except Exception as insert_error:
            error_str = str(insert_error)
            # Handle missing columns gracefully
            if 'PGRST204' in error_str:
                # Remove columns that don't exist and retry
                if 'metadata' in error_str:
                    activity_data.pop('metadata', None)
                if 'classroom_id' in error_str:
                    activity_data.pop('classroom_id', None)
                # Retry with only existing columns (settings will have the data)
                result = supabase.table('learning_activities').insert(activity_data).execute()
            else:
                raise
        
        if result.data:
            # Automatically assign activity to all students in the classroom
            assigned_count = 0
            assignment_error = None
            
            if request.classroom_id:
                try:
                    # Get all students in the classroom
                    enrollments_result = supabase.table('student_enrollments').select('student_id').eq('classroom_id', request.classroom_id).execute()
                    
                    if enrollments_result.data and len(enrollments_result.data) > 0:
                        student_ids = [e['student_id'] for e in enrollments_result.data]
                        
                        # Create student activity assignments
                        assignments = []
                        for student_id in student_ids:
                            # Check if already assigned
                            existing = supabase.table('student_activities').select('student_activity_id').eq('activity_id', activity_id).eq('student_id', student_id).execute()
                            
                            if not existing.data or len(existing.data) == 0:
                                assignment_data = {
                                    'activity_id': activity_id,
                                    'student_id': student_id,
                                    'status': 'assigned',
                                    'total_questions': None,  # Conversational activities don't have questions
                                    'responses': {}
                                }
                                assignments.append(assignment_data)
                        
                        if assignments:
                            assign_result = supabase.table('student_activities').insert(assignments).execute()
                            assigned_count = len(assign_result.data) if assign_result.data else 0
                    else:
                        assignment_error = f"No students found in classroom {request.classroom_id}"
                        print(f"Warning: {assignment_error}")
                except Exception as assign_error_exc:
                    # Log the error but don't fail activity creation
                    import traceback
                    error_details = traceback.format_exc()
                    assignment_error = str(assign_error_exc)
                    print(f"ERROR: Failed to auto-assign activity to students: {assignment_error}")
                    print(f"Error details: {error_details}")
            else:
                assignment_error = "No classroom_id provided"
                print(f"Warning: {assignment_error}")
            
            response_message = f"Activity created and assigned to {assigned_count} student(s)" if assigned_count > 0 else "Activity created successfully"
            if assignment_error and assigned_count == 0:
                response_message += f" (Warning: {assignment_error})"
            
            return {
                "activity_id": activity_id,
                "teaching_style": request.teaching_style,
                "estimated_time": f"{request.estimated_time_minutes} minutes",
                "phases": ["introduction", "teach", "practice", "evaluate"],
                "assigned_count": assigned_count,
                "message": response_message,
                "assignment_error": assignment_error if assignment_error else None
            }
        
        raise HTTPException(status_code=500, detail="Failed to create activity")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

