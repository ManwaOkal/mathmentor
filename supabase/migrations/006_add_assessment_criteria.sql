-- Migration: Add assessment_criteria column to teaching_examples table

-- Add assessment_criteria column as TEXT array (to match learning_objectives structure)
ALTER TABLE teaching_examples 
ADD COLUMN IF NOT EXISTS assessment_criteria TEXT[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN teaching_examples.assessment_criteria IS 'Array of assessment criteria for evaluating student understanding';

