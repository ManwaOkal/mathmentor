# Teacher & Student Platform Extension - Detailed Implementation Guide

## **Executive Overview**
We're extending MathMentor into a **dual-platform system**: Teacher Dashboard for content upload/analytics and Student Platform for interactive learning with assessment. This will transform the current single-user experience into a classroom management system.

## **System Architecture Update**

### **New Architecture Diagram**
```
┌─────────────────┐     ┌─────────────────┐
│   Teacher Portal │     │   Student Portal │
│   (Next.js)     │     │   (Next.js)     │
└─────────┬───────┘     └─────────┬───────┘
          │                       │
          └───────────┬───────────┘
                      │
               ┌──────▼──────┐
               │   FastAPI   │
               │   Backend   │
               └──────┬──────┘
                      │
          ┌───────────▼───────────┐
          │                       │
    ┌─────▼─────┐         ┌──────▼─────┐
    │ Supabase  │         │ File Store │
    │  (RAG +   │         │ (S3/Spaces)│
    │ Analytics)│         └────────────┘
    └───────────┘
```

### **New Database Schema Additions**

```sql
-- TEACHER-SPECIFIC TABLES
CREATE TABLE classrooms (
    classroom_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    join_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE student_enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(classroom_id, student_id)
);

CREATE TABLE teacher_documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    filename VARCHAR(255),
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'processing', -- 'processing', 'ready', 'failed'
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE document_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES teacher_documents(document_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    page_number INTEGER,
    chunk_index INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ACTIVITY & ASSESSMENT TABLES
CREATE TABLE learning_activities (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES teacher_documents(document_id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(50), -- 'quiz', 'qna', 'interactive', 'reflection'
    difficulty VARCHAR(20),
    estimated_time_minutes INTEGER,
    learning_objectives TEXT[],
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE student_activities (
    student_activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES learning_activities(activity_id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES teacher_documents(document_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'graded'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_questions INTEGER,
    correct_answers INTEGER,
    score DECIMAL(5,2),
    assessment VARCHAR(20), -- 'pass', 'fail', 'needs_review'
    feedback TEXT,
    responses JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE activity_questions (
    question_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES learning_activities(activity_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50), -- 'multiple_choice', 'short_answer', 'true_false', 'explanation'
    options TEXT[], -- For multiple choice
    correct_answer TEXT,
    explanation TEXT,
    difficulty VARCHAR(20),
    points INTEGER DEFAULT 1,
    context_chunk_ids UUID[], -- Links to document chunks
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE student_responses (
    response_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_activity_id UUID REFERENCES student_activities(student_activity_id) ON DELETE CASCADE,
    question_id UUID REFERENCES activity_questions(question_id) ON DELETE CASCADE,
    student_answer TEXT,
    is_correct BOOLEAN,
    confidence_score DECIMAL(3,2), -- AI-assessed confidence
    feedback TEXT,
    corrected_answer TEXT,
    metadata JSONB DEFAULT '{}',
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ANALYTICS TABLES
CREATE TABLE teacher_analytics (
    analytics_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(classroom_id),
    date DATE DEFAULT CURRENT_DATE,
    total_students INTEGER,
    active_students INTEGER,
    total_activities_assigned INTEGER,
    completed_activities INTEGER,
    average_score DECIMAL(5,2),
    struggling_concepts TEXT[],
    top_performers JSONB, -- {student_id: name, score}
    insights TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE student_progress_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES teacher_documents(document_id),
    activity_id UUID REFERENCES learning_activities(activity_id),
    overall_understanding_score DECIMAL(5,2), -- 0.0-1.0
    concept_breakdown JSONB, -- {concept: score}
    ai_assessment TEXT,
    recommendations TEXT[],
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## **Implementation Phases**

### **Phase 1: Authentication & User Roles**
```typescript
// frontend/lib/auth/types.ts
export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar_url?: string;
  classroom_ids?: string[];
  preferences?: {
    learning_style?: string;
    difficulty_preference?: string;
    notification_settings?: any;
  };
}

// Update Supabase RLS policies
-- RLS Policies for role-based access
CREATE POLICY "Teachers can manage their classrooms"
  ON classrooms FOR ALL USING (
    auth.uid() = teacher_id OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

CREATE POLICY "Students can view enrolled classrooms"
  ON classrooms FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_enrollments 
      WHERE classroom_id = classrooms.classroom_id 
      AND student_id = auth.uid()
    )
  );
```

### **Phase 2: Teacher Dashboard Components**

#### **TeacherLayout Component**
```typescript
// frontend/components/teacher/TeacherLayout.tsx
import { ClassroomSidebar, TeacherHeader, AnalyticsOverview } from './';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const [activeClassroom, setActiveClassroom] = useState<string | null>(null);
  
  return (
    <div className="flex h-screen bg-gray-50">
      <ClassroomSidebar 
        activeClassroom={activeClassroom}
        onSelectClassroom={setActiveClassroom}
      />
      <div className="flex-1 flex flex-col">
        <TeacherHeader classroom={activeClassroom} />
        <AnalyticsOverview classroomId={activeClassroom} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### **DocumentUpload Component**
```typescript
// frontend/components/teacher/DocumentUpload.tsx
export default function DocumentUpload({ classroomId }: { classroomId: string }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    
    // 1. Get presigned URL for direct upload
    const { url, documentId } = await api.getUploadUrl({
      filename: file.name,
      filetype: file.type,
      classroomId
    });
    
    // 2. Upload to storage (S3/Spaces/Supabase Storage)
    await api.uploadToStorage(url, file, (progress) => {
      setProgress(progress);
    });
    
    // 3. Trigger backend processing
    await api.processDocument(documentId, {
      title: file.name,
      description: "Teacher notes",
      generateActivities: true,
      chunkingStrategy: "semantic"
    });
    
    setUploading(false);
  };
  
  return (
    <div className="border-2 border-dashed rounded-lg p-8 text-center">
      <FileUploader 
        onFileSelect={handleFileUpload}
        acceptedTypes={['.pdf', '.docx', '.txt']}
        maxSize={50 * 1024 * 1024} // 50MB
      />
      {uploading && <ProgressBar value={progress} />}
    </div>
  );
}
```

#### **Classroom Analytics Dashboard**
```typescript
// frontend/components/teacher/AnalyticsDashboard.tsx
export default function AnalyticsDashboard({ classroomId }: { classroomId: string }) {
  const [analytics, setAnalytics] = useState<ClassroomAnalytics>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'custom'>('week');
  
  useEffect(() => {
    fetchAnalytics();
  }, [classroomId, timeRange]);
  
  const fetchAnalytics = async () => {
    const data = await api.getTeacherAnalytics(classroomId, timeRange);
    setAnalytics(data);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Overview Cards */}
      <MetricCard 
        title="Total Students"
        value={analytics?.total_students}
        change="+2"
      />
      <MetricCard 
        title="Average Score"
        value={`${analytics?.average_score}%`}
        change="+5.2%"
      />
      <MetricCard 
        title="Completion Rate"
        value={`${analytics?.completion_rate}%`}
        change="+8%"
      />
      
      {/* Charts */}
      <div className="col-span-2">
        <ScoreDistributionChart 
          data={analytics?.score_distribution}
        />
      </div>
      
      <div className="col-span-1">
        <ActivityCompletionChart 
          data={analytics?.activity_completion}
        />
      </div>
      
      {/* Student Performance Table */}
      <div className="col-span-3">
        <StudentPerformanceTable 
          students={analytics?.students}
          onSelectStudent={(studentId) => {
            router.push(`/teacher/student/${studentId}`);
          }}
        />
      </div>
      
      {/* AI Insights */}
      <div className="col-span-3 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">📊 AI Insights</h3>
        <p>{analytics?.insights}</p>
        <div className="mt-4">
          <h4 className="font-medium mb-1">Struggling Concepts:</h4>
          <div className="flex flex-wrap gap-2">
            {analytics?.struggling_concepts?.map(concept => (
              <Badge key={concept} variant="warning">{concept}</Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### **Phase 3: Student Platform Components**

#### **StudentActivity Interface**
```typescript
// frontend/components/student/StudentActivity.tsx
export default function StudentActivity({ activityId }: { activityId: string }) {
  const [activity, setActivity] = useState<StudentActivity>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  
  // Load activity
  useEffect(() => {
    loadActivity();
  }, [activityId]);
  
  const loadActivity = async () => {
    const data = await api.getStudentActivity(activityId);
    setActivity(data);
  };
  
  const handleAnswer = async (questionId: string, answer: string) => {
    // Immediate feedback if enabled
    if (activity.settings.immediate_feedback) {
      const feedback = await api.getAnswerFeedback(questionId, answer);
      // Show feedback to student
    }
    
    // Save response
    setResponses(prev => ({ ...prev, [questionId]: answer }));
  };
  
  const submitActivity = async () => {
    const result = await api.submitActivityResponses(activityId, responses);
    setScore(result.score);
    setSubmitted(true);
    
    // AI assessment of overall understanding
    const assessment = await api.assessUnderstanding(activityId);
    
    // Show assessment results
    showAssessmentResults(assessment);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Document Viewer Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Activity Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{activity?.title}</h1>
            <p className="text-gray-600">{activity?.description}</p>
            <ProgressBar 
              value={(currentQuestion + 1) / activity?.total_questions * 100}
            />
          </div>
          
          {/* Current Question */}
          {activity?.questions && activity.questions[currentQuestion] && (
            <QuestionCard
              question={activity.questions[currentQuestion]}
              questionNumber={currentQuestion + 1}
              totalQuestions={activity.total_questions}
              onAnswer={(answer) => handleAnswer(
                activity.questions[currentQuestion].question_id,
                answer
              )}
              userAnswer={responses[activity.questions[currentQuestion].question_id]}
            />
          )}
          
          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion(prev => prev - 1)}
            >
              Previous
            </Button>
            
            {currentQuestion < activity?.total_questions - 1 ? (
              <Button
                onClick={() => setCurrentQuestion(prev => prev + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={submitActivity}
                disabled={Object.keys(responses).length < activity?.total_questions}
              >
                Submit Assessment
              </Button>
            )}
          </div>
        </div>
        
        {/* Document Viewer Sidebar */}
        <div className="lg:col-span-1 border-l pl-6">
          <h3 className="font-semibold mb-4">📚 Reference Material</h3>
          <DocumentViewer 
            documentId={activity.document_id}
            currentChunks={activity.questions[currentQuestion]?.context_chunk_ids}
          />
          
          {/* AI Assistant */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium mb-2">🤖 AI Assistant</h4>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => api.getHint(activity.questions[currentQuestion].question_id)}
            >
              Need a hint?
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="ml-2"
              onClick={() => api.explainConcept(
                activity.questions[currentQuestion].context_concept
              )}
            >
              Explain concept
            </Button>
          </div>
        </div>
      </div>
      
      {/* Assessment Results Modal */}
      {submitted && score !== null && (
        <AssessmentResultsModal
          score={score}
          total={activity.total_questions}
          assessment={assessment}
          onClose={() => setSubmitted(false)}
        />
      )}
    </div>
  );
}
```

#### **AssessmentResultsModal Component**
```typescript
// frontend/components/student/AssessmentResultsModal.tsx
export function AssessmentResultsModal({ 
  score, 
  total, 
  assessment,
  onClose 
}: {
  score: number;
  total: number;
  assessment: AIAssessment;
  onClose: () => void;
}) {
  const percentage = (score / total) * 100;
  const passed = percentage >= 70; // Threshold configurable by teacher
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          {passed ? (
            <div className="text-green-500 text-6xl mb-4">🎉</div>
          ) : (
            <div className="text-yellow-500 text-6xl mb-4">📚</div>
          )}
          
          <h2 className="text-2xl font-bold mb-2">
            {passed ? 'Congratulations!' : 'Keep Practicing!'}
          </h2>
          
          <div className="text-4xl font-bold mb-2">
            {score}/{total} ({percentage.toFixed(1)}%)
          </div>
          
          <div className={`text-lg font-semibold ${passed ? 'text-green-600' : 'text-yellow-600'}`}>
            {passed ? 'PASS' : 'NEEDS IMPROVEMENT'}
          </div>
        </div>
        
        {/* AI Assessment */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">🤖 AI Assessment</h3>
          <p className="text-gray-700">{assessment.summary}</p>
          
          {/* Concept Breakdown */}
          <div className="mt-4">
            <h4 className="font-medium mb-2">Understanding Breakdown:</h4>
            {Object.entries(assessment.concept_breakdown).map(([concept, score]) => (
              <div key={concept} className="flex items-center mb-2">
                <div className="w-32 truncate">{concept}</div>
                <div className="flex-1 ml-2">
                  <ProgressBar 
                    value={(score as number) * 100}
                    size="sm"
                  />
                </div>
                <div className="w-12 text-right">
                  {((score as number) * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recommendations */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">📚 Recommended Next Steps</h3>
          <ul className="list-disc pl-5 space-y-1">
            {assessment.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {!passed && (
            <Button variant="primary" onClick={() => {
              // Retry activity
              window.location.reload();
            }}>
              Try Again
            </Button>
          )}
          <Button variant="primary" onClick={() => {
            // Navigate to next activity
            router.push('/student/dashboard');
          }}>
            Continue Learning
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### **Phase 4: Backend API Extensions**

#### **New API Endpoints**

```python
# api/routers/teacher.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid

router = APIRouter(prefix="/api/teacher", tags=["teacher"])

# Request/Response Models
class CreateClassroomRequest(BaseModel):
    name: str
    description: Optional[str] = None

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
    difficulty: str = "medium"
    num_questions: int = 10
    settings: Optional[dict] = {}

@router.post("/classrooms")
async def create_classroom(request: CreateClassroomRequest, user: User = Depends(get_current_teacher)):
    """Create a new classroom with join code"""
    join_code = generate_join_code()
    classroom = await supabase.rpc('create_classroom', {
        'teacher_id': user.id,
        'name': request.name,
        'description': request.description,
        'join_code': join_code
    })
    return classroom

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    user: User = Depends(get_current_teacher)
):
    """Upload and process teacher document"""
    metadata_dict = json.loads(metadata)
    
    # 1. Generate unique filename
    file_ext = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    
    # 2. Upload to storage (Supabase Storage/S3)
    file_url = await storage.upload_file(
        file=await file.read(),
        filename=filename,
        content_type=file.content_type
    )
    
    # 3. Create document record
    document = await supabase.table('teacher_documents').insert({
        'teacher_id': user.id,
        'classroom_id': metadata_dict['classroom_id'],
        'title': metadata_dict.get('title', file.filename),
        'description': metadata_dict.get('description'),
        'filename': file.filename,
        'file_url': file_url,
        'file_type': file.content_type,
        'file_size': file.size,
        'status': 'processing'
    }).execute()
    
    # 4. Trigger async processing
    asyncio.create_task(process_document_async(document.data[0]['document_id']))
    
    return {"document_id": document.data[0]['document_id'], "status": "processing"}

async def process_document_async(document_id: str):
    """Async document processing pipeline"""
    try:
        # 1. Extract text from PDF/DOCX
        text = await extract_text_from_document(document_id)
        
        # 2. Chunk the document (teacher-specific strategy)
        chunks = await chunker.chunk_teacher_document(text)
        
        # 3. Generate embeddings
        embeddings = await embedding_generator.embed_chunks(chunks)
        
        # 4. Store in vector DB
        await vector_store.store_document_chunks(document_id, chunks, embeddings)
        
        # 5. Generate learning activities if requested
        document = await supabase.table('teacher_documents').select('*').eq('document_id', document_id).single().execute()
        if document.data.get('metadata', {}).get('generate_activities', True):
            await generate_learning_activities(document_id, chunks)
        
        # 6. Update status
        await supabase.table('teacher_documents').update({
            'status': 'ready',
            'updated_at': 'now()'
        }).eq('document_id', document_id).execute()
        
    except Exception as e:
        await supabase.table('teacher_documents').update({
            'status': 'failed',
            'metadata': {'error': str(e)}
        }).eq('document_id', document_id).execute()

@router.post("/activities/generate")
async def generate_learning_activities(
    document_id: str,
    num_questions: int = 10,
    question_types: Optional[List[str]] = None
):
    """AI-generated activities from document"""
    document = await supabase.table('teacher_documents').select('*').eq('document_id', document_id).single().execute()
    chunks = await vector_store.get_document_chunks(document_id)
    
    # Use LLM to generate questions from chunks
    activities = await llm.generate_activities_from_document(
        chunks=chunks,
        num_questions=num_questions,
        question_types=question_types or ['multiple_choice', 'short_answer', 'explanation']
    )
    
    # Store activities and questions
    for activity in activities:
        await store_activity(activity, document_id)
    
    return {"activities_generated": len(activities)}

@router.get("/analytics/{classroom_id}")
async def get_classroom_analytics(
    classroom_id: str,
    time_range: str = "week",
    user: User = Depends(get_current_teacher)
):
    """Get comprehensive analytics for a classroom"""
    
    # 1. Basic metrics
    metrics = await supabase.rpc('get_classroom_metrics', {
        'classroom_id': classroom_id,
        'time_range': time_range
    }).execute()
    
    # 2. Student performance
    student_performance = await supabase.rpc('get_student_performance', {
        'classroom_id': classroom_id
    }).execute()
    
    # 3. AI-generated insights
    insights = await llm.generate_analytics_insights(metrics.data, student_performance.data)
    
    # 4. Struggling concepts
    struggling = await identify_struggling_concepts(classroom_id)
    
    return {
        "metrics": metrics.data[0] if metrics.data else {},
        "student_performance": student_performance.data,
        "insights": insights,
        "struggling_concepts": struggling,
        "top_performers": get_top_performers(student_performance.data),
        "recommendations": generate_teacher_recommendations(insights, struggling)
    }
```

```python
# api/routers/student.py
@router.post("/activities/{activity_id}/start")
async def start_activity(activity_id: str, user: User = Depends(get_current_student)):
    """Student starts an assigned activity"""
    
    # Check if already started
    existing = await supabase.table('student_activities').select('*').eq('activity_id', activity_id).eq('student_id', user.id).single().execute()
    
    if existing.data:
        return {"student_activity_id": existing.data['student_activity_id']}
    
    # Create new student activity
    activity = await supabase.table('learning_activities').select('*').eq('activity_id', activity_id).single().execute()
    questions = await supabase.table('activity_questions').select('*').eq('activity_id', activity_id).execute()
    
    student_activity = await supabase.table('student_activities').insert({
        'activity_id': activity_id,
        'student_id': user.id,
        'document_id': activity.data['document_id'],
        'status': 'in_progress',
        'started_at': 'now()',
        'total_questions': len(questions.data),
        'responses': {}
    }).execute()
    
    return {"student_activity_id": student_activity.data[0]['student_activity_id']}

@router.post("/activities/{student_activity_id}/submit")
async def submit_activity_responses(
    student_activity_id: str,
    responses: Dict[str, Any],
    user: User = Depends(get_current_student)
):
    """Submit activity responses for grading"""
    
    # 1. Validate student owns this activity
    student_activity = await supabase.table('student_activities').select('*').eq('student_activity_id', student_activity_id).eq('student_id', user.id).single().execute()
    
    if not student_activity.data:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # 2. Grade responses
    graded_responses = await grade_responses(student_activity_id, responses)
    score = calculate_score(graded_responses)
    
    # 3. AI assessment of understanding
    assessment = await assess_student_understanding(
        student_activity_id=student_activity_id,
        responses=graded_responses,
        document_id=student_activity.data['document_id']
    )
    
    # 4. Update student activity
    updated = await supabase.table('student_activities').update({
        'status': 'completed',
        'completed_at': 'now()',
        'correct_answers': score['correct'],
        'score': score['percentage'],
        'assessment': assessment['overall_assessment'],  # 'pass', 'fail'
        'feedback': assessment['summary'],
        'responses': graded_responses
    }).eq('student_activity_id', student_activity_id).execute()
    
    # 5. Create progress snapshot
    await create_progress_snapshot(
        student_id=user.id,
        document_id=student_activity.data['document_id'],
        activity_id=student_activity.data['activity_id'],
        assessment=assessment
    )
    
    return {
        "score": score,
        "assessment": assessment,
        "feedback": assessment['summary'],
        "recommendations": assessment['recommendations']
    }

async def assess_student_understanding(
    student_activity_id: str,
    responses: Dict[str, Any],
    document_id: str
) -> Dict:
    """AI-powered assessment of student understanding"""
    
    # Get document context
    document = await supabase.table('teacher_documents').select('*').eq('document_id', document_id).single().execute()
    chunks = await vector_store.get_document_chunks(document_id)
    
    # Prepare context for LLM assessment
    assessment_prompt = f"""
    You are an expert math teacher assessing a student's understanding based on their activity responses.
    
    Document: {document.data['title']}
    Document excerpts: {chunks[:5]}  # First 5 chunks for context
    
    Student responses: {json.dumps(responses, indent=2)}
    
    Please provide:
    1. Overall assessment (pass/fail with threshold 70%)
    2. Summary of understanding
    3. Concept-by-concept breakdown (score 0.0-1.0)
    4. Specific areas of strength
    5. Specific areas needing improvement
    6. Personalized recommendations for improvement
    7. Suggestions for next learning steps
    
    Return as JSON.
    """
    
    response = await openai.ChatCompletion.acreate(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an expert math education assessor."},
            {"role": "user", "content": assessment_prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)

@router.get("/progress")
async def get_student_progress(user: User = Depends(get_current_student)):
    """Get student's overall progress"""
    
    # 1. Recent activities
    activities = await supabase.table('student_activities').select('*, learning_activities(title, description)').eq('student_id', user.id).order('completed_at', desc=True).limit(10).execute()
    
    # 2. Overall mastery
    mastery = await supabase.rpc('get_student_mastery_summary', {'student_id': user.id}).execute()
    
    # 3. AI-generated learning path
    learning_path = await generate_learning_path(user.id)
    
    # 4. Teacher feedback
    feedback = await supabase.table('teacher_feedback').select('*').eq('student_id', user.id).order('created_at', desc=True).limit(5).execute()
    
    return {
        "recent_activities": activities.data,
        "mastery_summary": mastery.data[0] if mastery.data else {},
        "learning_path": learning_path,
        "teacher_feedback": feedback.data,
        "overall_understanding_score": calculate_overall_understanding(user.id)
    }
```

### **Phase 5: AI Processing Components**

#### **Document Processor**
```python
# tutoring/document_processor.py
import PyPDF2
from docx import Document
import pypdfium2 as pdfium
from typing import List, Dict, Any

class DocumentProcessor:
    """Processes teacher-uploaded documents"""
    
    def __init__(self):
        self.chunker = MathChunker()
        self.embedder = EmbeddingGenerator()
        self.llm = OpenAILLM()
    
    async def process_pdf(self, file_path: str) -> List[Dict]:
        """Extract and structure PDF content"""
        text_chunks = []
        
        # Use pypdfium2 for better text extraction
        pdf = pdfium.PdfDocument(file_path)
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            textpage = page.get_textpage()
            
            # Extract text with formatting hints
            text = textpage.get_text_range()
            text = self._clean_text(text)
            
            # Extract images/math formulas (future enhancement)
            images = self._extract_images(page)
            
            # Chunk by page with metadata
            chunks = self.chunker.chunk_by_section(text)
            for chunk in chunks:
                chunk.metadata.update({
                    'page_number': page_num + 1,
                    'document_type': 'pdf',
                    'has_formulas': self._detect_formulas(chunk.content),
                    'image_references': images if 'Figure' in chunk.content else []
                })
                text_chunks.append(chunk)
        
        return text_chunks
    
    async def generate_questions_from_chunks(self, chunks: List[Dict], num_questions: int = 10) -> List[Dict]:
        """AI-generated questions from document chunks"""
        
        prompt = f"""
        You are an expert math teacher creating assessment questions from learning material.
        
        Document chunks: {json.dumps([c.content for c in chunks[:20]], indent=2)}
        
        Create {num_questions} assessment questions with:
        1. Clear question text
        2. Question type (multiple_choice, short_answer, explanation)
        3. Correct answer
        4. Step-by-step explanation
        5. Difficulty level (easy, medium, hard)
        6. Which document chunk(s) the question relates to
        7. Learning objective being assessed
        
        Return as JSON array.
        """
        
        response = await self.llm.generate(prompt, response_format="json_object")
        questions = json.loads(response).get('questions', [])
        
        # Link questions to specific chunks
        for question in questions:
            relevant_chunks = await self._find_relevant_chunks(question['question_text'], chunks)
            question['context_chunk_ids'] = [c.chunk_id for c in relevant_chunks]
        
        return questions
    
    def _detect_formulas(self, text: str) -> bool:
        """Detect if text contains mathematical formulas"""
        formula_indicators = [
            '=', '^', '_', '\\frac', '\\sqrt', '\\sum', 
            '∫', '∂', 'lim', '→', '∈', '∀', '∃'
        ]
        return any(indicator in text for indicator in formula_indicators)
```

#### **AI Assessment Engine**
```python
# tutoring/assessment_engine.py
class AssessmentEngine:
    """AI-powered assessment and feedback generation"""
    
    def __init__(self):
        self.llm = OpenAILLM()
    
    async def assess_understanding(self, student_responses: Dict, document_chunks: List) -> Dict:
        """Comprehensive understanding assessment"""
        
        # Multi-dimensional assessment
        assessments = await asyncio.gather(
            self._assess_conceptual_understanding(student_responses, document_chunks),
            self._assess_procedural_skill(student_responses),
            self._assess_problem_solving(student_responses),
            self._identify_misconceptions(student_responses)
        )
        
        # Combine assessments
        combined = {
            'conceptual_understanding': assessments[0],
            'procedural_skill': assessments[1],
            'problem_solving': assessments[2],
            'misconceptions': assessments[3],
            'overall_score': self._calculate_overall_score(assessments),
            'personalized_feedback': await self._generate_personalized_feedback(assessments)
        }
        
        return combined
    
    async def _generate_personalized_feedback(self, assessments: Dict) -> str:
        """Generate personalized feedback for student"""
        
        prompt = f"""
        Generate encouraging, actionable feedback for a math student based on these assessments:
        
        {json.dumps(assessments, indent=2)}
        
        Feedback should:
        1. Start with positive reinforcement
        2. Address specific areas for improvement
        3. Provide concrete next steps
        4. Be encouraging and supportive
        5. Include specific practice suggestions
        
        Keep it under 3 paragraphs.
        """
        
        return await self.llm.generate(prompt)
    
    async def generate_remediation_activities(self, student_id: str, weak_areas: List[str]) -> List[Dict]:
        """Generate targeted practice for weak areas"""
        
        prompt = f"""
        Create targeted remediation activities for a student struggling with:
        {', '.join(weak_areas)}
        
        For each weak area, provide:
        1. A brief review explanation
        2. 3 practice problems (easy → medium → hard)
        3. Hints for each problem
        4. Links to relevant learning resources
        
        Return as JSON.
        """
        
        return await self.llm.generate(prompt, response_format="json_object")
```

### **Phase 6: File Storage Integration**

```python
# lib/storage.py
import boto3
from supabase import create_client
import tempfile
from typing import Optional

class FileStorage:
    """Handles file storage for teacher uploads"""
    
    def __init__(self, provider: str = "supabase"):
        self.provider = provider
        
        if provider == "s3":
            self.client = boto3.client('s3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY'),
                aws_secret_access_key=os.getenv('AWS_SECRET_KEY'),
                region_name=os.getenv('AWS_REGION')
            )
            self.bucket = os.getenv('S3_BUCKET')
        elif provider == "supabase":
            self.supabase = create_client(
                os.getenv('SUPABASE_URL'),
                os.getenv('SUPABASE_SERVICE_KEY')
            )
    
    async def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        """Upload file and return URL"""
        
        if self.provider == "supabase":
            # Supabase Storage
            path = f"teacher-documents/{filename}"
            result = self.supabase.storage.from_("documents").upload(
                path, file_content,
                {"content-type": content_type}
            )
            url = self.supabase.storage.from_("documents").get_public_url(path)
            return url
        
        elif self.provider == "s3":
            # AWS S3
            path = f"teacher-documents/{filename}"
            self.client.put_object(
                Bucket=self.bucket,
                Key=path,
                Body=file_content,
                ContentType=content_type,
                ACL='public-read'  # Or use presigned URLs for private
            )
            return f"https://{self.bucket}.s3.amazonaws.com/{path}"
    
    async def get_presigned_url(self, filename: str, expiration: int = 3600) -> Dict:
        """Get presigned URL for direct upload from frontend"""
        
        if self.provider == "s3":
            return self.client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': f"teacher-documents/{filename}"
                },
                ExpiresIn=expiration
            )
        
        elif self.provider == "supabase":
            # Supabase doesn't have direct presigned uploads
            # Use signed URLs or handle through backend
            return {
                "upload_url": f"{os.getenv('SUPABASE_URL')}/storage/v1/object/documents/teacher-documents/{filename}",
                "headers": {
                    "Authorization": f"Bearer {os.getenv('SUPABASE_SERVICE_KEY')}",
                    "Content-Type": "application/octet-stream"
                }
            }
```

### **Phase 7: Real-time Updates with Supabase Realtime**

```typescript
// frontend/lib/realtime.ts
import { RealtimeChannel } from '@supabase/supabase-js';

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  
  subscribeToClassroom(classroomId: string, onUpdate: (payload: any) => void) {
    const channel = supabase.channel(`classroom:${classroomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_activities',
        filter: `classroom_id=eq.${classroomId}`
      }, (payload) => {
        onUpdate(payload);
      })
      .subscribe();
    
    this.channels.set(classroomId, channel);
  }
  
  subscribeToStudentProgress(studentId: string, onUpdate: (payload: any) => void) {
    const channel = supabase.channel(`student:${studentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'student_progress_snapshots',
        filter: `student_id=eq.${studentId}`
      }, (payload) => {
        onUpdate(payload);
      })
      .subscribe();
    
    this.channels.set(`student-${studentId}`, channel);
  }
  
  unsubscribe(channelId: string) {
    const channel = this.channels.get(channelId);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelId);
    }
  }
}

export const realtime = new RealtimeService();
```

## **Deployment Instructions for Coding Agent**

### **Step 1: Database Migration**
```sql
-- Run this in Supabase SQL editor
-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Create new tables (use schema from above)
-- 3. Set up RLS policies
-- 4. Create indexes
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_student_activities_status ON student_activities(status, student_id);
```

### **Step 2: Environment Variables**
```bash
# Backend .env additions
SUPABASE_STORAGE_BUCKET=documents
STORAGE_PROVIDER=supabase  # or 's3'
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET=your-bucket

# Frontend .env.local additions
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Step 3: Component Implementation Order**
1. **Authentication & User Roles**
   - Update Supabase auth schema
   - Create role-based routing
   - Add user profile management

2. **Teacher Dashboard**
   - Classroom management
   - Document upload with progress
   - Analytics dashboard

3. **Student Platform**
   - Activity interface
   - Document viewer
   - Assessment results

4. **Backend APIs**
   - Document processing pipeline
   - Activity generation
   - AI assessment engine

5. **Real-time Features**
   - Live updates for teachers
   - Progress notifications

### **Step 4: Testing Checklist**
- [ ] Teacher can create classroom and generate join code
- [ ] Student can join classroom with join code
- [ ] Teacher can upload PDF and see processing status
- [ ] Document chunks are created with embeddings
- [ ] AI generates questions from document
- [ ] Student can complete activity
- [ ] AI assesses understanding and provides feedback
- [ ] Teacher sees real-time analytics
- [ ] All data persists correctly
- [ ] Error handling for failed uploads/processing

## **Key Features to Implement**

### **For Teachers:**
1. **Document Management**
   - Upload PDF/DOCX notes
   - View processing status
   - Edit document metadata
   - Delete/archive documents

2. **Classroom Management**
   - Create/delete classrooms
   - Generate student join codes
   - View enrolled students
   - Assign/remove students

3. **Activity Management**
   - Auto-generate activities from documents
   - Manual activity creation
   - Edit/delete activities
   - Schedule activity assignments

4. **Analytics Dashboard**
   - Real-time student progress
   - Class performance overview
   - Individual student insights
   - Exportable reports

### **For Students:**
1. **Activity Interface**
   - Clean, focused question display
   - Document reference sidebar
   - AI assistant for hints
   - Progress tracking

2. **Assessment & Feedback**
   - Immediate question feedback
   - Comprehensive end assessment
   - Personalized recommendations
   - Retry options for failed attempts

3. **Progress Tracking**
   - Overall understanding score
   - Concept mastery breakdown
   - Activity history
   - Learning path recommendations

## **Performance Considerations**

1. **Document Processing**
   - Use async processing with queue
   - Implement chunking limits (max 100 pages)
   - Cache processed documents

2. **Vector Search Optimization**
   - Index document chunks separately from main content
   - Use document-specific similarity search
   - Implement pagination for large documents

3. **Real-time Updates**
   - Use Supabase Realtime for live progress
   - Implement optimistic UI updates
   - Debounce analytics updates

4. **File Storage**
   - Use CDN for document delivery
   - Implement lazy loading for PDF viewer
   - Cache frequently accessed documents

## **Security Considerations**

1. **Authentication**
   - Role-based access control (RBAC)
   - JWT verification for all endpoints
   - Secure file upload validation

2. **Data Protection**
   - Student data isolation (RLS)
   - Secure file storage (private by default)
   - API rate limiting

3. **Content Safety**
   - Validate uploaded files (anti-virus scan)
   - Sanitize AI-generated content
   - Monitor for inappropriate content

This architecture provides a robust, scalable foundation for a teacher-student platform with AI-powered assessment. The system is designed to be modular, allowing for incremental implementation and testing.