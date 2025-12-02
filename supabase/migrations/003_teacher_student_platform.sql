-- Migration 003: Teacher & Student Platform Extension
-- This migration adds all tables and functions needed for the dual-platform system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- TEACHER-SPECIFIC TABLES
-- ============================================================================

-- Classrooms table
CREATE TABLE IF NOT EXISTS public.classrooms (
    classroom_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    join_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher documents table
CREATE TABLE IF NOT EXISTS public.teacher_documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    classroom_id UUID REFERENCES public.classrooms(classroom_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    filename VARCHAR(255),
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Document chunks table (separate from content_chunks for teacher documents)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.teacher_documents(document_id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    page_number INTEGER,
    chunk_index INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ACTIVITY & ASSESSMENT TABLES
-- ============================================================================

-- Learning activities table
CREATE TABLE IF NOT EXISTS public.learning_activities (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.teacher_documents(document_id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(50) CHECK (activity_type IN ('quiz', 'qna', 'interactive', 'reflection')),
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_time_minutes INTEGER,
    learning_objectives TEXT[],
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student activities table
CREATE TABLE IF NOT EXISTS public.student_activities (
    student_activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES public.learning_activities(activity_id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.teacher_documents(document_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'graded')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_questions INTEGER,
    correct_answers INTEGER,
    score DECIMAL(5,2),
    assessment VARCHAR(20) CHECK (assessment IN ('pass', 'fail', 'needs_review')),
    feedback TEXT,
    responses JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(activity_id, student_id)
);

-- Activity questions table
CREATE TABLE IF NOT EXISTS public.activity_questions (
    question_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES public.learning_activities(activity_id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) CHECK (question_type IN ('multiple_choice', 'short_answer', 'true_false', 'explanation')),
    options TEXT[],
    correct_answer TEXT,
    explanation TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    points INTEGER DEFAULT 1,
    context_chunk_ids UUID[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student responses table
CREATE TABLE IF NOT EXISTS public.student_responses (
    response_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_activity_id UUID REFERENCES public.student_activities(student_activity_id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.activity_questions(question_id) ON DELETE CASCADE NOT NULL,
    student_answer TEXT,
    is_correct BOOLEAN,
    confidence_score DECIMAL(3,2),
    feedback TEXT,
    corrected_answer TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS TABLES
-- ============================================================================

-- Teacher analytics table
CREATE TABLE IF NOT EXISTS public.teacher_analytics (
    analytics_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    classroom_id UUID REFERENCES public.classrooms(classroom_id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    total_students INTEGER,
    active_students INTEGER,
    total_activities_assigned INTEGER,
    completed_activities INTEGER,
    average_score DECIMAL(5,2),
    struggling_concepts TEXT[],
    top_performers JSONB,
    insights TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student progress snapshots table
CREATE TABLE IF NOT EXISTS public.student_progress_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.teacher_documents(document_id) ON DELETE SET NULL,
    activity_id UUID REFERENCES public.learning_activities(activity_id) ON DELETE SET NULL,
    overall_understanding_score DECIMAL(5,2),
    concept_breakdown JSONB,
    ai_assessment TEXT,
    recommendations TEXT[],
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Classrooms indexes
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id ON public.classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON public.classrooms(join_code);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_teacher_documents_teacher_id ON public.teacher_documents(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_documents_classroom_id ON public.teacher_documents(classroom_id);
CREATE INDEX IF NOT EXISTS idx_teacher_documents_status ON public.teacher_documents(status);

-- Document chunks vector index
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON public.document_chunks 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);

-- Activity indexes
CREATE INDEX IF NOT EXISTS idx_learning_activities_teacher_id ON public.learning_activities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_learning_activities_document_id ON public.learning_activities(document_id);
CREATE INDEX IF NOT EXISTS idx_student_activities_student_id ON public.student_activities(student_id);
CREATE INDEX IF NOT EXISTS idx_student_activities_activity_id ON public.student_activities(activity_id);
CREATE INDEX IF NOT EXISTS idx_student_activities_status ON public.student_activities(status, student_id);

-- Question indexes
CREATE INDEX IF NOT EXISTS idx_activity_questions_activity_id ON public.activity_questions(activity_id);

-- Response indexes
CREATE INDEX IF NOT EXISTS idx_student_responses_student_activity_id ON public.student_responses(student_activity_id);
CREATE INDEX IF NOT EXISTS idx_student_responses_question_id ON public.student_responses(question_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_teacher_analytics_teacher_id ON public.teacher_analytics(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_analytics_classroom_id ON public.teacher_analytics(classroom_id);
CREATE INDEX IF NOT EXISTS idx_teacher_analytics_date ON public.teacher_analytics(date);

-- Progress snapshot indexes
CREATE INDEX IF NOT EXISTS idx_student_progress_snapshots_student_id ON public.student_progress_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_snapshots_document_id ON public.student_progress_snapshots(document_id);

-- ============================================================================
-- STUDENT ENROLLMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID REFERENCES public.classrooms(classroom_id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(classroom_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_classroom_id ON public.student_enrollments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON public.student_enrollments(student_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique join code
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS VARCHAR(10) AS $$
DECLARE
    code VARCHAR(10);
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate 6-character alphanumeric code
        code := UPPER(substring(md5(random()::text) from 1 for 6));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.classrooms WHERE join_code = code) INTO exists_check;
        
        EXIT WHEN NOT exists_check;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to create classroom with auto-generated join code
CREATE OR REPLACE FUNCTION create_classroom(
    p_teacher_id UUID,
    p_name VARCHAR(255),
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    classroom_id UUID,
    join_code VARCHAR(10)
) AS $$
DECLARE
    v_classroom_id UUID;
    v_join_code VARCHAR(10);
BEGIN
    v_join_code := generate_join_code();
    
    INSERT INTO public.classrooms (teacher_id, name, description, join_code)
    VALUES (p_teacher_id, p_name, p_description, v_join_code)
    RETURNING classrooms.classroom_id, classrooms.join_code INTO v_classroom_id, v_join_code;
    
    RETURN QUERY SELECT v_classroom_id, v_join_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

-- Classrooms policies
CREATE POLICY "Teachers can manage their classrooms"
    ON public.classrooms FOR ALL 
    USING (
        auth.uid() = teacher_id OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Students can view enrolled classrooms"
    ON public.classrooms FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.student_enrollments 
            WHERE classroom_id = classrooms.classroom_id 
            AND student_id = auth.uid()
        )
    );

-- Teacher documents policies
CREATE POLICY "Teachers can manage their documents"
    ON public.teacher_documents FOR ALL
    USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view documents in enrolled classrooms"
    ON public.teacher_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.student_enrollments se
            JOIN public.classrooms c ON c.classroom_id = se.classroom_id
            WHERE se.student_id = auth.uid()
            AND c.classroom_id = teacher_documents.classroom_id
        )
    );

-- Document chunks policies (same as documents)
CREATE POLICY "Teachers can manage document chunks"
    ON public.document_chunks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.teacher_documents
            WHERE document_id = document_chunks.document_id
            AND teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view document chunks"
    ON public.document_chunks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.teacher_documents td
            JOIN public.student_enrollments se ON se.classroom_id = td.classroom_id
            WHERE td.document_id = document_chunks.document_id
            AND se.student_id = auth.uid()
        )
    );

-- Learning activities policies
CREATE POLICY "Teachers can manage their activities"
    ON public.learning_activities FOR ALL
    USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view activities in enrolled classrooms"
    ON public.learning_activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.teacher_documents td
            JOIN public.student_enrollments se ON se.classroom_id = td.classroom_id
            WHERE td.document_id = learning_activities.document_id
            AND se.student_id = auth.uid()
        )
    );

-- Student activities policies
CREATE POLICY "Students can manage their own activities"
    ON public.student_activities FOR ALL
    USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view student activities in their classrooms"
    ON public.student_activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_activities la
            JOIN public.teacher_documents td ON td.document_id = la.document_id
            WHERE la.activity_id = student_activities.activity_id
            AND td.teacher_id = auth.uid()
        )
    );

-- Activity questions policies (same as activities)
CREATE POLICY "Teachers can manage activity questions"
    ON public.activity_questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_activities
            WHERE activity_id = activity_questions.activity_id
            AND teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view activity questions"
    ON public.activity_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_activities la
            JOIN public.teacher_documents td ON td.document_id = la.document_id
            JOIN public.student_enrollments se ON se.classroom_id = td.classroom_id
            WHERE la.activity_id = activity_questions.activity_id
            AND se.student_id = auth.uid()
        )
    );

-- Student responses policies
CREATE POLICY "Students can manage their own responses"
    ON public.student_responses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.student_activities
            WHERE student_activity_id = student_responses.student_activity_id
            AND student_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view responses in their classrooms"
    ON public.student_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.student_activities sa
            JOIN public.learning_activities la ON la.activity_id = sa.activity_id
            JOIN public.teacher_documents td ON td.document_id = la.document_id
            WHERE sa.student_activity_id = student_responses.student_activity_id
            AND td.teacher_id = auth.uid()
        )
    );

-- Teacher analytics policies
CREATE POLICY "Teachers can manage their analytics"
    ON public.teacher_analytics FOR ALL
    USING (auth.uid() = teacher_id);

-- Student progress snapshots policies
CREATE POLICY "Students can view their own progress"
    ON public.student_progress_snapshots FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view student progress in their classrooms"
    ON public.student_progress_snapshots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.teacher_documents td
            JOIN public.student_enrollments se ON se.classroom_id = td.classroom_id
            WHERE td.document_id = student_progress_snapshots.document_id
            AND td.teacher_id = auth.uid()
        )
    );

-- Student enrollments policies
CREATE POLICY "Teachers can manage enrollments in their classrooms"
    ON public.student_enrollments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms
            WHERE classroom_id = student_enrollments.classroom_id
            AND teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view their own enrollments"
    ON public.student_enrollments FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can enroll themselves"
    ON public.student_enrollments FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON public.classrooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_activities_updated_at
    BEFORE UPDATE ON public.learning_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VECTOR SIMILARITY SEARCH FUNCTION FOR DOCUMENT CHUNKS
-- ============================================================================

CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding VECTOR(1536),
    p_document_id UUID DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    page_number INTEGER,
    chunk_index INTEGER,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        document_chunks.chunk_id,
        document_chunks.document_id,
        document_chunks.content,
        document_chunks.page_number,
        document_chunks.chunk_index,
        1 - (document_chunks.embedding <=> query_embedding) AS similarity
    FROM document_chunks
    WHERE 
        (p_document_id IS NULL OR document_chunks.document_id = p_document_id)
        AND document_chunks.embedding IS NOT NULL
        AND (1 - (document_chunks.embedding <=> query_embedding)) >= match_threshold
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

