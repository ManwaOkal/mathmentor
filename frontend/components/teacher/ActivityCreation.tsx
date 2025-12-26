'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { BookOpen, X, CheckCircle, AlertCircle, Brain, Upload, FileText, Trash2, Eye, Info, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'

interface ActivityCreationProps {
  classroomId: string
  onActivityCreated?: (activityId: string) => void
  onCancel?: () => void
}

interface ProcessingStatus {
  status: 'idle' | 'processing' | 'completed' | 'failed'
  message: string
  progress?: number
  activityId?: string
  taskId?: string
}

interface UploadedDocument {
  document_id: string
  filename: string
  file_type: string
  uploaded_at: string
  status: 'queued' | 'parsing' | 'chunking' | 'embedding' | 'ready' | 'error'
  error_message?: string
}

type KnowledgeSourceMode = 'TEACHER_DOCS' | 'GENERAL'
type TeachingStyle = 'guided' | 'step-by-step' | 'conceptual' | 'exam-focused'

export default function ActivityCreation({
  classroomId,
  onActivityCreated,
  onCancel
}: ActivityCreationProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>('guided')
  const [knowledgeSourceMode, setKnowledgeSourceMode] = useState<KnowledgeSourceMode>('GENERAL')
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    status: 'idle',
    message: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update knowledge source mode default when documents change
  useEffect(() => {
    if (uploadedDocuments.length > 0 && knowledgeSourceMode === 'GENERAL') {
      // Auto-switch to TEACHER_DOCS when documents are uploaded (only if currently GENERAL)
      setKnowledgeSourceMode('TEACHER_DOCS')
    } else if (uploadedDocuments.length === 0 && knowledgeSourceMode === 'TEACHER_DOCS') {
      // Auto-switch to GENERAL when all documents are removed
      setKnowledgeSourceMode('GENERAL')
    }
  }, [uploadedDocuments.length]) // Only depend on count, not the full array

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach(file => {
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      if (!['pdf', 'doc', 'docx'].includes(fileExt || '')) {
        alert(`File ${file.name} is not supported. Please upload PDF or Word documents.`)
        return
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert(`File ${file.name} is too large. Maximum size is 50MB.`)
        return
      }

      handleFileUpload(file)
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    const tempId = `temp-${Date.now()}-${Math.random()}`
    
    // Add document to list with queued status
    const newDoc: UploadedDocument = {
      document_id: tempId,
      filename: file.name,
      file_type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      uploaded_at: new Date().toISOString(),
      status: 'queued'
    }
    
    setUploadedDocuments(prev => [...prev, newDoc])

    try {
      // Upload document for activity
      const result = await api.uploadActivityDocument(file, classroomId, file.name)
      
      // Update document with real ID and status
      setUploadedDocuments(prev => prev.map(doc => 
        doc.document_id === tempId 
          ? { ...doc, document_id: result.document_id, status: 'parsing' }
          : doc
      ))

      // Poll for status updates
      pollDocumentStatus(result.document_id, tempId)
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadedDocuments(prev => prev.map(doc => 
        doc.document_id === tempId 
          ? { ...doc, status: 'error', error_message: error?.message || 'Upload failed' }
          : doc
      ))
    } finally {
      setUploading(false)
    }
  }

  const pollDocumentStatus = async (documentId: string, tempId: string) => {
    const maxAttempts = 60 // 5 minutes max
    let attempts = 0

    const poll = async () => {
      try {
        const doc = await api.getDocument(documentId)
        const status = doc.status || 'parsing'
        
        let mappedStatus: UploadedDocument['status'] = 'parsing'
        if (status === 'ready') mappedStatus = 'ready'
        else if (status === 'failed') mappedStatus = 'error'
        else if (status === 'processing') mappedStatus = 'parsing'

        setUploadedDocuments(prev => prev.map(d => 
          d.document_id === tempId || d.document_id === documentId
            ? { ...d, document_id: documentId, status: mappedStatus, error_message: doc.metadata?.error }
            : d
        ))

        if (status === 'ready' || status === 'failed') {
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000) // Poll every 5 seconds
        }
      } catch (error) {
        console.error('Error polling document status:', error)
      }
    }

    setTimeout(poll, 2000) // Start polling after 2 seconds
  }

  const handleRemoveDocument = (documentId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.document_id !== documentId))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => {
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      if (['pdf', 'doc', 'docx'].includes(fileExt || '')) {
        handleFileUpload(file)
      }
    })
  }

  const handleCreate = async () => {
    // Validation
    if (!title.trim()) {
      alert('Please enter an activity title')
      return
    }

    if (title.trim().length < 3 || title.trim().length > 80) {
      alert('Activity title must be between 3 and 80 characters')
      return
    }

    if (!description.trim()) {
      alert('Please enter a description')
      return
    }

    if (description.trim().length < 20 || description.trim().length > 1000) {
      alert('Description must be between 20 and 1000 characters')
      return
    }

    if (!topic.trim()) {
      alert('Please enter a topic')
      return
    }

    // Policy A: Strict validation
    if (knowledgeSourceMode === 'TEACHER_DOCS' && uploadedDocuments.length === 0) {
      alert('Please upload at least one document or switch to General Math Knowledge mode')
      return
    }

    const readyDocs = uploadedDocuments.filter(doc => doc.status === 'ready')
    if (knowledgeSourceMode === 'TEACHER_DOCS' && readyDocs.length === 0) {
      alert('Please wait for documents to finish processing or switch to General Math Knowledge mode')
      return
    }

    await createConversationalActivity()
  }

  const createConversationalActivity = async () => {
    setProcessingStatus({
      status: 'processing',
      message: 'Creating conversational learning activity...',
      progress: 0
    })

    try {
      const readyDocIds = uploadedDocuments
        .filter(doc => doc.status === 'ready')
        .map(doc => doc.document_id)

      const result = await api.createConversationalActivity({
        title: title.trim(),
        description: description.trim(),
        topic: topic.trim(),
        difficulty: difficulty,
        teaching_style: teachingStyle,
        estimated_time_minutes: 15,
        classroom_id: classroomId,
        knowledge_source_mode: knowledgeSourceMode,
        document_ids: readyDocIds
      })

      setProcessingStatus({
        status: 'completed',
        message: 'Conversational activity created successfully!',
        activityId: result.activity_id
      })

      if (onActivityCreated) {
        onActivityCreated(result.activity_id)
      }

      resetForm()
    } catch (error: any) {
      console.error('Error creating conversational activity:', error)
      setProcessingStatus({
        status: 'failed',
        message: error?.message || 'Failed to create activity'
      })
    }
  }

  const resetForm = () => {
    setTimeout(() => {
      setTitle('')
      setDescription('')
      setTopic('')
      setDifficulty('intermediate')
      setTeachingStyle('guided')
      setKnowledgeSourceMode('GENERAL')
      setUploadedDocuments([])
      setProcessingStatus({ status: 'idle', message: '' })
    }, 3000)
  }

  const getStatusColor = (status: UploadedDocument['status']) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'parsing':
      case 'chunking':
      case 'embedding': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusLabel = (status: UploadedDocument['status']) => {
    switch (status) {
      case 'queued': return 'Queued'
      case 'parsing': return 'Parsing'
      case 'chunking': return 'Chunking'
      case 'embedding': return 'Embedding'
      case 'ready': return 'Ready'
      case 'error': return 'Error'
      default: return status
    }
  }

  const readyDocsCount = uploadedDocuments.filter(doc => doc.status === 'ready').length
  const hasDocs = uploadedDocuments.length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Create Activity</h3>
            <p className="text-sm text-gray-500">Manage and organize your learning activities</p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={processingStatus.status === 'processing'}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Processing Status Display */}
      {processingStatus.status !== 'idle' && (
        <div className={`mb-6 p-4 rounded-lg border ${
          processingStatus.status === 'processing' ? 'bg-blue-50 border-blue-200' :
          processingStatus.status === 'completed' ? 'bg-green-50 border-green-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            {processingStatus.status === 'processing' && (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
            )}
            {processingStatus.status === 'completed' && (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            )}
            {processingStatus.status === 'failed' && (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                processingStatus.status === 'processing' ? 'text-blue-900' :
                processingStatus.status === 'completed' ? 'text-green-900' :
                'text-red-900'
              }`}>
                {processingStatus.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Form */}
      <div className={`space-y-6 ${processingStatus.status === 'processing' ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Activity Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Algebra Basics"
            maxLength={80}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            disabled={processingStatus.status === 'processing'}
          />
          <p className="mt-1 text-xs text-gray-500">3-80 characters</p>
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Solving Linear Equations"
            maxLength={100}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            disabled={processingStatus.status === 'processing'}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should the AI teach?"
            rows={4}
            maxLength={1000}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            disabled={processingStatus.status === 'processing'}
          />
          <div className="mt-1 flex items-start space-x-1">
            <Info className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              The AI follows your uploaded documents when provided. The description guides focus and style, but does not add new source material.
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-500">{description.length}/1000 characters</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty *
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={processingStatus.status === 'processing'}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Teaching Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teaching Style *
            </label>
            <select
              value={teachingStyle}
              onChange={(e) => setTeachingStyle(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={processingStatus.status === 'processing'}
            >
              <option value="guided">Guided</option>
              <option value="step-by-step">Step-by-step</option>
              <option value="conceptual">Conceptual</option>
              <option value="exam-focused">Exam-focused</option>
            </select>
          </div>
        </div>

        {/* Knowledge Source Section */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Teaching Source</h4>
          <p className="text-xs text-gray-600 mb-4">
            This controls where the AI is allowed to get its information.
          </p>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="knowledgeSource"
                value="TEACHER_DOCS"
                checked={knowledgeSourceMode === 'TEACHER_DOCS'}
                onChange={(e) => setKnowledgeSourceMode(e.target.value as KnowledgeSourceMode)}
                className="mt-1"
                disabled={processingStatus.status === 'processing'}
              />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  Use teacher-uploaded documents {hasDocs && '(recommended)'}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  AI teaches strictly from uploaded files for this activity.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="knowledgeSource"
                value="GENERAL"
                checked={knowledgeSourceMode === 'GENERAL'}
                onChange={(e) => setKnowledgeSourceMode(e.target.value as KnowledgeSourceMode)}
                className="mt-1"
                disabled={processingStatus.status === 'processing'}
              />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  Use general math knowledge
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  AI acts like a standard math tutor if no files are uploaded.
                </div>
              </div>
            </label>
          </div>

          {/* Warnings */}
          {knowledgeSourceMode === 'TEACHER_DOCS' && uploadedDocuments.length === 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  No documents uploaded yet. Upload at least one file or switch to General Math Knowledge.
                </p>
              </div>
            </div>
          )}

          {knowledgeSourceMode === 'GENERAL' && hasDocs && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Documents are uploaded but will not be used while this option is selected.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Document Upload Section */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Upload Materials (PDF or Word)</h4>
          <p className="text-xs text-gray-600 mb-4">
            Upload your curriculum notes, textbook excerpts, or worksheets. When 'Teacher-Uploaded Documents' is selected, the AI will only teach from these files.
          </p>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Drag & drop files here, or click Upload Files
            </p>
            <p className="text-xs text-gray-500">
              PDF, DOC, DOCX (Max 50MB per file, up to 20 files)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={processingStatus.status === 'processing' || uploading}
            />
          </div>

          {/* Uploaded Files List */}
          {uploadedDocuments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Uploaded Files</h5>
              <div className="space-y-2">
                {uploadedDocuments.map((doc) => (
                  <div key={doc.document_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{doc.filename}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">{doc.file_type.split('/').pop()?.toUpperCase()}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {doc.status === 'parsing' || doc.status === 'chunking' || doc.status === 'embedding' ? (
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                            <span>{getStatusLabel(doc.status)}</span>
                          </span>
                        ) : (
                          getStatusLabel(doc.status)
                        )}
                      </span>
                      {doc.status === 'error' && doc.error_message && (
                        <span className="text-xs text-red-600" title={doc.error_message}>
                          Parsing failed. Try re-uploading or use a different file format.
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveDocument(doc.document_id)
                        }}
                        className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors"
                        disabled={processingStatus.status === 'processing'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Teaching Rules Summary Panel */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">AI Teaching Rules for This Activity</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            {knowledgeSourceMode === 'TEACHER_DOCS' && readyDocsCount > 0 && (
              <>
                <div className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">AI will use only your uploaded documents.</span>
                </div>
                <div className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">AI will use your notation and methods when possible.</span>
                </div>
                <div className="flex items-start space-x-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">If a student asks something not in your materials, the AI will say it's not covered.</span>
                </div>
              </>
            )}
            {knowledgeSourceMode === 'TEACHER_DOCS' && readyDocsCount === 0 && (
              <>
                <div className="flex items-start space-x-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">No documents uploaded yet.</span>
                </div>
                <div className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Upload files to enable document-based teaching.</span>
                </div>
                <div className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Or switch to General Math Knowledge.</span>
                </div>
              </>
            )}
            {knowledgeSourceMode === 'GENERAL' && (
              <>
                <div className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">AI will use general math knowledge.</span>
                </div>
                <div className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Uploaded documents will not be referenced.</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50"
              disabled={processingStatus.status === 'processing'}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleCreate}
            disabled={
              !title.trim() || 
              !description.trim() || 
              !topic.trim() ||
              processingStatus.status === 'processing' ||
              (knowledgeSourceMode === 'TEACHER_DOCS' && readyDocsCount === 0)
            }
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {processingStatus.status === 'processing' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Create</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
