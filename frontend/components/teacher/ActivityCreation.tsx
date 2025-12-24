'use client'

import { useState } from 'react'
import { BookOpen, X, Save, Clock, CheckCircle, AlertCircle, MessageSquare, Brain, Target } from 'lucide-react'
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

export default function ActivityCreation({
  classroomId,
  onActivityCreated,
  onCancel
}: ActivityCreationProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [teachingStyle, setTeachingStyle] = useState<'socratic' | 'direct' | 'guided' | 'discovery' | 'teacher'>('guided')
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState(15)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    status: 'idle',
    message: ''
  })

  const handleCreate = async () => {
    if (!title.trim()) {
      alert('Please enter an activity title')
      return
    }

    if (!topic.trim()) {
      alert('Please enter a topic for the learning session')
      return
    }

    // Create conversational activity
    await createConversationalActivity()
  }

  const createConversationalActivity = async () => {
    setProcessingStatus({
      status: 'processing',
      message: 'Creating conversational learning activity...',
      progress: 0
    })

    try {
      const result = await api.createConversationalActivity({
        title: title.trim(),
        description: description.trim() || undefined,
        topic: topic.trim(),
        difficulty: difficulty,
        teaching_style: teachingStyle,
        estimated_time_minutes: estimatedTimeMinutes,
        classroom_id: classroomId
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
      setEstimatedTimeMinutes(15)
      setProcessingStatus({ status: 'idle', message: '' })
    }, 3000)
  }


  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Create Activity</h3>
            <p className="text-sm text-gray-500">Create a new learning activity</p>
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
              
              {processingStatus.status === 'processing' && processingStatus.progress !== undefined && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
                    <span>Progress</span>
                    <span>{processingStatus.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${processingStatus.progress}%` }}
                    />
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}

      {/* Activity Form */}
      <div className={`space-y-5 ${processingStatus.status === 'processing' ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Activity Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chapter 1 Quiz or Algebra Practice"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            disabled={processingStatus.status === 'processing'}
          />
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic / Concept *
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Solving Quadratic Equations, Linear Functions, Calculus Basics"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            disabled={processingStatus.status === 'processing'}
          />
          <p className="mt-1 text-xs text-gray-500">
            The main concept or topic students will learn through conversation
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what students will learn..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            disabled={processingStatus.status === 'processing'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty Level *
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
              <option value="socratic">Socratic (Ask questions)</option>
              <option value="direct">Direct (Explain clearly)</option>
              <option value="guided">Guided (Step-by-step)</option>
              <option value="discovery">Discovery (Let student explore)</option>
              <option value="teacher">Teacher (Listen & explain step-by-step)</option>
            </select>
          </div>

          {/* Estimated Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Time (minutes)
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setEstimatedTimeMinutes(Math.max(5, estimatedTimeMinutes - 5))}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                disabled={processingStatus.status === 'processing'}
              >
                <span className="text-lg font-medium">-</span>
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-gray-900">{estimatedTimeMinutes}</span>
                <div className="text-xs text-gray-500">minutes</div>
              </div>
              <button
                type="button"
                onClick={() => setEstimatedTimeMinutes(Math.min(60, estimatedTimeMinutes + 5))}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                disabled={processingStatus.status === 'processing'}
              >
                <span className="text-lg font-medium">+</span>
              </button>
            </div>
          </div>

          {/* Learning Flow Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Learning Flow
            </label>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-3 h-3" />
                  </div>
                  <span className="text-gray-700 font-medium">Teach Phase</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-6 h-6 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-3 h-3" />
                  </div>
                  <span className="text-gray-700 font-medium">Practice Phase</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-6 h-6 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                    <Target className="w-3 h-3" />
                  </div>
                  <span className="text-gray-700 font-medium">Evaluate Phase</span>
                </div>
              </div>
            </div>
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
            disabled={!title.trim() || !topic.trim() || processingStatus.status === 'processing'}
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
                <span>Create Conversational Activity</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

