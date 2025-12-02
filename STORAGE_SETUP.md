# File Storage Setup Guide

This guide explains how to set up Supabase Storage for the Teacher & Student Platform.

## Prerequisites

- Supabase project created
- Database migration `003_teacher_student_platform.sql` already run
- Backend environment variables configured

## Step 1: Create Supabase Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `documents`
   - **Public bucket**: ✅ Check this (or configure RLS policies)
   - **File size limit**: 50 MB (or your preferred limit)
   - **Allowed MIME types**: 
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
     - `text/plain`
     - `application/msword` (DOC)

5. Click **Create bucket**

## Step 2: Configure Storage Policies (RLS)

If you made the bucket **private**, you need to set up RLS policies:

### Option A: Public Bucket (Simpler)
- Make the bucket public during creation
- Files will be accessible via public URLs
- No additional policies needed

### Option B: Private Bucket with RLS (More Secure)

Run this SQL in Supabase SQL Editor:

```sql
-- Allow teachers to upload files
CREATE POLICY "Teachers can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'teacher-documents' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'teacher'
  )
);

-- Allow teachers to read their own documents
CREATE POLICY "Teachers can read their documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.teacher_documents
    WHERE teacher_documents.file_url LIKE '%' || storage.objects.name
    AND teacher_documents.teacher_id = auth.uid()
  )
);

-- Allow students to read documents from their classrooms
CREATE POLICY "Students can read classroom documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.teacher_documents td
    JOIN public.student_enrollments se ON td.classroom_id = se.classroom_id
    WHERE td.file_url LIKE '%' || storage.objects.name
    AND se.student_id = auth.uid()
  )
);
```

## Step 3: Environment Variables

Add these to your backend `.env` file:

```bash
# Storage Configuration
STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=documents

# Supabase Configuration (should already exist)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 4: Test the Setup

### Test Upload via API

```bash
curl -X POST "http://localhost:8000/api/teacher/documents/upload" \
  -H "Authorization: Bearer YOUR_USER_ID" \
  -F "file=@test.pdf" \
  -F 'metadata={"classroom_id":"YOUR_CLASSROOM_ID","title":"Test Document","generate_activities":true}'
```

### Verify in Supabase Dashboard

1. Go to **Storage** → **documents** bucket
2. Check the `teacher-documents` folder
3. You should see your uploaded file

## Troubleshooting

### Error: "Bucket not found"
- Verify bucket name matches `SUPABASE_STORAGE_BUCKET` env var
- Check bucket exists in Supabase Dashboard

### Error: "Permission denied"
- Check RLS policies if using private bucket
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (bypasses RLS)
- For public bucket, ensure it's marked as public

### Error: "File too large"
- Check bucket file size limit
- Verify file is under 50MB (or your configured limit)

### Error: "Invalid MIME type"
- Check allowed MIME types in bucket settings
- Verify file type matches: PDF, DOCX, or TXT

## File URL Format

After upload, files will be accessible at:
```
https://YOUR_PROJECT.supabase.co/storage/v1/object/public/documents/teacher-documents/UUID.pdf
```

This URL is stored in the `teacher_documents.file_url` column.

## Next Steps

After storage is set up:
1. ✅ File uploads will work
2. ⏳ Document processing (PDF/DOCX extraction) - Next priority
3. ⏳ Activity generation from documents
4. ⏳ Document viewing in student interface

