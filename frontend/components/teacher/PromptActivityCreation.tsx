'use client'

import { useState } from 'react'
import { Sparkles, X, Brain, Loader2, BookOpen, MessageSquare, Target, Plus, Minus, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'

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
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [teachingStyle, setTeachingStyle] = useState<'socratic' | 'direct' | 'guided' | 'discovery'>('guided')
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState(15)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('Please enter a topic for the learning session')
      return
    }

    if (!title.trim()) {
      alert('Please enter an activity title')
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
        description: description.trim() || undefined,
        topic: topic.trim(),
        difficulty: difficulty,
        teaching_style: teachingStyle,
        estimated_time_minutes: estimatedTimeMinutes,
        classroom_id: classroomId
      }, sessionToken)

      if (onActivityCreated) {
        onActivityCreated(result.activity_id)
      }

      // Show assignment status
      const assignedCount = (result as any).assigned_count || 0
      const assignmentError = (result as any).assignment_error
      
      if (assignedCount > 0) {
        alert(`Conversational learning activity created successfully!\n\nAssigned to ${assignedCount} student(s).`)
      } else if (assignmentError) {
        alert(`Activity created successfully, but assignment failed:\n${assignmentError}\n\nYou can manually assign this activity to students.`)
      } else {
        alert('Conversational learning activity created successfully!\n\nNote: No students were assigned. Please assign this activity manually.')
      }
      
      // Reset form
      setTitle('')
      setDescription('')
      setTopic('')
      setDifficulty('intermediate')
      setTeachingStyle('guided')
      setEstimatedTimeMinutes(15)
    } catch (error: any) {
      console.error('Error creating activity:', error)
      alert(error?.message || 'Failed to create activity')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
          Create Conversational Activity
        </h2>
        <p className="text-sm text-slate-600">
          Design an interactive learning session where students learn through conversation
        </p>
      </div>

      {/* Form - No giant container, just clean spacing */}
      <div className="space-y-8">
        {/* Section 1: Basic Information */}
        <section className="space-y-5">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Basic Information
          </h3>
          
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Activity Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Algebra Basics Learning Session"
                className="w-full px-3 py-2 text-sm border-b-2 border-slate-200 bg-transparent focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-400"
              />
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Topic / Concept <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Solving Linear Equations, Factoring Polynomials"
                className="w-full px-3 py-2 text-sm border-b-2 border-slate-200 bg-transparent focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-400"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                The main concept or topic students will learn through conversation
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description <span className="text-slate-400 text-xs font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what students will learn..."
                rows={2}
                className="w-full px-3 py-2 text-sm border-b-2 border-slate-200 bg-transparent focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-400 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Configuration */}
        <section className="space-y-5">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Difficulty Level <span className="text-red-500">*</span>
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border-b-2 border-slate-200 bg-transparent focus:outline-none focus:border-slate-900 transition-colors cursor-pointer"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Teaching Style */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Teaching Style <span className="text-red-500">*</span>
              </label>
              <select
                value={teachingStyle}
                onChange={(e) => setTeachingStyle(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border-b-2 border-slate-200 bg-transparent focus:outline-none focus:border-slate-900 transition-colors cursor-pointer"
              >
                <option value="socratic">Socratic (Ask questions)</option>
                <option value="direct">Direct (Explain clearly)</option>
                <option value="guided">Guided (Step-by-step)</option>
                <option value="discovery">Discovery (Let student explore)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 3: Duration & Flow */}
        <section className="space-y-5">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Duration & Flow
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estimated Time - Modernized */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Estimated Time
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEstimatedTimeMinutes(Math.max(5, estimatedTimeMinutes - 5))}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-300 hover:border-slate-900 hover:bg-slate-50 transition-all"
                  aria-label="Decrease time"
                >
                  <Minus className="w-3.5 h-3.5 text-slate-600" />
                </button>
                <div className="flex-1 text-center py-2">
                  <span className="text-2xl font-semibold text-slate-900">{estimatedTimeMinutes}</span>
                  <span className="text-sm text-slate-500 ml-1">min</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEstimatedTimeMinutes(Math.min(60, estimatedTimeMinutes + 5))}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-300 hover:border-slate-900 hover:bg-slate-50 transition-all"
                  aria-label="Increase time"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Learning Flow - Horizontal Timeline */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Learning Flow
              </label>
              <div className="flex items-center gap-2">
                {/* Teach Phase */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-900 truncate">Teach</div>
                  </div>
                </div>
                
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                
                {/* Practice Phase */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-900 truncate">Practice</div>
                  </div>
                </div>
                
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                
                {/* Evaluate Phase */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-900 truncate">Evaluate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Actions - Clean divider and spacing */}
        <div className="pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 hover:border-slate-300"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={!title.trim() || !topic.trim() || generating || creating}
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
                  <span>Create Conversational Activity</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
