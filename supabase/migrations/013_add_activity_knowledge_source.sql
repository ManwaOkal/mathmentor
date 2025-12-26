-- Migration 013: Add Knowledge Source Mode and Activity Documents
-- This migration adds support for teacher-controlled knowledge sources in activities

-- Add knowledge_source_mode column to learning_activities
ALTER TABLE public.learning_activities 
ADD COLUMN IF NOT EXISTS knowledge_source_mode VARCHAR(20) DEFAULT 'GENERAL' 
CHECK (knowledge_source_mode IN ('TEACHER_DOCS', 'GENERAL'));

-- Add topic column if it doesn't exist (for better organization)
ALTER TABLE public.learning_activities 
ADD COLUMN IF NOT EXISTS topic VARCHAR(255);

-- Add teaching_style column if it doesn't exist (matching the spec)
ALTER TABLE public.learning_activities 
ADD COLUMN IF NOT EXISTS teaching_style VARCHAR(50);

-- Create activity_documents junction table
-- Links documents to activities (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.activity_documents (
    activity_document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES public.learning_activities(activity_id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.teacher_documents(document_id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_id, document_id, version)
);

-- Create indexes for activity_documents
CREATE INDEX IF NOT EXISTS idx_activity_documents_activity_id 
ON public.activity_documents(activity_id);

CREATE INDEX IF NOT EXISTS idx_activity_documents_document_id 
ON public.activity_documents(document_id);

CREATE INDEX IF NOT EXISTS idx_activity_documents_teacher_id 
ON public.activity_documents(teacher_id);

CREATE INDEX IF NOT EXISTS idx_activity_documents_active 
ON public.activity_documents(activity_id, is_active) WHERE is_active = TRUE;

-- Create index for knowledge_source_mode queries
CREATE INDEX IF NOT EXISTS idx_learning_activities_knowledge_source 
ON public.learning_activities(knowledge_source_mode);

-- RLS Policies for activity_documents
CREATE POLICY "Teachers can manage activity documents"
    ON public.activity_documents FOR ALL
    USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view activity documents in enrolled classrooms"
    ON public.activity_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_activities la
            JOIN public.student_enrollments se ON se.classroom_id = la.classroom_id
            WHERE la.activity_id = activity_documents.activity_id
            AND se.student_id = auth.uid()
        )
    );

-- Update document_chunks to include activity_id for direct activity-based retrieval
ALTER TABLE public.document_chunks 
ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES public.learning_activities(activity_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_chunks_activity_id 
ON public.document_chunks(activity_id) WHERE activity_id IS NOT NULL;

-- Add comment explaining the knowledge_source_mode
COMMENT ON COLUMN public.learning_activities.knowledge_source_mode IS 
'Controls where AI gets information: TEACHER_DOCS (only uploaded documents) or GENERAL (standard math tutor)';



