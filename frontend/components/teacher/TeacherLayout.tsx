'use client'

import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react'
import { ClassroomSidebar } from './ClassroomSidebar'
import { TeacherHeader } from './TeacherHeader'
import { AnalyticsOverview } from './AnalyticsOverview'
import Navbar from '@/components/Navbar'
import { Classroom } from '@/lib/auth/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'

interface TeacherLayoutContextType {
  activeClassroom: Classroom | null
  activeSection: 'activities' | 'analytics' | 'finetuning' | null
  refreshClassrooms: () => Promise<void>
}

const TeacherLayoutContext = createContext<TeacherLayoutContextType | null>(null)

export function useTeacherLayout() {
  const context = useContext(TeacherLayoutContext)
  if (!context) {
    throw new Error('useTeacherLayout must be used within TeacherLayout')
  }
  return context
}

interface TeacherLayoutProps {
  children: React.ReactNode
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  const { user, session } = useAuth()
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null)
  const [activeSection, setActiveSection] = useState<'activities' | 'analytics' | 'finetuning' | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const loadClassroomsRef = useRef(false)

  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (loadClassroomsRef.current) return
    
    // Load classrooms when user and session are available
    if (user && session?.access_token) {
      loadClassroomsRef.current = true
      loadClassrooms().finally(() => {
        loadClassroomsRef.current = false
      })
    } else if (!user) {
      setLoading(false)
    }
  }, [user, session?.access_token])
  
  // Restore active classroom from localStorage on mount
  useEffect(() => {
    if (classrooms.length > 0 && !activeClassroom) {
      const savedClassroomId = localStorage.getItem('active_classroom_id')
      if (savedClassroomId) {
        const savedClassroom = classrooms.find(c => c.classroom_id === savedClassroomId)
        if (savedClassroom) {
          setActiveClassroom(savedClassroom)
          setActiveSection('activities')
        }
      }
    }
  }, [classrooms, activeClassroom])

  const loadClassrooms = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if user is logged in
      if (!user) {
        setError('Please log in first.')
        setLoading(false)
        return
      }
      
      console.log('Loading classrooms for user:', user.id)
      console.log('User email:', user.email)
      
      // Get session token from auth context if available
      const sessionToken = session?.access_token || null
      console.log('Using session token:', sessionToken ? `Yes (length: ${sessionToken.length})` : 'No')
      
      // API client already has timeout handling, no need for double timeout
      const data = await api.getTeacherClassrooms(sessionToken || undefined)
      
      // Ensure we have an array and update state
      const classroomsList = Array.isArray(data) ? data : []
      console.log('Loaded classrooms:', classroomsList.length, classroomsList)
      
      setClassrooms(classroomsList)
      setError(null)
      
      // If we had an active classroom, make sure it still exists
      if (activeClassroom) {
        const stillExists = classroomsList.find(
          c => c.classroom_id === activeClassroom.classroom_id
        )
        if (!stillExists) {
          setActiveClassroom(null)
          setActiveSection(null)
        }
      }
      
      // If no classrooms, show helpful message
      if (classroomsList.length === 0) {
        console.log('No classrooms found - user may not have created any yet')
      }
    } catch (error) {
      console.error('Error loading classrooms:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      setClassrooms([])
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
          setError('Request timed out. Please check if the backend server is running at http://localhost:8000')
        } else if (error.message.includes('401') || error.message.includes('Authentication') || error.message.includes('Invalid or expired') || error.message.includes('No authentication token')) {
          setError('Authentication failed. Please log out and log in again.')
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          setError('Cannot connect to backend server. Make sure it\'s running at http://localhost:8000')
        } else {
          setError(`Failed to load classrooms: ${error.message}`)
        }
      } else {
        setError('Failed to load classrooms. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [user, session?.access_token])

  const handleClassroomSelect = (classroom: Classroom) => {
    setActiveClassroom(classroom)
    // Save to localStorage for persistence
    localStorage.setItem('active_classroom_id', classroom.classroom_id)
    // Auto-select activities section when classroom is selected
    if (!activeSection) {
      setActiveSection('activities')
    }
  }

  const handleSectionSelect = (section: 'activities' | 'analytics' | 'finetuning') => {
    setActiveSection(section)
  }

  const handleClassroomCreate = async (name: string, description?: string) => {
    try {
      console.log('Creating classroom:', name, description)
      const sessionToken = session?.access_token || null
      const newClassroom = await api.createClassroom(name, description, sessionToken || undefined)
      console.log('Created classroom response:', newClassroom)
      
      if (newClassroom && newClassroom.classroom_id) {
        // Ensure updated_at exists (fallback to created_at)
        const classroomWithUpdatedAt = {
          ...newClassroom,
          updated_at: newClassroom.updated_at || newClassroom.created_at
        }
        
        // Add to list immediately for instant feedback
        setClassrooms(prev => {
          // Check if already exists (avoid duplicates)
          const exists = prev.find(c => c.classroom_id === classroomWithUpdatedAt.classroom_id)
          if (exists) {
            console.log('Classroom already in list, updating...')
            return prev.map(c => 
              c.classroom_id === classroomWithUpdatedAt.classroom_id 
                ? classroomWithUpdatedAt 
                : c
            )
          }
          console.log('Adding new classroom to list')
          return [...prev, classroomWithUpdatedAt]
        })
        setActiveClassroom(classroomWithUpdatedAt)
        // Save to localStorage for persistence
        localStorage.setItem('active_classroom_id', classroomWithUpdatedAt.classroom_id)
        setActiveSection('activities')
        
        // Reload classrooms to get fresh data from server (ensures consistency)
        setTimeout(async () => {
          console.log('Reloading classrooms after creation...')
          await loadClassrooms()
        }, 500) // Small delay to ensure backend has processed
      } else {
        throw new Error('No classroom data returned from server')
      }
    } catch (error: any) {
      console.error('Error creating classroom:', error)
      const errorMessage = error?.message || error?.detail || 'Failed to create classroom. Please try again.'
      alert(`Error: ${errorMessage}\n\nMake sure:\n1. You are logged in as a teacher\n2. Backend API is running\n3. Database migration is applied`)
      
      // Reload classrooms to refresh the list
      await loadClassrooms()
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Classroom Sidebar - Hidden on mobile when sidebarOpen is false */}
      <div className={`${sidebarOpen ? 'flex' : 'hidden'} lg:flex fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto`}>
        <ClassroomSidebar
          classrooms={classrooms}
          activeClassroom={activeClassroom}
          activeSection={activeSection}
          onSelectClassroom={(classroom) => {
            handleClassroomSelect(classroom)
            // Close sidebar on mobile after selection
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setSidebarOpen(false)
            }
          }}
          onSelectSection={handleSectionSelect}
          onCreateClassroom={handleClassroomCreate}
          loading={loading}
          error={error}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile menu button - integrated into navbar */}
        <div className="lg:hidden">
          <Navbar
            leftContent={
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-sm font-medium">Menu</span>
          </button>
            }
          />
        </div>

        <TeacherHeader 
          classroom={activeClassroom}
          activeSection={activeSection}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/30 p-4 sm:p-6 lg:p-8">
          <TeacherLayoutContext.Provider value={{ activeClassroom, activeSection, refreshClassrooms: loadClassrooms }}>
            {activeClassroom && activeSection ? (
              children
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2 tracking-tight">
                    Welcome to Teacher Dashboard
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-[15px]">
                    Select a classroom from the sidebar and choose a section to get started.
                  </p>
                </div>
              </div>
            )}
          </TeacherLayoutContext.Provider>
        </main>
      </div>
    </div>
  )
}

