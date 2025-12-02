'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { BookOpen, Calendar, Edit, Trash2, CheckCircle, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { LearningActivity } from '@/lib/auth/types'
import { useAuth } from '@/lib/auth/useAuth'

interface ActivityListProps {
  classroomId: string
  onSelectActivity?: (activityId: string) => void
}

export default function ActivityList({ classroomId, onSelectActivity }: ActivityListProps) {
  const { session } = useAuth()
  const [activities, setActivities] = useState<LearningActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const loadActivities = useCallback(async () => {
    // Prevent concurrent loads
    if (loadingRef.current) return
    loadingRef.current = true
    
    try {
      setLoading(true)
      const sessionToken = session?.access_token || null
      if (!sessionToken) {
        console.warn('No session token available for loading activities')
        return
      }
      const result = await api.getClassroomActivities(classroomId, sessionToken)
      if (result && result.activities) {
        setActivities(result.activities)
      } else if (Array.isArray(result)) {
        // Handle case where API returns array directly
        setActivities(result)
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [classroomId, session?.access_token])

  useEffect(() => {
    if (!session?.access_token || !classroomId) return
    
    loadActivities()
    // Auto-refresh every 30 seconds to catch new activities (reduced frequency)
    const interval = setInterval(() => {
      loadActivities()
    }, 30000) // Increased to 30 seconds
    
    return () => clearInterval(interval)
  }, [loadActivities])

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'qna':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'interactive':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'reflection':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'intermediate':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'advanced':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const handleDeleteActivity = async (activityId: string, force: boolean = false) => {
    if (confirmDeleteId !== activityId) {
      setConfirmDeleteId(activityId)
      return
    }

    // If this is the second click and we got an error about students being assigned,
    // ask for confirmation to force delete
    if (force === false) {
      const shouldForce = window.confirm(
        'This activity may have student assignments. Do you want to delete it anyway? ' +
        'This will remove all student progress for this activity.'
      )
      if (!shouldForce) {
        setConfirmDeleteId(null)
        return
      }
      force = true
    }

    setDeletingActivityId(activityId)
    try {
      await api.deleteActivity(activityId, force)
      // Remove from local state
      setActivities(activities.filter(a => a.activity_id !== activityId))
      setConfirmDeleteId(null)
      alert('Activity deleted successfully')
    } catch (error) {
      console.error('Error deleting activity:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // If error mentions force=true, offer to force delete
      if (errorMessage.includes('force=true') || errorMessage.includes('started or completed')) {
        const shouldForce = window.confirm(
          errorMessage + '\n\nDo you want to delete anyway? This will remove all student progress.'
        )
        if (shouldForce) {
          // Retry with force
          try {
            await api.deleteActivity(activityId, true)
            setActivities(activities.filter(a => a.activity_id !== activityId))
            setConfirmDeleteId(null)
            alert('Activity deleted successfully (all student assignments removed)')
          } catch (forceError) {
            alert(`Error deleting activity: ${forceError instanceof Error ? forceError.message : 'Unknown error'}`)
          }
        }
      } else {
        alert(`Error deleting activity: ${errorMessage}`)
      }
    } finally {
      setDeletingActivityId(null)
      setConfirmDeleteId(null)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-500 py-8 text-sm">Loading activities...</div>
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-slate-400" />
        </div>
        <p className="text-slate-600 mb-2 font-medium">No activities created yet</p>
        <p className="text-sm text-slate-500">Create an activity to get started</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Table-like structure without boxes */}
      <div className="space-y-1">
        {activities.map((activity, index) => (
          <div
            key={activity.activity_id}
            className={`flex flex-col sm:flex-row items-start py-4 sm:py-5 px-1 ${
              index !== activities.length - 1 ? 'border-b border-slate-100' : ''
            } hover:bg-slate-50/50 transition-colors rounded-lg`}
          >
            {/* Top row: Icon + Content */}
            <div className="flex items-start flex-1 min-w-0 w-full sm:w-auto">
              {/* Icon - Larger and more prominent */}
              <div className="flex-shrink-0 mr-3 sm:mr-4 mt-0.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                </div>
              </div>

              {/* Main Content - Constrained width */}
              <div className="flex-1 min-w-0 max-w-2xl">
                {/* Title - Stronger hierarchy */}
                <h4 className="text-sm sm:text-base font-medium text-slate-900 mb-1.5 leading-snug">
                  {activity.title}
                </h4>
                
                {/* Description - Lighter, smaller */}
                {activity.description && (
                  <p className="text-xs sm:text-sm text-slate-500 mb-2 sm:mb-3 leading-relaxed font-light line-clamp-2">
                    {activity.description}
                  </p>
                )}

                {/* Tags - Unified style */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Activity Type */}
                  <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-light bg-slate-100 text-slate-600">
                    {activity.activity_type}
                  </span>

                  {/* Difficulty */}
                  <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-light ${
                    activity.difficulty === 'beginner'
                      ? 'bg-slate-100 text-slate-600'
                      : activity.difficulty === 'intermediate'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {activity.difficulty}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom row (mobile) / Right side (desktop) - Date and Actions */}
            <div className="flex-shrink-0 mt-3 sm:mt-0 sm:ml-6 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-2 w-full sm:w-auto">
              {/* Date */}
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-light">
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{new Date(activity.created_at).toLocaleDateString()}</span>
                <span className="xs:hidden">{new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>

              {/* Actions - Minimal, right-aligned */}
              <div className="flex items-center gap-2">
                {onSelectActivity && (
                  <button
                    onClick={() => onSelectActivity(activity.activity_id)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-2 py-1 rounded hover:bg-slate-100"
                    title="View details"
                  >
                    View
                  </button>
                )}
                <button
                  onClick={() => handleDeleteActivity(activity.activity_id)}
                  disabled={deletingActivityId === activity.activity_id}
                  className={`p-1.5 rounded transition-colors ${
                    confirmDeleteId === activity.activity_id
                      ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      : deletingActivityId === activity.activity_id
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title="Delete activity"
                >
                  {deletingActivityId === activity.activity_id ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : confirmDeleteId === activity.activity_id ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

