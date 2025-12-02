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

function TeacherPageContent() {
  const { activeClassroom, activeSection } = useTeacherLayout()
  const [showPromptActivityCreation, setShowPromptActivityCreation] = useState(false)
  const [showActivityAssignment, setShowActivityAssignment] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

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

  if (!activeClassroom) {
    return null
  }

  // Get activeSection from URL or use state
  // For now, we'll use a context or prop from layout
  // This will be handled by the sidebar selection

  return (
    <div className="space-y-8">
      {/* Section Content */}
      {activeSection === 'activities' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 sm:gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-light text-slate-900 tracking-tight mb-1">Activities</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-light">Manage and organize your learning activities</p>
            </div>
            <button
              onClick={() => setShowPromptActivityCreation(true)}
              className="self-start sm:self-auto px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm"
            >
              <span className="text-slate-600">+</span>
              <span>Create Activity</span>
            </button>
          </div>
          
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

      {activeSection === 'analytics' && (
        <AnalyticsDashboard classroomId={activeClassroom.classroom_id} />
      )}

      {activeSection === 'finetuning' && (
        <TeacherFineTuning />
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

