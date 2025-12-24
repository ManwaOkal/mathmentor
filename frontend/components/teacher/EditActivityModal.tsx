'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { LearningActivity } from '@/lib/auth/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'

interface EditActivityModalProps {
  isOpen: boolean
  activity: LearningActivity | null
  onClose: () => void
  onUpdated: () => void
}

export default function EditActivityModal({
  isOpen,
  activity,
  onClose,
  onUpdated
}: EditActivityModalProps) {
  const { session } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [teachingStyle, setTeachingStyle] = useState<'socratic' | 'direct' | 'guided' | 'discovery' | 'teacher'>('guided')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (activity) {
      setTitle(activity.title || '')
      setDescription(activity.description || '')
      setDifficulty(activity.difficulty as 'beginner' | 'intermediate' | 'advanced' || 'intermediate')
      // Get teaching style from settings or metadata
      const settings = activity.settings || {}
      const metadata = activity.metadata || {}
      const style = settings.teaching_style || metadata.teaching_style || 'guided'
      setTeachingStyle(style as 'socratic' | 'direct' | 'guided' | 'discovery' | 'teacher')
    }
  }, [activity])

  if (!isOpen || !activity) return null

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter an activity title')
      return
    }

    setSaving(true)
    try {
      const sessionToken = session?.access_token
      if (!sessionToken) {
        throw new Error('Authentication required. Please log in again.')
      }

      // Merge existing settings with teaching style
      const existingSettings = activity.settings || {}
      const updatePayload: {
        title: string
        activity_type: string
        difficulty: string
        settings: Record<string, any>
        description?: string | null
      } = {
        title: title.trim(),
        activity_type: activity.activity_type || 'interactive', // Required by API
        difficulty: difficulty,
        settings: {
          ...existingSettings,
          teaching_style: teachingStyle
        }
      }
      
      // Only include description if it's not empty
      if (description.trim()) {
        updatePayload.description = description.trim()
      } else {
        updatePayload.description = null
      }

      console.log('Updating activity with payload:', updatePayload)
      
      const result = await api.updateActivity(activity.activity_id, updatePayload, sessionToken)

      console.log('Activity update result:', result)
      
      // Small delay to ensure backend has processed the update
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Call onUpdated to refresh the list
      if (onUpdated) {
        await onUpdated()
      }
      onClose()
    } catch (error: any) {
      console.error('Error updating activity:', error)
      let errorMessage = 'Failed to update activity'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error?.message) {
        errorMessage = error.message
      } else if (error?.detail) {
        errorMessage = error.detail
      } else if (error?.error?.detail) {
        errorMessage = error.error.detail
      } else if (typeof error === 'object' && error !== null) {
        // Try to extract message from nested error objects
        errorMessage = JSON.stringify(error).includes('detail') 
          ? (error.detail || error.error?.detail || 'Failed to update activity')
          : 'Failed to update activity'
      }
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-slate-900">Edit Activity</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
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
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Difficulty Level <span className="text-red-500">*</span>
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent cursor-pointer"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Teaching Style */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Way of Teaching <span className="text-red-500">*</span>
              </label>
              <select
                value={teachingStyle}
                onChange={(e) => setTeachingStyle(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent cursor-pointer"
              >
                <option value="socratic">Socratic (Ask questions)</option>
                <option value="direct">Direct (Explain clearly)</option>
                <option value="guided">Guided (Step-by-step)</option>
                <option value="discovery">Discovery (Let student explore)</option>
                <option value="teacher">Teacher (Listen & explain step-by-step)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

