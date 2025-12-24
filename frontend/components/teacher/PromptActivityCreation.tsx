'use client'

import { useState } from 'react'
import { Brain, Loader2, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'
import { useTeacherLayout } from './TeacherLayout'

interface PromptActivityCreationProps {
  classroomId: string
  onActivityCreated?: (activityId: string) => void
  onCancel?: () => void
}

export default function PromptActivityCreation({
  classroomId,
  onActivityCreated,
  onCancel
}: PromptActivityCreationProps) {
  const { session } = useAuth()
  const { setActiveSection } = useTeacherLayout()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [teachingStyle, setTeachingStyle] = useState<'socratic' | 'direct' | 'guided' | 'discovery' | 'teacher'>('guided')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!title.trim()) {
      alert('Please enter an activity title')
      return
    }

    if (!topic.trim()) {
      alert('Please enter a topic for the learning session')
      return
    }

    if (!description.trim()) {
      alert('Please provide a description telling the AI what to teach')
      return
    }

    setGenerating(true)

    try {
      const sessionToken = session?.access_token
      
      if (!sessionToken) {
        throw new Error('Authentication required. Please log in again.')
      }
      
      // Create conversational activity with explicit session token
      const result = await api.createConversationalActivity({
        title: title.trim(),
        description: description.trim(),
        topic: topic.trim(),
        difficulty: difficulty,
        teaching_style: teachingStyle,
        estimated_time_minutes: 15, // Default value
        classroom_id: classroomId
      }, sessionToken)

      if (onActivityCreated) {
        onActivityCreated(result.activity_id)
      }

      // Navigate to finetuning section
      setActiveSection('finetuning')
      
      // Reset form
      setTitle('')
      setDescription('')
      setTopic('')
      setDifficulty('intermediate')
      setTeachingStyle('guided')
    } catch (error: any) {
      console.error('Error creating activity:', error)
      alert(error?.message || 'Failed to create activity')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
            Create Activity
          </h2>
          <p className="text-sm text-slate-600">
            Create a new learning activity for your classroom
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={generating}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Activity Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Algebra Basics Learning Session"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm text-slate-900 placeholder:text-slate-400 transition-all"
            disabled={generating}
          />
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Topic / Concept <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Solving Linear Equations, Factoring Polynomials"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm text-slate-900 placeholder:text-slate-400 transition-all"
            disabled={generating}
          />
        </div>

        {/* Description - Now Required */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell the AI what to teach..."
            rows={4}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm text-slate-900 placeholder:text-slate-400 resize-none transition-all"
            disabled={generating}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Describe what you want the AI to teach and how you want it to approach the topic
          </p>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Difficulty Level <span className="text-red-500">*</span>
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm text-slate-900 cursor-pointer transition-all"
              disabled={generating}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Teaching Style */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Teaching Style <span className="text-red-500">*</span>
            </label>
            <select
              value={teachingStyle}
              onChange={(e) => setTeachingStyle(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm text-slate-900 cursor-pointer transition-all"
              disabled={generating}
            >
              <option value="socratic">Socratic (Ask questions)</option>
              <option value="direct">Direct (Explain clearly)</option>
              <option value="guided">Guided (Step-by-step)</option>
              <option value="discovery">Discovery (Let student explore)</option>
              <option value="teacher">Teacher (Listen & explain step-by-step)</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 hover:border-slate-300"
              disabled={generating}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={!title.trim() || !topic.trim() || !description.trim() || generating}
            className="px-6 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Create Activity</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
