# Document Upload Component - Technical Documentation

## Overview

The `DocumentUpload` component (`frontend/components/teacher/DocumentUpload.tsx`) provides a user-friendly interface for teachers to upload educational documents (PDF, DOCX, TXT) to their classrooms. The component handles file selection, validation, upload, and processing status tracking.

## How the Upload Button Works

### 1. HTML Structure and File Picker Trigger

The upload button uses a **label-based approach** to trigger the native file picker dialog:

```tsx
<label
  htmlFor="file-upload"
  className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
>
  <input
    ref={fileInputRef}
    type="file"
    id="file-upload"
    className="hidden"
    accept=".pdf,.docx,.txt"
    onChange={handleFileSelect}
  />
  {/* Visual content */}
</label>
```

**Key Mechanism:**
- The `<label>` element wraps the entire upload area and is associated with the file input via `htmlFor="file-upload"`
- The file input has `id="file-upload"` matching the label's `htmlFor` attribute
- When the user clicks anywhere on the label (including the "Choose File" button), the browser automatically triggers the associated file input
- This is the **standard HTML pattern** for file inputs and works reliably across all browsers

**Why This Approach:**
- ✅ Native browser behavior - no JavaScript required for the click
- ✅ Better accessibility - screen readers understand the label-input relationship
- ✅ Consistent behavior across browsers
- ✅ Works even if JavaScript fails

### 2. File Selection Process

When a user clicks the upload area:

1. **File Picker Opens**: The browser's native file picker dialog appears
2. **File Selection**: User selects a file from their device
3. **`onChange` Event Fires**: The `handleFileSelect` function is triggered

```tsx
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    // Validation and processing...
  }
}
```

### 3. File Validation

Before accepting the file, the component performs two validation checks:

#### A. File Type Validation
```tsx
const allowedTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]
const allowedExtensions = ['.pdf', '.docx', '.txt']
const fileName = file.name.toLowerCase()
const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))

if (!allowedTypes.includes(file.type) && !hasValidExtension) {
  alert('Please upload a PDF, DOCX, or TXT file')
  e.target.value = '' // Reset input
  return
}
```

**Validation Logic:**
- Checks both MIME type (`file.type`) and file extension
- Allows files even if MIME type is missing (some browsers don't set it correctly)
- Resets the input if validation fails so user can try again

#### B. File Size Validation
```tsx
if (file.size > 50 * 1024 * 1024) { // 50MB limit
  alert('File size must be less than 50MB')
  e.target.value = ''
  return
}
```

**Size Limit:** Maximum 50MB per file

### 4. File Selection State

After successful validation:

```tsx
setSelectedFile(file)
if (!title) {
  setTitle(file.name.replace(/\.[^/.]+$/, '')) // Auto-fill title from filename
}
```

**What Happens:**
- File is stored in component state
- UI switches from upload area to file preview
- Document title is auto-filled from filename (extension removed)
- User can edit title and add optional description

### 5. Upload Flow

When user clicks "Upload and Process":

#### Step 1: Pre-upload Validation
```tsx
if (!selectedFile || !title.trim()) {
  alert('Please select a file and enter a title')
  return
}
```

#### Step 2: Upload Initialization
```tsx
setUploading(true)
setUploadStatus('uploading')
setProgress(0)
setProgress(30) // Initial progress
```

#### Step 3: API Call
```tsx
const result = await api.uploadDocument(
  selectedFile,
  classroomId,
  title.trim(),
  description.trim() || undefined,
  true // generateActivities
)
```

**API Request Details:**
- Creates a `FormData` object with:
  - `file`: The actual file blob
  - `metadata`: JSON string containing:
    - `classroom_id`: Target classroom
    - `title`: Document title
    - `description`: Optional description
    - `generate_activities`: Boolean flag
    - `chunking_strategy`: 'semantic'
- Sends POST request to `/api/teacher/documents/upload`
- Includes Authorization header with user ID

#### Step 4: Progress Updates
```tsx
setProgress(80)  // After upload completes
setUploadStatus('processing')  // Backend processing
setProgress(90)
```

#### Step 5: Success Handling
```tsx
setUploadStatus('success')
setProgress(100)
onUploadComplete?.(result.document_id) // Notify parent component

// Auto-reset after 2 seconds
setTimeout(() => {
  setSelectedFile(null)
  setTitle('')
  setDescription('')
  setUploadStatus('idle')
  setProgress(0)
  setDocumentId(null)
}, 2000)
```

### 6. Status Management

The component tracks upload status through a state machine:

| Status | Description | UI Display |
|--------|-------------|------------|
| `idle` | No file selected or ready to upload | Upload area or file preview with form |
| `uploading` | File is being uploaded to server | Progress bar (0-80%) |
| `processing` | Backend is processing the document | Spinner with "Processing..." message |
| `success` | Upload and processing complete | Green checkmark with success message |
| `error` | Upload or processing failed | Red alert icon with error message |

### 7. Error Handling

```tsx
catch (error: any) {
  console.error('Upload error:', error)
  setUploadStatus('error')
  const errorMessage = error?.message || 'Upload failed. Please try again.'
  alert(errorMessage)
} finally {
  setUploading(false)
}
```

**Error Scenarios:**
- Network failures
- File size exceeded
- Invalid file type
- Backend processing errors
- Authentication failures

### 8. Backend Processing

After upload, the backend (`api/routers/teacher.py`) performs:

1. **File Storage**: Uploads file to Supabase Storage
2. **Database Record**: Creates document record in `teacher_documents` table
3. **Asynchronous Processing** (triggered via `DocumentProcessor`):
   - Downloads file from Supabase
   - Extracts text (PDF using `pypdf`, DOCX using `python-docx`, TXT directly)
   - Chunks text semantically
   - Generates embeddings for each chunk
   - Stores chunks in `document_chunks` table
   - Updates document status to `'ready'` or `'failed'`

### 9. Component Props

```tsx
interface DocumentUploadProps {
  classroomId: string           // Required: Target classroom ID
  onUploadComplete?: (documentId: string) => void  // Optional: Callback when upload succeeds
}
```

### 10. User Experience Flow

```
1. User sees upload area with dashed border
   ↓
2. Clicks anywhere on upload area
   ↓
3. File picker opens (native browser dialog)
   ↓
4. User selects file
   ↓
5. File validated (type & size)
   ↓
6. UI shows file preview with title/description form
   ↓
7. User enters title (required) and description (optional)
   ↓
8. User clicks "Upload and Process"
   ↓
9. Progress bar shows upload progress
   ↓
10. Status shows "Processing..." while backend works
   ↓
11. Success message appears
   ↓
12. Form resets after 2 seconds
```

## Technical Implementation Details

### React Hooks Used

- `useState`: Manages component state (file, status, progress, form fields)
- `useRef`: References the hidden file input element
- `useCallback`: Memoizes the upload handler function
- `useEffect`: Verifies file input ref is set after mount

### File Input Accessibility

- Uses `className="hidden"` to visually hide the input while keeping it in the DOM
- Label association ensures keyboard navigation works
- Screen readers can identify the file input through the label

### Pointer Events

The component uses CSS pointer events strategically:
- `pointer-events-none` on inner content div: Allows clicks to pass through to label
- `pointer-events-auto` on button span: Ensures button remains clickable

## Common Issues and Solutions

### Issue: File picker doesn't open
**Solution**: Ensure the label's `htmlFor` matches the input's `id` exactly

### Issue: File validation fails unexpectedly
**Solution**: The component checks both MIME type and extension, so files should work even if MIME type is missing

### Issue: Upload hangs indefinitely
**Solution**: Check backend processing status. The component shows "processing" status while backend works asynchronously

## Related Components

- `DocumentList`: Displays uploaded documents and their processing status
- `ActivityCreation`: Allows creating activities from uploaded documents
- `ActivityList`: Shows activities created from documents

## API Endpoints

- `POST /api/teacher/documents/upload`: Uploads document and metadata
- `GET /api/teacher/documents/{classroom_id}`: Retrieves documents for a classroom

## File Processing Pipeline

```
Upload → Supabase Storage → DocumentProcessor → Text Extraction → 
Chunking → Embedding Generation → Database Storage → Status Update
```

## Future Enhancements

- Drag-and-drop file upload
- Multiple file upload support
- Upload progress with actual file transfer progress
- Preview for PDF files before upload
- Cancel upload functionality






