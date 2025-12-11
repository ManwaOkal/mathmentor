-- Add fields for Adaptive Tutor System
-- This migration adds support for success criteria, teaching approach, and enhanced question metadata

-- Add success_criteria column to learning_activities
ALTER TABLE public.learning_activities 
ADD COLUMN IF NOT EXISTS success_criteria TEXT[];

-- Add teaching_approach column to learning_activities
ALTER TABLE public.learning_activities 
ADD COLUMN IF NOT EXISTS teaching_approach VARCHAR(50) CHECK (teaching_approach IN ('socratic', 'direct', 'guided', 'discovery'));

-- Add concept column to activity_questions for better tracking
ALTER TABLE public.activity_questions 
ADD COLUMN IF NOT EXISTS concept VARCHAR(255);

-- Create index for teaching_approach queries
CREATE INDEX IF NOT EXISTS idx_learning_activities_teaching_approach 
ON public.learning_activities(teaching_approach);

-- Create index for concept queries in questions
CREATE INDEX IF NOT EXISTS idx_activity_questions_concept 
ON public.activity_questions(concept);

-- Add comment explaining the fields
COMMENT ON COLUMN public.learning_activities.success_criteria IS 'Array of success criteria for activity completion (e.g., complete_all_questions, master_key_concepts, achieve_threshold 80%)';
COMMENT ON COLUMN public.learning_activities.teaching_approach IS 'Teaching style: socratic (ask questions), direct (explain clearly), guided (step-by-step), discovery (let student explore)';
COMMENT ON COLUMN public.activity_questions.concept IS 'The mathematical concept this question tests (e.g., linear equations, factoring, derivatives)';



