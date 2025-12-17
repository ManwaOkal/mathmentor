"""
FastAPI backend for MathMentor.
"""
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Check for required environment variables
if not os.getenv("OPENAI_API_KEY"):
    print("⚠️  WARNING: OPENAI_API_KEY not found in environment variables")
    print("   The API will start but RAG features will not work.")
    print("   Create a .env file with your OpenAI API key.")

# Import after loading env vars
from tutoring.math_tutor import MathTutor
from tutoring.progress_tracker import ProgressTracker

# Import new routers
try:
    from api.routers import teacher, student
except ImportError:
    # Handle case where routers don't exist yet
    teacher = None
    student = None

app = FastAPI(
    title="MathMentor API",
    description="RAG-Based AI Math Tutor Platform with Teacher & Student Features",
    version="2.0.0"
)

# Include new routers
if teacher:
    app.include_router(teacher.router)
if student:
    app.include_router(student.router)

# Add response compression
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS middleware
# Get allowed origins from environment variable or use defaults
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]
else:
    # Default origins including localhost and Vercel
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://mathmentor-szbw2.vercel.app",
    ]

# Get custom domain from environment variable (for regex pattern)
custom_domain = os.getenv("CUSTOM_DOMAIN", "")
custom_domain_www = os.getenv("CUSTOM_DOMAIN_WWW", "")

# Build regex pattern for allowed origins
# Base pattern: localhost and Vercel deployments
regex_parts = ["localhost", ".*\\.vercel\\.app"]

# Add custom domains if provided
if custom_domain:
    # Remove protocol if present
    domain = custom_domain.replace("https://", "").replace("http://", "").replace("www.", "")
    regex_parts.append(domain.replace(".", "\\."))
    
if custom_domain_www:
    domain_www = custom_domain_www.replace("https://", "").replace("http://", "")
    regex_parts.append(domain_www.replace(".", "\\."))

# Also add mathmentor.academy domains if not already included
# This ensures the custom domain works even if env vars aren't set
if "mathmentor\\.academy" not in "|".join(regex_parts):
    regex_parts.append("mathmentor\\.academy")
    regex_parts.append("www\\.mathmentor\\.academy")

# Build final regex pattern
origin_regex = r"https?://(" + "|".join(regex_parts) + r")(:\d+)?"

# Use CORS middleware with dynamic origin support
# FastAPI's CORSMiddleware checks both allow_origins and allow_origin_regex
# An origin is allowed if it matches either the explicit list OR the regex pattern
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Explicit origins from env var or defaults
    allow_origin_regex=origin_regex,  # Regex pattern for Vercel deployments and custom domains
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],  # Explicitly include OPTIONS for preflight
    allow_headers=["*"],
    expose_headers=["*"],
)

# Initialize services lazily to handle missing env vars gracefully
_tutor = None
_progress_tracker = None

def get_tutor():
    """Get or create tutor instance."""
    global _tutor
    if _tutor is None:
        try:
            _tutor = MathTutor()
        except ValueError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Service unavailable: {str(e)}. Please configure OPENAI_API_KEY in your .env file."
            )
    return _tutor

def get_progress_tracker():
    """Get or create progress tracker instance."""
    global _progress_tracker
    if _progress_tracker is None:
        _progress_tracker = ProgressTracker()
    return _progress_tracker


# Request/Response models
class QuestionRequest(BaseModel):
    question: str
    concept_id: Optional[str] = None


class QuestionResponse(BaseModel):
    answer: str
    context_used: bool
    skill_level: str


class ConceptExplanationRequest(BaseModel):
    concept_name: str
    concept_id: Optional[str] = None


class ProblemSolveRequest(BaseModel):
    problem: str
    concept_id: Optional[str] = None


class HintRequest(BaseModel):
    problem: str
    attempt: str
    hint_level: int = 1
    concept_id: Optional[str] = None


class PracticeRequest(BaseModel):
    concept_name: str
    difficulty: str = "intermediate"
    num_problems: int = 1
    concept_id: Optional[str] = None


class TestRequest(BaseModel):
    concept_name: str
    difficulty: str = "intermediate"
    num_questions: int = 5
    concept_id: Optional[str] = None


class ProgressResponse(BaseModel):
    total_concepts_studied: int
    mastered: int
    in_progress: int
    not_started: int
    concepts: List[dict]


# Helper to get user ID from header (simplified - in production, use proper auth)
async def get_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Extract user ID from authorization header.
    In production, verify JWT token from Supabase auth.
    """
    if authorization:
        # Simplified - in production, decode and verify JWT
        # For now, assume format: "Bearer {user_id}"
        if authorization.startswith("Bearer "):
            return authorization.replace("Bearer ", "")
    return None


# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "MathMentor API", "status": "running"}


@app.post("/api/ask-question", response_model=QuestionResponse)
async def ask_question(
    request: QuestionRequest,
    user_id: Optional[str] = Depends(get_user_id)
):
    """
    Main tutoring endpoint - answer a student's question.
    """
    try:
        tutor_instance = get_tutor()
        result = tutor_instance.ask_question(
            question=request.question,
            user_id=user_id,
            concept_id=request.concept_id
        )
        
        return QuestionResponse(
            answer=result['answer'],
            context_used=result['context_used'],
            skill_level=result['skill_level']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/explain-concept")
async def explain_concept(
    request: ConceptExplanationRequest,
    user_id: Optional[str] = Depends(get_user_id)
):
    """
    Explain a math concept.
    """
    try:
        tutor_instance = get_tutor()
        result = tutor_instance.explain_concept(
            concept_name=request.concept_name,
            user_id=user_id,
            concept_id=request.concept_id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/solve-problem")
async def solve_problem(
    request: ProblemSolveRequest,
    user_id: Optional[str] = Depends(get_user_id)
):
    """
    Solve a math problem step-by-step.
    """
    try:
        tutor_instance = get_tutor()
        result = tutor_instance.solve_problem(
            problem=request.problem,
            user_id=user_id,
            concept_id=request.concept_id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/get-hint")
async def get_hint(
    request: HintRequest,
    user_id: Optional[str] = Depends(get_user_id)
):
    """
    Get a hint for a problem.
    """
    try:
        tutor_instance = get_tutor()
        result = tutor_instance.provide_hint(
            problem=request.problem,
            attempt=request.attempt,
            hint_level=request.hint_level,
            user_id=user_id,
            concept_id=request.concept_id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-practice")
async def generate_practice(
    request: PracticeRequest,
    user_id: Optional[str] = Depends(get_user_id)
):
    """
    Generate practice problems.
    """
    try:
        tutor_instance = get_tutor()
        result = tutor_instance.generate_practice(
            concept_name=request.concept_name,
            difficulty=request.difficulty,
            num_problems=request.num_problems,
            user_id=user_id,
            concept_id=request.concept_id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/progress", response_model=ProgressResponse)
async def get_progress(user_id: Optional[str] = Depends(get_user_id)):
    """
    Get student progress.
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    try:
        tracker = get_progress_tracker()
        progress = tracker.get_progress(user_id)
        return ProgressResponse(**progress)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recommendations")
async def get_recommendations(
    limit: int = 5,
    user_id: Optional[str] = Depends(get_user_id)
):
    """
    Get recommended concepts to study next.
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    try:
        tracker = get_progress_tracker()
        recommendations = tracker.get_recommendations(user_id, limit=limit)
        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/concept/{concept_id}")
async def get_concept(concept_id: str):
    """
    Get concept details.
    """
    try:
        from lib.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        
        result = supabase.table('math_concepts').select('*').eq('concept_id', concept_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Concept not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/concepts")
async def list_concepts(topic: Optional[str] = None):
    """
    List all math concepts, optionally filtered by topic.
    """
    try:
        from lib.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        
        query = supabase.table('math_concepts').select('*')
        
        if topic:
            query = query.eq('topic_category', topic)
        
        result = query.execute()
        return {"concepts": result.data if result.data else []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class UpdateMasteryRequest(BaseModel):
    concept_id: str
    mastery_score: float


@app.post("/api/generate-test")
async def generate_test(
    request: TestRequest,
    user_id: Optional[str] = Depends(get_user_id)
):
    """
    Generate multiple choice test questions for a concept.
    """
    try:
        tutor_instance = get_tutor()
        result = tutor_instance.generate_test_questions(
            concept_name=request.concept_name,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            user_id=user_id,
            concept_id=request.concept_id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/update-mastery")
async def update_mastery(
    request: UpdateMasteryRequest,
    user_id: Optional[str] = Depends(get_user_id)
):
    """
    Update mastery score for a concept.
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    try:
        tracker = get_progress_tracker()
        success = tracker.update_mastery(
            user_id=user_id,
            concept_id=request.concept_id,
            mastery_score=request.mastery_score
        )
        
        if success:
            return {"success": True, "message": "Mastery updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update mastery")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

