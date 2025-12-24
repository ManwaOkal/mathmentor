'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { BookOpen, Calendar, Edit, Trash2, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { LearningActivity } from '@/lib/auth/types'
import { useAuth } from '@/lib/auth/useAuth'
import DeleteActivityModal from './DeleteActivityModal'
import EditActivityModal from './EditActivityModal'

interface ActivityListProps {
  classroomId: string
  onSelectActivity?: (activityId: string) => void
}

export default function ActivityList({ classroomId, onSelectActivity }: ActivityListProps) {
  const { session } = useAuth()
  const [activities, setActivities] = useState<LearningActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null)
  const [deleteModalActivity, setDeleteModalActivity] = useState<LearningActivity | null>(null)
  const [deleteModalHasAssignments, setDeleteModalHasAssignments] = useState(false)
  const [deleteModalStartedCount, setDeleteModalStartedCount] = useState(0)
  const [deleteModalNeedsForce, setDeleteModalNeedsForce] = useState(false)
  const [editModalActivity, setEditModalActivity] = useState<LearningActivity | null>(null)
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
      // API always returns an array, but handle edge cases
      const activitiesList = Array.isArray(result) ? result : []
      setActivities(activitiesList)
      
      // Cache the activities
      if (classroomId) {
        const cacheKey = `activities_cache_${classroomId}`
        localStorage.setItem(cacheKey, JSON.stringify({
          activities: activitiesList,
          timestamp: Date.now()
        }))
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
    
    // Check cache first
    const cacheKey = `activities_cache_${classroomId}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const cachedData = JSON.parse(cached)
        const cacheAge = Date.now() - (cachedData.timestamp || 0)
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          // Show cached data immediately
          setActivities(cachedData.activities || [])
          setLoading(false)
          // Load fresh data in background (silently updates cache)
          loadActivities()
          return
        }
      } catch (e) {
        console.error('Error parsing cached activities:', e)
      }
    }
    
    // No cache or cache expired, load fresh
    loadActivities()
  }, [loadActivities, classroomId, session?.access_token])

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

  const handleDeleteClick = async (activity: LearningActivity) => {
    // Show modal immediately, then check for student assignments
    setDeleteModalActivity(activity)
    setDeleteModalHasAssignments(false)
    setDeleteModalStartedCount(0)
    setDeleteModalNeedsForce(false)
    
    const sessionToken = session?.access_token
    if (!sessionToken) {
      alert('Authentication required. Please log in again.')
      setDeleteModalActivity(null)
      return
    }
    
    try {
      // Try a test delete to see if there are student assignments
      await api.deleteActivity(activity.activity_id, false, sessionToken)
      // If successful, no assignments - modal will show simple confirmation
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // If error mentions students who started/completed, we need force delete
      if (errorMessage.includes('started or completed')) {
        const match = errorMessage.match(/(\d+)\s+student\(s\)/)
        const startedCount = match ? parseInt(match[1]) : 0
        setDeleteModalHasAssignments(true)
        setDeleteModalStartedCount(startedCount)
        setDeleteModalNeedsForce(true) // Need force=true to delete
      } else if (errorMessage.includes('student') || errorMessage.includes('assignment')) {
        setDeleteModalHasAssignments(true)
        setDeleteModalNeedsForce(true) // Use force to be safe
      }
      // Don't close modal - let user decide (unless it's an auth error)
      if (errorMessage.includes('Authentication')) {
        setDeleteModalActivity(null)
      }
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModalActivity) return

    const activityId = deleteModalActivity.activity_id
    const sessionToken = session?.access_token
    
    if (!sessionToken) {
      alert('Authentication required. Please log in again.')
      setDeleteModalActivity(null)
      return
    }

    // Always use force=true if we detected student assignments or if modal shows warnings
    // This ensures we can delete even if students have started/completed
    const force = deleteModalNeedsForce || deleteModalHasAssignments || deleteModalStartedCount > 0

    setDeletingActivityId(activityId)
    
    try {
      console.log('Deleting activity with force=', force)
      await api.deleteActivity(activityId, force, sessionToken)
      // Remove from local state immediately for instant UI feedback
      const updatedActivities = activities.filter(a => a.activity_id !== activityId)
      setActivities(updatedActivities)
      
      // Update cache
      if (classroomId) {
        const cacheKey = `activities_cache_${classroomId}`
        localStorage.setItem(cacheKey, JSON.stringify({
          activities: updatedActivities,
          timestamp: Date.now()
        }))
      }
      
      setDeleteModalActivity(null)
      setDeleteModalHasAssignments(false)
      setDeleteModalStartedCount(0)
      setDeleteModalNeedsForce(false)
      // Reload activities to ensure sync with backend and remove from students' view
      await loadActivities()
    } catch (error) {
      console.error('Error deleting activity:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // If we still get the error about started/completed, try with force=true explicitly
      if (errorMessage.includes('started or completed') && !force) {
        console.log('Retrying with force=true')
        try {
          await api.deleteActivity(activityId, true, sessionToken)
          setActivities(prev => prev.filter(a => a.activity_id !== activityId))
          setDeleteModalActivity(null)
          setDeleteModalHasAssignments(false)
          setDeleteModalStartedCount(0)
          setDeleteModalNeedsForce(false)
          await loadActivities()
          return
        } catch (retryError) {
          const retryErrorMessage = retryError instanceof Error ? retryError.message : 'Unknown error'
          alert(`Error deleting activity: ${retryErrorMessage}`)
        }
      } else {
        alert(`Error deleting activity: ${errorMessage}`)
      }
      
      setDeleteModalActivity(null)
      setDeleteModalHasAssignments(false)
      setDeleteModalStartedCount(0)
      setDeleteModalNeedsForce(false)
    } finally {
      setDeletingActivityId(null)
    }
  }

  const handleEditClick = (activity: LearningActivity) => {
    setEditModalActivity(activity)
  }

  const handleEditUpdated = async () => {
    // Force reload activities to show updated data
    loadingRef.current = false // Reset the loading ref to allow reload
    await loadActivities()
    // Cache is updated in loadActivities
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
    <div className="max-w-4xl mx-auto">
      {/* List-based structure with depth on interaction */}
      <div className="space-y-0">
        {activities.map((activity) => (
          <div
            key={activity.activity_id}
            className="group relative"
          >
            {/* Subtle left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200 group-hover:bg-slate-400 transition-colors duration-200 rounded-full" />
            
            <div className="w-full flex items-center justify-between pl-6 pr-3 sm:pl-8 sm:pr-4 py-5 sm:py-6 hover:bg-slate-50/50 transition-all duration-200 rounded-lg mb-2 shadow-md hover:shadow-lg">
              <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                {/* Icon - floating, no container */}
                <div className="flex-shrink-0">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base text-slate-900 truncate mb-1">
                    {activity.title}
                  </div>
                  {activity.description && (
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mb-2">
                      {activity.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {(() => {
                      const settings = activity.settings || {}
                      const metadata = activity.metadata || {}
                      const teachingStyle = settings.teaching_style || metadata.teaching_style || 'guided'
                      const teachingStyleLabels: Record<string, string> = {
                        'socratic': 'Socratic',
                        'direct': 'Direct',
                        'guided': 'Guided',
                        'discovery': 'Discovery',
                        'teacher': 'Teacher'
                      }
                      return (
                        <span className="text-xs text-slate-500 capitalize">
                          {teachingStyleLabels[teachingStyle] || teachingStyle}
                        </span>
                      )
                    })()}
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 capitalize">
                      {activity.difficulty}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-3 sm:ml-4">
                {onSelectActivity && (
                  <button
                    onClick={() => onSelectActivity(activity.activity_id)}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="View details"
                  >
                    View
                  </button>
                )}
                <button
                  onClick={() => handleEditClick(activity)}
                  className="p-2 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  title="Edit activity"
                >
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(activity)}
                  disabled={deletingActivityId === activity.activity_id}
                  className={`p-2 rounded-lg transition-colors ${
                    deletingActivityId === activity.activity_id
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title="Delete activity"
                >
                  {deletingActivityId === activity.activity_id ? (
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteActivityModal
        isOpen={deleteModalActivity !== null}
        activityTitle={deleteModalActivity?.title || ''}
        hasStudentAssignments={deleteModalHasAssignments}
        startedCount={deleteModalStartedCount}
        isDeleting={deletingActivityId !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (deletingActivityId === null) {
            setDeleteModalActivity(null)
            setDeleteModalHasAssignments(false)
            setDeleteModalStartedCount(0)
            setDeleteModalNeedsForce(false)
          }
        }}
      />

      {/* Edit Activity Modal */}
      <EditActivityModal
        isOpen={editModalActivity !== null}
        activity={editModalActivity}
        onClose={() => setEditModalActivity(null)}
        onUpdated={handleEditUpdated}
      />
    </div>
  )
}

