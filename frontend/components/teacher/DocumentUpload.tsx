'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface DocumentUploadProps {
  classroomId: string
  onUploadComplete?: (documentId: string) => void
}

export default function DocumentUpload({ 
  classroomId, 
  onUploadComplete 
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle')
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Verify the ref is set after mount
    if (fileInputRef.current) {

    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      const allowedExtensions = ['.pdf', '.docx', '.txt']
      const fileName = file.name.toLowerCase()
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
      
      if (!allowedTypes.includes(file.type) && !hasValidExtension) {
        alert('Please upload a PDF, DOCX, or TXT file')
        // Reset input to allow trying again
        e.target.value = ''
        return
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB')
        // Reset input to allow trying again
        e.target.value = ''
        return
      }

      setSelectedFile(file)
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '')) // Remove extension
      }
    }
  }

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !title.trim()) {
      alert('Please select a file and enter a title')
      return
    }

    setUploading(true)
    setUploadStatus('uploading')
    setProgress(0)

    try {
      // Upload file using the API
      setProgress(30) // Initial progress
      
      const result = await api.uploadDocument(
        selectedFile,
        classroomId,
        title.trim(),
        description.trim() || undefined,
        true // generateActivities
      )
      
      setProgress(80)
      setDocumentId(result.document_id)
      
      // Backend handles processing asynchronously
      setUploadStatus('processing')
      setProgress(90)

      // Wait a moment to show processing status
      await new Promise(resolve => setTimeout(resolve, 1000))

      setUploadStatus('success')
      setProgress(100)

      if (onUploadComplete) {
        onUploadComplete(result.document_id)
      }

      // Reset form after 2 seconds to allow user to see success message
      setTimeout(() => {
        setSelectedFile(null)
        setTitle('')
        setDescription('')
        setUploadStatus('idle')
        setProgress(0)
        setDocumentId(null)
      }, 2000)

    } catch (error: any) {
      // Error occurred
      setUploadStatus('error')
      const errorMessage = error?.message || 'Upload failed. Please try again.'
      alert(errorMessage)
    } finally {
      setUploading(false)
    }
  }, [selectedFile, title, description, classroomId, onUploadComplete])

  const handleRemove = () => {
    setSelectedFile(null)
    setTitle('')
    setDescription('')
    setUploadStatus('idle')
    setProgress(0)
  }

  // Removed handleChooseFile - using inline handler instead

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!selectedFile ? (
        <label
          htmlFor="file-upload"
          className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            className="sr-only"
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <div className="text-lg font-medium text-gray-900 mb-2">
              Upload Document
            </div>
            <div className="text-sm text-gray-500 mb-4">
              PDF, DOCX, or TXT files up to 50MB
            </div>
            <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Choose File
            </span>
          </div>
        </label>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4">
          {/* File Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">{selectedFile.name}</div>
                <div className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
            {uploadStatus === 'idle' && (
              <button
                onClick={handleRemove}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Title and Description */}
          {uploadStatus === 'idle' && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter document title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this document"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadStatus === 'uploading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="text-gray-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Processing Status */}
          {uploadStatus === 'processing' && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm">Processing document and generating activities...</span>
            </div>
          )}

          {/* Success Status */}
          {uploadStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Document uploaded and processed successfully!</span>
            </div>
          )}

          {/* Error Status */}
          {uploadStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">Upload failed. Please try again.</span>
            </div>
          )}

          {/* Upload Button */}
          {uploadStatus === 'idle' && (
            <button
              onClick={handleUpload}
              disabled={!title.trim() || uploading}
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Upload and Process
            </button>
          )}
        </div>
      )}
    </div>
  )
}

