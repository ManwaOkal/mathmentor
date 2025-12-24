-- Migration: Add activity_id to teaching_examples for activity-specific fine-tuning
-- This allows teaching examples to be scoped to specific activities

ALTER TABLE teaching_examples 
ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES public.learning_activities(activity_id) ON DELETE CASCADE;

-- Create index for faster queries by activity
CREATE INDEX IF NOT EXISTS idx_teaching_examples_activity_id ON teaching_examples(activity_id);

-- Update RLS policy to allow activity-scoped queries
-- (Existing policies already cover teacher_id, so activity_id queries will work)

COMMENT ON COLUMN teaching_examples.activity_id IS 'Optional: Links teaching example to a specific activity. If NULL, example applies to all activities for the teacher.';

