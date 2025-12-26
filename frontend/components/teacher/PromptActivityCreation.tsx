'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { BookOpen, X, CheckCircle, AlertCircle, Brain, Upload, FileText, Trash2, Info, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'

interface PromptActivityCreationProps {
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

export default function PromptActivityCreation({
  classroomId,
  onActivityCreated,
  onCancel
}: PromptActivityCreationProps) {
  const { session } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 2
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
  const pollingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Update knowledge source mode default when documents change (only auto-switch if no manual selection made)
  useEffect(() => {
    // Only auto-switch if user hasn't manually selected TEACHER_DOCS yet
    // This allows manual selection to work
    if (uploadedDocuments.length > 0 && knowledgeSourceMode === 'GENERAL') {
      // Auto-switch to TEACHER_DOCS when documents are uploaded
      setKnowledgeSourceMode('TEACHER_DOCS')
    }
    // Don't auto-switch back to GENERAL when documents are removed - let user decide
  }, [uploadedDocuments.length]) // Removed knowledgeSourceMode from dependencies

  const pollDocumentStatus = useCallback(async (documentId: string, tempId: string, sessionToken?: string) => {
    const maxAttempts = 60 // 5 minutes max
    let attempts = 0
    const timeoutKey = `${documentId}-${tempId}`

    const poll = async () => {
      try {
        const doc = await api.getDocument(documentId, sessionToken)
        console.log(`[Poll] Document ${documentId} status:`, doc.status, 'Full doc:', doc)
        const status = doc.status || 'parsing'
        
        let mappedStatus: UploadedDocument['status'] = 'parsing'
        if (status === 'ready') {
          mappedStatus = 'ready'
          console.log(`[Poll] Document ${documentId} is READY!`)
        } else if (status === 'failed') {
          mappedStatus = 'error'
        } else if (status === 'processing') {
          mappedStatus = 'parsing'
        }

        setUploadedDocuments(prev => {
          // Check if document still exists in state
          const exists = prev.some(d => d.document_id === tempId || d.document_id === documentId)
          if (!exists) {
            // Document was removed, stop polling
            const existingTimeout = pollingTimeoutsRef.current.get(timeoutKey)
            if (existingTimeout) {
              clearTimeout(existingTimeout)
              pollingTimeoutsRef.current.delete(timeoutKey)
            }
            return prev
          }
          
          const updated = prev.map(d => 
            d.document_id === tempId || d.document_id === documentId
              ? { ...d, document_id: documentId, status: mappedStatus, error_message: doc.metadata?.error }
              : d
          )
          console.log(`[Poll] Updated documents, status for ${documentId}:`, mappedStatus, 'Updated docs:', updated)
          
          // If status is ready or failed, stop polling AFTER state update
          if (mappedStatus === 'ready' || mappedStatus === 'error') {
            console.log(`[Poll] Document ${documentId} is ${mappedStatus}, stopping polling`)
            const existingTimeout = pollingTimeoutsRef.current.get(timeoutKey)
            if (existingTimeout) {
              clearTimeout(existingTimeout)
              pollingTimeoutsRef.current.delete(timeoutKey)
            }
          }
          
          return updated
        })

        // Don't continue polling if status is ready or failed
        if (status === 'ready' || status === 'failed') {
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          const timeoutId = setTimeout(poll, 5000) // Poll every 5 seconds
          pollingTimeoutsRef.current.set(timeoutKey, timeoutId)
        } else {
          // Max attempts reached, clean up
          pollingTimeoutsRef.current.delete(timeoutKey)
        }
      } catch (error) {
        console.error('Error polling document status:', error)
        // Continue polling on error, but clean up if max attempts reached
        attempts++
        if (attempts < maxAttempts) {
          const timeoutId = setTimeout(poll, 5000)
          pollingTimeoutsRef.current.set(timeoutKey, timeoutId)
        } else {
          pollingTimeoutsRef.current.delete(timeoutKey)
        }
      }
    }

    // Start polling after 2 seconds
    const initialTimeout = setTimeout(poll, 2000)
    pollingTimeoutsRef.current.set(timeoutKey, initialTimeout)
  }, [])

  const handleFileUpload = useCallback(async (file: File) => {
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
      const sessionToken = session?.access_token
      if (!sessionToken) {
        throw new Error('Authentication required')
      }

      // Upload document for activity
      const result = await api.uploadActivityDocument(file, classroomId, file.name, undefined, sessionToken)
      
      // Update document with real ID and status
      setUploadedDocuments(prev => prev.map(doc => 
        doc.document_id === tempId 
          ? { ...doc, document_id: result.document_id, status: 'parsing' }
          : doc
      ))

      // Poll for status updates
      pollDocumentStatus(result.document_id, tempId, sessionToken)
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
  }, [session, classroomId, pollDocumentStatus])

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
  }, [handleFileUpload])

  const handleRemoveDocument = (documentId: string) => {
    // Clean up any active polling for this document
    for (const [key, timeout] of pollingTimeoutsRef.current.entries()) {
      if (key.includes(documentId)) {
        clearTimeout(timeout)
        pollingTimeoutsRef.current.delete(key)
      }
    }
    setUploadedDocuments(prev => prev.filter(doc => doc.document_id !== documentId))
  }

  // Cleanup all polling timeouts when component unmounts
  useEffect(() => {
    return () => {
      // Clear all active polling timeouts on unmount
      for (const timeout of pollingTimeoutsRef.current.values()) {
        clearTimeout(timeout)
      }
      pollingTimeoutsRef.current.clear()
    }
  }, [])

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
      const sessionToken = session?.access_token
      if (!sessionToken) {
        throw new Error('Authentication required. Please log in again.')
      }
      
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
      }, sessionToken)

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
      case 'ready': return 'text-green-800 bg-green-100 border border-green-200'
      case 'error': return 'text-red-800 bg-red-100 border border-red-200'
      case 'parsing':
      case 'chunking':
      case 'embedding': return 'text-gray-800 bg-gray-100 border border-gray-200'
      default: return 'text-gray-800 bg-gray-100 border border-gray-200'
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
  
  // Debug: Log document statuses
  useEffect(() => {
    console.log('[Debug] Uploaded documents:', uploadedDocuments.map(d => ({ id: d.document_id, status: d.status, filename: d.filename })))
    console.log('[Debug] Ready docs count:', readyDocsCount, 'Has docs:', hasDocs, 'Knowledge mode:', knowledgeSourceMode)
  }, [uploadedDocuments, readyDocsCount, hasDocs, knowledgeSourceMode])

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return title.trim().length >= 3 && title.trim().length <= 80 && 
               description.trim().length >= 20 && description.trim().length <= 1000 &&
               topic.trim().length > 0 &&
               (knowledgeSourceMode === 'GENERAL' || readyDocsCount > 0)
      case 2:
        return true // Difficulty and teaching style have defaults
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceedToNextStep() && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const steps = [
    { number: 1, title: 'Activity Details', icon: BookOpen },
    { number: 2, title: 'Settings', icon: Brain }
  ]

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-md">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Create Activity
          </h2>
            <p className="text-xs text-gray-500 mt-0.5">Step {currentStep} of {totalSteps}</p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            disabled={processingStatus.status === 'processing'}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-center gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.number
            const isCompleted = currentStep > step.number
            const isLast = index === steps.length - 1
            
            return (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                    isActive 
                      ? 'bg-gray-900 border-gray-900 text-white scale-105 shadow-md' 
                      : isCompleted 
                      ? 'bg-gray-700 border-gray-700 text-white shadow-sm'
                      : 'bg-white border-gray-300 text-gray-400 shadow-sm'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-semibold transition-colors duration-200 ${
                    isActive ? 'text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {!isLast && (
                  <div className={`w-16 h-0.5 mx-3 rounded-full transition-all duration-300 ${
                    isCompleted ? 'bg-gray-700' : isActive ? 'bg-gray-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Processing Status Display */}
      {processingStatus.status !== 'idle' && (
        <div className={`mx-6 mt-4 p-3 rounded-lg border-2 shadow-sm ${
          processingStatus.status === 'processing' ? 'bg-blue-50 border-blue-300' :
          processingStatus.status === 'completed' ? 'bg-green-50 border-green-300' :
          'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center gap-3">
            {processingStatus.status === 'processing' && (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
            {processingStatus.status === 'completed' && (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            )}
            {processingStatus.status === 'failed' && (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`text-xs font-semibold ${
              processingStatus.status === 'processing' ? 'text-blue-900' :
              processingStatus.status === 'completed' ? 'text-green-900' :
              'text-red-900'
            }`}>
              {processingStatus.message}
            </p>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className={`p-6 ${processingStatus.status === 'processing' ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Step 1: Basic Info + Knowledge Source + Documents */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Basic Info Section */}
            <div className="space-y-3">
              <div className="pb-2 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Activity Information</h3>
              </div>
              
        <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1.5">
                  Activity Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Algebra Basics"
            maxLength={80}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-all duration-200 hover:border-gray-300"
            disabled={processingStatus.status === 'processing'}
          />
                <p className="mt-1 text-xs text-gray-500">3-80 characters</p>
        </div>

        <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1.5">
                  Topic <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Solving Linear Equations"
            maxLength={100}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-all duration-200 hover:border-gray-300"
            disabled={processingStatus.status === 'processing'}
          />
        </div>

        <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1.5">
                  Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should the AI teach? Describe the learning objectives and focus areas..."
            rows={3}
            maxLength={1000}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm text-gray-900 placeholder:text-gray-400 resize-none bg-white transition-all duration-200 hover:border-gray-300"
            disabled={processingStatus.status === 'processing'}
          />
                <p className="mt-1 text-xs text-gray-500">{description.length}/1000 characters</p>
              </div>
            </div>

            {/* Knowledge Source Section */}
            <div className="pt-4 border-t border-gray-100">
              <div className="pb-3">
                <h3 className="text-base font-bold text-gray-900 mb-0.5">Knowledge Source</h3>
                <p className="text-xs text-gray-500">Choose where the AI should get its information from</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (processingStatus.status !== 'processing') {
                      setKnowledgeSourceMode('TEACHER_DOCS')
                    }
                  }}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                    knowledgeSourceMode === 'TEACHER_DOCS'
                      ? 'border-gray-900 bg-gray-900 text-white shadow-lg scale-[1.01]'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-[1.005]'
                  }`}
                  disabled={processingStatus.status === 'processing'}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2 rounded-lg ${
                      knowledgeSourceMode === 'TEACHER_DOCS' ? 'bg-white/20' : 'bg-gray-100'
                    }`}>
                      <FileText className={`w-5 h-5 ${
                        knowledgeSourceMode === 'TEACHER_DOCS' ? 'text-white' : 'text-gray-700'
                      }`} />
                    </div>
                    {knowledgeSourceMode === 'TEACHER_DOCS' && (
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <CheckCircle className="w-3.5 h-3.5 text-gray-900" />
                      </div>
                    )}
                  </div>
                  <h4 className={`text-sm font-bold mb-1 ${
                    knowledgeSourceMode === 'TEACHER_DOCS' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Teacher Documents
                  </h4>
                  <p className={`text-xs leading-relaxed ${
                    knowledgeSourceMode === 'TEACHER_DOCS' ? 'text-gray-100' : 'text-gray-600'
                  }`}>
                    AI teaches strictly from your uploaded files
                  </p>
                  {hasDocs && knowledgeSourceMode !== 'TEACHER_DOCS' && (
                    <span className="absolute top-4 right-4 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg">
                      Recommended
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (processingStatus.status !== 'processing') {
                      setKnowledgeSourceMode('GENERAL')
                    }
                  }}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                    knowledgeSourceMode === 'GENERAL'
                      ? 'border-gray-900 bg-gray-900 text-white shadow-lg scale-[1.01]'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-[1.005]'
                  }`}
                  disabled={processingStatus.status === 'processing'}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2 rounded-lg ${
                      knowledgeSourceMode === 'GENERAL' ? 'bg-white/20' : 'bg-gray-100'
                    }`}>
                      <Brain className={`w-5 h-5 ${
                        knowledgeSourceMode === 'GENERAL' ? 'text-white' : 'text-gray-700'
                      }`} />
          </div>
                    {knowledgeSourceMode === 'GENERAL' && (
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <CheckCircle className="w-3.5 h-3.5 text-gray-900" />
                      </div>
                    )}
                  </div>
                  <h4 className={`text-sm font-bold mb-1 ${
                    knowledgeSourceMode === 'GENERAL' ? 'text-white' : 'text-gray-900'
                  }`}>
                    General Knowledge
                  </h4>
                  <p className={`text-xs leading-relaxed ${
                    knowledgeSourceMode === 'GENERAL' ? 'text-gray-100' : 'text-gray-600'
                  }`}>
                    AI uses standard math knowledge
                  </p>
                </button>
        </div>

              {/* Warnings */}
              {knowledgeSourceMode === 'TEACHER_DOCS' && uploadedDocuments.length === 0 && (
                <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-medium text-amber-900">
                      Upload at least one document below or switch to General Knowledge.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Document Upload Section */}
            {knowledgeSourceMode === 'TEACHER_DOCS' && (
              <div className="pt-4 border-t border-gray-100">
                <div className="pb-3">
                  <h3 className="text-base font-bold text-gray-900 mb-0.5">Upload Materials</h3>
                  <p className="text-xs text-gray-500">Upload your curriculum notes, textbook excerpts, or worksheets</p>
                </div>

                {/* Upload Area */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 cursor-pointer bg-white shadow-sm hover:shadow-md group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                      <Upload className="w-6 h-6 text-gray-700" />
                    </div>
          <div>
                      <p className="text-sm font-semibold text-gray-800 mb-1">
                        Drag & drop files here, or <span className="text-gray-900 underline font-bold">click to browse</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, DOCX (Max 50MB per file)
                      </p>
                    </div>
                  </div>
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
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-gray-900">Uploaded Files</h5>
                      <div className="px-2 py-1 bg-gray-100 rounded">
                        <span className="text-xs font-bold text-gray-700">
                          Ready: {readyDocsCount}/{uploadedDocuments.length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {uploadedDocuments.map((doc) => (
                        <div key={doc.document_id} className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 shadow-sm">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded shadow-sm ${
                              doc.status === 'ready' ? 'bg-green-100' :
                              doc.status === 'error' ? 'bg-red-100' :
                              'bg-gray-100'
                            }`}>
                              <FileText className={`w-4 h-4 ${
                                doc.status === 'ready' ? 'text-green-700' :
                                doc.status === 'error' ? 'text-red-700' :
                                'text-gray-700'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-gray-900 truncate mb-0.5">{doc.filename}</div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {doc.file_type.split('/').pop()?.toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500 font-medium">
                                  {new Date(doc.uploaded_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold shadow-sm ${getStatusColor(doc.status)}`}>
                              {doc.status === 'parsing' || doc.status === 'chunking' || doc.status === 'embedding' ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-gray-700 rounded-full animate-pulse"></span>
                                  <span>{getStatusLabel(doc.status)}</span>
                                </span>
                              ) : (
                                getStatusLabel(doc.status)
                              )}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveDocument(doc.document_id)
                              }}
                              className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-all duration-200"
                              disabled={processingStatus.status === 'processing'}
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Settings */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-0.5">Activity Settings</h3>
              <p className="text-xs text-gray-500">Configure difficulty and teaching approach</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  Difficulty <span className="text-red-500">*</span>
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm text-gray-900 cursor-pointer bg-white transition-all duration-200 hover:border-gray-300"
              disabled={processingStatus.status === 'processing'}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  Teaching Style <span className="text-red-500">*</span>
            </label>
            <select
              value={teachingStyle}
              onChange={(e) => setTeachingStyle(e.target.value as any)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm text-gray-900 cursor-pointer bg-white transition-all duration-200 hover:border-gray-300"
              disabled={processingStatus.status === 'processing'}
            >
              <option value="guided">Guided</option>
              <option value="step-by-step">Step-by-step</option>
              <option value="conceptual">Conceptual</option>
              <option value="exam-focused">Exam-focused</option>
            </select>
          </div>
        </div>
          </div>
        )}

        {/* Removed old steps - content moved to step 1 */}
        {false && false && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Teaching Source</h4>
              <p className="text-sm text-gray-600 mb-6">
                Choose where the AI should source its knowledge from for this activity.
              </p>

              <div className="space-y-4">
            <label 
                  className={`flex items-start gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 shadow-sm ${
                    knowledgeSourceMode === 'TEACHER_DOCS' 
                      ? 'border-gray-900 bg-gray-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow'
                  }`}
              onClick={(e) => {
                e.stopPropagation()
                if (processingStatus.status !== 'processing') {
                  setKnowledgeSourceMode('TEACHER_DOCS')
                }
              }}
            >
                  <div className="relative mt-0.5">
              <input
                type="radio"
                name="knowledgeSource"
                value="TEACHER_DOCS"
                checked={knowledgeSourceMode === 'TEACHER_DOCS'}
                onChange={(e) => {
                  e.stopPropagation()
                  setKnowledgeSourceMode(e.target.value as KnowledgeSourceMode)
                }}
                      className="w-4 h-4 cursor-pointer"
                disabled={processingStatus.status === 'processing'}
              />
                  </div>
              <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        Use teacher-uploaded documents
                      </span>
                      {hasDocs && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                          Recommended
                        </span>
                      )}
                </div>
                    <div className="text-sm text-gray-600">
                  AI teaches strictly from uploaded files for this activity.
                </div>
              </div>
            </label>

            <label 
                  className={`flex items-start gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 shadow-sm ${
                    knowledgeSourceMode === 'GENERAL' 
                      ? 'border-gray-900 bg-gray-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow'
                  }`}
              onClick={(e) => {
                e.stopPropagation()
                if (processingStatus.status !== 'processing') {
                  setKnowledgeSourceMode('GENERAL')
                }
              }}
            >
                  <div className="relative mt-0.5">
              <input
                type="radio"
                name="knowledgeSource"
                value="GENERAL"
                checked={knowledgeSourceMode === 'GENERAL'}
                onChange={(e) => {
                  e.stopPropagation()
                  setKnowledgeSourceMode(e.target.value as KnowledgeSourceMode)
                }}
                      className="w-4 h-4 cursor-pointer"
                disabled={processingStatus.status === 'processing'}
              />
                  </div>
              <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 mb-1">
                  Use general math knowledge
                </div>
                    <div className="text-sm text-gray-600">
                  AI acts like a standard math tutor if no files are uploaded.
                </div>
              </div>
            </label>
          </div>

          {/* Warnings */}
          {knowledgeSourceMode === 'TEACHER_DOCS' && uploadedDocuments.length === 0 && (
                <div className="mt-5 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium text-amber-900">
                  No documents uploaded yet. Upload at least one file or switch to General Math Knowledge.
                </p>
              </div>
            </div>
          )}

          {knowledgeSourceMode === 'GENERAL' && hasDocs && (
                <div className="mt-5 p-4 bg-gray-100 border-2 border-gray-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-700">
                  Documents are uploaded but will not be used while this option is selected.
                </p>
              </div>
            </div>
          )}
        </div>

            {/* AI Teaching Rules Summary */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-4">AI Teaching Rules</h4>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
                {knowledgeSourceMode === 'TEACHER_DOCS' && readyDocsCount > 0 && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">AI will use only your uploaded documents.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">AI will use your notation and methods when possible.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">If a student asks something not in your materials, the AI will say it's not covered.</span>
                    </div>
                  </>
                )}
                {knowledgeSourceMode === 'TEACHER_DOCS' && readyDocsCount === 0 && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">No documents uploaded yet.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Upload files to enable document-based teaching.</span>
                    </div>
                  </>
                )}
                {knowledgeSourceMode === 'GENERAL' && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">AI will use general math knowledge.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Uploaded documents will not be referenced.</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Removed - content moved to step 1 */}
        {false && currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Upload Materials</h4>
              <p className="text-sm text-gray-600 mb-6">
            Upload your curriculum notes, textbook excerpts, or worksheets. When 'Teacher-Uploaded Documents' is selected, the AI will only teach from these files.
          </p>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 cursor-pointer bg-white shadow-sm hover:shadow-md"
            onClick={() => fileInputRef.current?.click()}
          >
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-gray-100 rounded-full shadow-sm">
                    <Upload className="w-7 h-7 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-1.5">
                      Drag & drop files here, or <span className="text-gray-900 underline font-bold">click to browse</span>
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      PDF, DOC, DOCX (Max 50MB per file)
                    </p>
                  </div>
                </div>
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
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-bold text-gray-900">Uploaded Files</h5>
                    <div className="px-3 py-1.5 bg-gray-100 rounded-lg shadow-sm">
                      <span className="text-xs font-bold text-gray-700">
                  Ready: {readyDocsCount}/{uploadedDocuments.length}
                      </span>
                </div>
              </div>
                  <div className="space-y-3">
                {uploadedDocuments.map((doc) => (
                      <div key={doc.document_id} className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 shadow-sm">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`p-3 rounded-lg shadow-sm ${
                            doc.status === 'ready' ? 'bg-green-100' :
                            doc.status === 'error' ? 'bg-red-100' :
                            'bg-gray-100'
                          }`}>
                            <FileText className={`w-5 h-5 ${
                              doc.status === 'ready' ? 'text-green-700' :
                              doc.status === 'error' ? 'text-red-700' :
                              'text-gray-700'
                            }`} />
                          </div>
                      <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate mb-1">{doc.filename}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {doc.file_type.split('/').pop()?.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 font-medium">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${getStatusColor(doc.status)}`}>
                        {doc.status === 'parsing' || doc.status === 'chunking' || doc.status === 'embedding' ? (
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-gray-700 rounded-full animate-pulse"></span>
                            <span>{getStatusLabel(doc.status)}</span>
                          </span>
                        ) : (
                          getStatusLabel(doc.status)
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveDocument(doc.document_id)
                        }}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-all duration-200 hover:scale-110 active:scale-95"
                        disabled={processingStatus.status === 'processing'}
                            title="Remove file"
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
                </div>
        )}
                </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
              disabled={processingStatus.status === 'processing'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
          )}
                </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              disabled={processingStatus.status === 'processing'}
            >
              Cancel
            </button>
          )}
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canProceedToNextStep() || processingStatus.status === 'processing'}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg disabled:hover:shadow-md"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={
                !title.trim() || 
                !description.trim() || 
                !topic.trim() ||
                processingStatus.status === 'processing' ||
                (knowledgeSourceMode === 'TEACHER_DOCS' && readyDocsCount === 0)
              }
              className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg disabled:hover:shadow-md"
            >
              {processingStatus.status === 'processing' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Create Activity</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
