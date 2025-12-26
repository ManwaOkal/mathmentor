-- Migration 014: Increase file_type column length to support longer MIME types
-- Some MIME types like application/vnd.openxmlformats-officedocument.wordprocessingml.document exceed 50 chars

ALTER TABLE public.teacher_documents 
ALTER COLUMN file_type TYPE VARCHAR(100);

-- Add comment explaining the change
COMMENT ON COLUMN public.teacher_documents.file_type IS 
'File MIME type (e.g., application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)';



