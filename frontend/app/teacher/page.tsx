'use client'

import { useState, useEffect, useRef } from 'react'
import TeacherLayout, { useTeacherLayout } from '@/components/teacher/TeacherLayout'
import PromptActivityCreation from '@/components/teacher/PromptActivityCreation'
import ActivityList from '@/components/teacher/ActivityList'
import ActivityAssignment from '@/components/teacher/ActivityAssignment'
import AnalyticsDashboard from '@/components/teacher/AnalyticsDashboard'
import TeacherFineTuning from '@/components/teacher/TeacherFineTuning'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { UserRole } from '@/lib/auth/types'
import { api } from '@/lib/api'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

function TeacherPageContent() {
  const { activeClassroom, activeSection } = useTeacherLayout()
  const { session } = useAuth()
  const [showPromptActivityCreation, setShowPromptActivityCreation] = useState(false)
  const [showActivityAssignment, setShowActivityAssignment] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleActivityCreated = () => {
    setShowPromptActivityCreation(false)
    // Trigger refresh by incrementing key (will remount ActivityList)
    setRefreshKey(prev => prev + 1)
  }

  const handleAssignActivity = (activityId: string) => {
    setSelectedActivityId(activityId)
    setShowActivityAssignment(true)
  }

  const handleActivityAssigned = () => {
    setShowActivityAssignment(false)
    setSelectedActivityId(null)
    setRefreshKey(prev => prev + 1) // Trigger refresh
  }

  const handleSyncActivities = async () => {
    if (!activeClassroom || !session?.access_token) {
      // Error occurred
      return
    }
    
    setSyncing(true)
    setSyncMessage(null)
    
    try {

      const result = await api.syncClassroomActivities(activeClassroom.classroom_id, session.access_token)

      setSyncMessage({
        type: 'success',
        text: `Successfully synced ${result.synced_count || 0} activities to ${result.students_processed || 0} student(s)`
      })
      
      // Refresh the activity list after successful sync
      setRefreshKey(prev => prev + 1)
      
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000)
    } catch (error: any) {
      // Error occurred
      setSyncMessage({
        type: 'error',
        text: error?.message || 'Failed to sync activities. Please try again.'
      })
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000)
    } finally {
      setSyncing(false)
    }
  }

  if (!activeClassroom) {
    return null
  }

  // Get activeSection from URL or use state
  // For now, we'll use a context or prop from layout
  // This will be handled by the sidebar selection

  return (
    <div className="space-y-6 w-full">
      {/* Section Content */}
      {activeSection === 'activities' && (
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-slate-600">Manage and organize your learning activities</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleSyncActivities()
                }}
                disabled={syncing || !activeClassroom || !session?.access_token}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={!activeClassroom || !session?.access_token ? 'Please select a classroom' : 'Sync activities to all students'}
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span className="whitespace-nowrap">{syncing ? 'Syncing...' : 'Sync Activities'}</span>
              </button>
              <button
                onClick={() => setShowPromptActivityCreation(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="text-slate-600 text-lg leading-none">+</span>
                <span className="whitespace-nowrap">Create Activity</span>
              </button>
            </div>
          </div>
          
          {/* Sync Message */}
          {syncMessage && (
            <div className={`mb-4 p-3 sm:p-4 rounded-lg flex items-start gap-2 sm:gap-3 ${
              syncMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {syncMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-xs sm:text-sm ${
                syncMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {syncMessage.text}
              </p>
            </div>
          )}
          
          {/* Prompt Activity Creation */}
          {showPromptActivityCreation && (
            <div className="mb-6">
              <PromptActivityCreation
                classroomId={activeClassroom.classroom_id}
                onActivityCreated={(activityId) => {
                  setShowPromptActivityCreation(false)
                  handleActivityCreated()
                }}
                onCancel={() => setShowPromptActivityCreation(false)}
              />
            </div>
          )}
          
          <ActivityList
            key={`${refreshKey}-${activeClassroom.classroom_id}`}
            classroomId={activeClassroom.classroom_id}
          />
        </div>
      )}

      {activeSection === 'finetuning' && (
        <TeacherFineTuning />
      )}

      {activeSection === 'analytics' && (
        <AnalyticsDashboard classroomId={activeClassroom.classroom_id} />
      )}

      {/* Activity Assignment Modal */}
      {showActivityAssignment && selectedActivityId && (
        <ActivityAssignment
          activityId={selectedActivityId}
          classroomId={activeClassroom.classroom_id}
          onClose={() => {
            setShowActivityAssignment(false)
            setSelectedActivityId(null)
          }}
          onAssigned={handleActivityAssigned}
        />
      )}
    </div>
  )
}

export default function TeacherPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const hasRedirectedRef = useRef(false)

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirectedRef.current) return
    
    if (!loading) {
      if (!user) {
        hasRedirectedRef.current = true
        router.push('/')
        return
      }
      
      // If profile doesn't exist yet, use user metadata to check role
      if (!profile) {
        const roleFromMetadata = user.user_metadata?.role
        if (roleFromMetadata !== 'teacher' && roleFromMetadata !== 'admin') {
          hasRedirectedRef.current = true
          router.push('/')
          return
        }
        // If role is correct, wait a bit for profile to load
        return
      }
      
      if (profile.role !== UserRole.TEACHER && profile.role !== UserRole.ADMIN) {
        hasRedirectedRef.current = true
        router.push('/')
        return
      }
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-3 text-slate-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user || !profile || (profile.role !== UserRole.TEACHER && profile.role !== UserRole.ADMIN)) {
    return null
  }

  return (
    <TeacherLayout>
      <TeacherPageContent />
    </TeacherLayout>
  )
}

