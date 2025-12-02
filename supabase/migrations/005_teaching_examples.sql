-- Migration: Create teaching_examples table for AI fine-tuning
-- This table stores teacher-curated examples of desired AI teaching behavior

CREATE TABLE IF NOT EXISTS teaching_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    teacher_input TEXT NOT NULL,
    desired_ai_response TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    teaching_style TEXT NOT NULL CHECK (teaching_style IN ('socratic', 'direct', 'guided', 'discovery')),
    learning_objectives TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_teaching_examples_teacher_id ON teaching_examples(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teaching_examples_topic ON teaching_examples(topic);
CREATE INDEX IF NOT EXISTS idx_teaching_examples_created_at ON teaching_examples(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teaching_examples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_teaching_examples_timestamp
    BEFORE UPDATE ON teaching_examples
    FOR EACH ROW
    EXECUTE FUNCTION update_teaching_examples_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE teaching_examples ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can only see their own examples
CREATE POLICY "Teachers can view their own examples"
    ON teaching_examples
    FOR SELECT
    USING (auth.uid() = teacher_id);

-- Policy: Teachers can insert their own examples
CREATE POLICY "Teachers can insert their own examples"
    ON teaching_examples
    FOR INSERT
    WITH CHECK (auth.uid() = teacher_id);

-- Policy: Teachers can update their own examples
CREATE POLICY "Teachers can update their own examples"
    ON teaching_examples
    FOR UPDATE
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Policy: Teachers can delete their own examples
CREATE POLICY "Teachers can delete their own examples"
    ON teaching_examples
    FOR DELETE
    USING (auth.uid() = teacher_id);

COMMENT ON TABLE teaching_examples IS 'Teacher-curated examples for fine-tuning AI teaching behavior';
COMMENT ON COLUMN teaching_examples.topic IS 'The math topic or concept (e.g., "Solving Quadratic Equations")';
COMMENT ON COLUMN teaching_examples.teacher_input IS 'What the student says or asks';
COMMENT ON COLUMN teaching_examples.desired_ai_response IS 'How the teacher wants the AI to respond';
COMMENT ON COLUMN teaching_examples.difficulty IS 'Difficulty level: beginner, intermediate, or advanced';
COMMENT ON COLUMN teaching_examples.teaching_style IS 'Teaching approach: socratic, direct, guided, or discovery';
COMMENT ON COLUMN teaching_examples.learning_objectives IS 'Array of learning objectives for this example';

