'use client'

import { useEffect, useState } from 'react'
import { FileText, CheckCircle, AlertCircle, Clock, Plus, Sparkles, Brain } from 'lucide-react'
import { api } from '@/lib/api'

interface Document {
  document_id: string
  title: string
  description?: string
  filename: string
  file_type: string
  file_size: number
  status: 'processing' | 'ready' | 'failed'
  uploaded_at: string
  metadata?: Record<string, any>
}

interface DocumentListProps {
  classroomId: string
  onSelectDocument?: (documentId: string) => void
}

export default function DocumentList({ classroomId, onSelectDocument }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null) // Track which document is generating
  const [processingIntelligently, setProcessingIntelligently] = useState<string | null>(null) // Track intelligent processing

  useEffect(() => {
    loadDocuments()
    // Refresh every 5 seconds to check processing status (reduced from 2s to prevent connection leaks)
    // Continue polling even if there are errors
    let isMounted = true
    const interval = setInterval(() => {
      if (!isMounted) return
      // Skip cache to always get fresh status during polling
      loadDocuments(true).catch(err => {
        if (!isMounted) return
        // Silently handle errors - don't stop polling
        const isTimeout = err?.message?.includes('timeout') || err?.message?.includes('Request timeout')
        if (!isTimeout) {
          console.error('Polling error (will retry):', err)
        }
        // Continue polling even on timeout - status will update on next successful poll
      })
    }, 5000) // Poll every 5 seconds (reduced frequency to prevent connection leaks)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [classroomId])

  const loadDocuments = async (skipCache: boolean = false) => {
    try {
      const result = await api.getClassroomDocuments(classroomId, skipCache)
      if (result && result.documents) {
        setDocuments(result.documents)
        // Stop loading after first successful load
        setLoading(false)
      }
    } catch (error: any) {
      // Handle timeout and other errors gracefully
      const isTimeout = error?.message?.includes('timeout') || error?.message?.includes('Request timeout')
      
      if (isTimeout) {
        // On timeout, just log and continue polling - don't show error
        console.log('Document list request timed out, will retry on next poll...')
      } else {
        console.error('Error loading documents:', error)
      }
      
      // Set loading to false after first attempt (even if it fails)
      // This prevents indefinite loading spinner
      if (loading) {
        setLoading(false)
      }
    }
  }

  const handleProcessIntelligently = async (documentId: string) => {
    if (processingIntelligently === documentId) return
    
    setProcessingIntelligently(documentId)
    try {
      console.log('Processing document intelligently:', documentId)
      const result = await api.processDocumentIntelligently(documentId)
      console.log('Intelligent processing result:', result)
      alert(`Document analyzed! Found ${result.analysis?.total_segments || 0} educational segments covering ${result.analysis?.topics_covered?.length || 0} topics.`)
      // Refresh documents to show updated status
      await loadDocuments()
    } catch (error: any) {
      console.error('Error processing document intelligently:', error)
      const errorMessage = error?.message || error?.detail || 'Failed to process document intelligently'
      alert(`Error: ${errorMessage}`)
    } finally {
      setProcessingIntelligently(null)
    }
  }

  const handleGenerateActivities = async (documentId: string, useSmartProcessing: boolean = false) => {
    if (generating === documentId) return // Prevent double-clicks
    
    setGenerating(documentId)
    try {
      console.log('Generating activities for document:', documentId, 'Smart processing:', useSmartProcessing)
      const result = await api.generateActivities(documentId, 10, useSmartProcessing)
      console.log('Generate activities result:', result)
      alert(`Generated ${result.activities_generated || 0} activities from document`)
      // Refresh documents to show updated status
      await loadDocuments()
    } catch (error: any) {
      console.error('Error generating activities:', error)
      const errorMessage = error?.message || error?.detail || 'Failed to generate activities'
      alert(`Error: ${errorMessage}`)
    } finally {
      setGenerating(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Loading documents...</div>
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500 mb-2">No documents uploaded yet</p>
        <p className="text-sm text-gray-400">Upload a document to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
        <span className="text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.document_id}
            className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
              selectedDocument === doc.document_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{doc.title}</h4>
                    {doc.description && (
                      <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs text-gray-500 ml-9">
                  <span>{doc.filename}</span>
                  <span>•</span>
                  <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  <span>•</span>
                  <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                </div>

                {/* Status Badge */}
                <div className="mt-3 ml-9">
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(doc.status)}`}>
                    {getStatusIcon(doc.status)}
                    <span className="capitalize">{doc.status}</span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4 flex-wrap gap-2">
                {doc.status === 'ready' && (
                  <>
                    {/* Intelligent Processing Button */}
                    {!doc.metadata?.educational_analysis && (
                      <button
                        onClick={() => handleProcessIntelligently(doc.document_id)}
                        disabled={processingIntelligently === doc.document_id}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Analyze document for educational content"
                      >
                        {processingIntelligently === doc.document_id ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4" />
                            <span>AI Analysis</span>
                          </>
                        )}
                      </button>
                    )}
                    
                    {/* Show analysis status if already processed */}
                    {doc.metadata?.educational_analysis && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                        <CheckCircle className="w-3 h-3" />
                        <span>{doc.metadata.educational_analysis.total_segments || 0} segments</span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleGenerateActivities(doc.document_id, !!doc.metadata?.educational_analysis)}
                      disabled={generating === doc.document_id}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Generate activities using AI"
                    >
                      {generating === doc.document_id ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Activities</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDocument(doc.document_id)
                        if (onSelectDocument) {
                          onSelectDocument(doc.document_id)
                        }
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Activity</span>
                    </button>
                  </>
                )}
                {doc.status === 'processing' && (
                  <span className="text-sm text-blue-600">Processing...</span>
                )}
                {doc.status === 'failed' && (
                  <span className="text-sm text-red-600">Processing failed</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

