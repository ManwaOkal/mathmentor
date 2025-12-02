-- Add classroom_id column to learning_activities table
-- This allows activities to be directly associated with classrooms

ALTER TABLE public.learning_activities 
ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(classroom_id) ON DELETE SET NULL;

-- Add metadata column for storing additional activity data
ALTER TABLE public.learning_activities 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_learning_activities_classroom_id 
ON public.learning_activities(classroom_id);

-- Create GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_learning_activities_metadata 
ON public.learning_activities USING GIN (metadata);

-- Update activity_type check constraint to include 'conversational'
ALTER TABLE public.learning_activities 
DROP CONSTRAINT IF EXISTS learning_activities_activity_type_check;

ALTER TABLE public.learning_activities 
ADD CONSTRAINT learning_activities_activity_type_check 
CHECK (activity_type IN ('quiz', 'qna', 'interactive', 'reflection', 'conversational'));

-- Update RLS policy to allow students to view activities in their enrolled classrooms
DROP POLICY IF EXISTS "Students can view activities in enrolled classrooms" ON public.learning_activities;

CREATE POLICY "Students can view activities in enrolled classrooms"
    ON public.learning_activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.student_enrollments se
            WHERE se.classroom_id = learning_activities.classroom_id
            AND se.student_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.teacher_documents td
            JOIN public.student_enrollments se ON se.classroom_id = td.classroom_id
            WHERE td.document_id = learning_activities.document_id
            AND se.student_id = auth.uid()
        )
    );

