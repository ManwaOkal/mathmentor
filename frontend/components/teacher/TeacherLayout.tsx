'use client'

import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react'
import { TeacherHeader } from './TeacherHeader'
import { Classroom } from '@/lib/auth/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'
import { BookOpen, Plus, ChevronRight, Share2 } from 'lucide-react'
import Toast from '@/components/Toast'

interface TeacherLayoutContextType {
  activeClassroom: Classroom | null
  activeSection: 'activities' | 'analytics' | 'finetuning' | null
  refreshClassrooms: () => Promise<void>
  setActiveSection: (section: 'activities' | 'analytics' | 'finetuning') => void
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
  const { user, profile, session } = useAuth()
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null)
  const [activeSection, setActiveSection] = useState<'activities' | 'analytics' | 'finetuning' | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClassroomName, setNewClassroomName] = useState('')
  const [newClassroomDescription, setNewClassroomDescription] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

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

  const copyJoinCode = () => {
    if (activeClassroom?.join_code) {
      navigator.clipboard.writeText(activeClassroom.join_code)
      setToastMessage(`Join code "${activeClassroom.join_code}" copied to clipboard!`)
      setShowToast(true)
    }
  }

  // Listen for create classroom event
  useEffect(() => {
    const handleOpenCreate = () => {
      setShowCreateModal(true)
    }
    window.addEventListener('openCreateClassroom' as any, handleOpenCreate as EventListener)
    return () => {
      window.removeEventListener('openCreateClassroom' as any, handleOpenCreate as EventListener)
    }
  }, [])

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
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar */}
      <TeacherHeader 
        classroom={activeClassroom}
        activeSection={activeSection}
        onHomeClick={() => {
          setActiveClassroom(null)
          setActiveSection(null)
          localStorage.removeItem('active_classroom_id')
        }}
      />

      <div className="flex flex-col h-[calc(100vh-6rem)] sm:h-[calc(100vh-7rem)]">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          <div className="max-w-full mx-auto">
            {/* Tabs Navigation - Only shown when classroom is selected */}
            {activeClassroom && (
              <div className="border-b border-slate-200 bg-white sticky top-0 z-40">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center gap-1 sm:gap-2 relative">
                    <button
                      onClick={() => handleSectionSelect('activities')}
                      className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-all duration-200 border-b-2 ${
                        activeSection === 'activities'
                          ? 'border-slate-900 text-slate-900'
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      Activities
                    </button>
                    <button
                      onClick={() => handleSectionSelect('finetuning')}
                      className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-all duration-200 border-b-2 ${
                        activeSection === 'finetuning'
                          ? 'border-slate-900 text-slate-900'
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      Fine-Tuning
                    </button>
                    <button
                      onClick={() => handleSectionSelect('analytics')}
                      className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-all duration-200 border-b-2 ${
                        activeSection === 'analytics'
                          ? 'border-slate-900 text-slate-900'
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      Analytics
                    </button>
                    {/* Join Code Button - Centered on desktop */}
                    <div className="hidden sm:block absolute left-1/2 -translate-x-1/2">
                      <button
                        onClick={copyJoinCode}
                        className="font-mono bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors text-slate-700"
                      >
                        <span className="text-xs font-medium">Join Code:</span>
                        <span className="text-xs font-semibold">{activeClassroom.join_code}</span>
                        <Share2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      </button>
                    </div>
                  </div>
                  {/* Join Code Button - Below tabs on mobile */}
                  <div className="sm:hidden flex justify-center py-3 border-t border-slate-100">
                    <button
                      onClick={copyJoinCode}
                      className="font-mono bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors text-slate-700"
                    >
                      <span className="text-xs font-medium">Join Code:</span>
                      <span className="text-xs font-semibold">{activeClassroom.join_code}</span>
                      <Share2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <TeacherLayoutContext.Provider value={{ activeClassroom, activeSection, refreshClassrooms: loadClassrooms, setActiveSection: handleSectionSelect }}>
                {activeClassroom && activeSection ? (
                  children
                ) : (
                  /* Dashboard View - Classrooms List (like student landing page) */
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-6 sm:mb-8">
                      <div className="flex items-center justify-between gap-4 mb-2 sm:mb-3">
                        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                          My Classrooms
                        </h1>
                        {classrooms.length > 0 && (
                          <button
                            onClick={() => {
                              const event = new CustomEvent('openCreateClassroom')
                              window.dispatchEvent(event)
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 text-sm font-medium flex-shrink-0 shadow-sm hover:shadow-md"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">New Classroom</span>
                            <span className="sm:hidden">New</span>
                          </button>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm sm:text-[15px]">Select a classroom to manage activities and view analytics</p>
                    </div>

                    {loading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="border border-slate-200 rounded-lg p-6 bg-white animate-pulse">
                            <div className="h-6 bg-slate-200 rounded-lg w-1/3 mb-3"></div>
                            <div className="h-4 bg-slate-200 rounded-lg w-2/3"></div>
                          </div>
                        ))}
                      </div>
                    ) : classrooms.length === 0 ? (
                      <div className="text-center py-12 sm:py-20 border border-slate-200 rounded-xl bg-white px-4">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
                          <BookOpen className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">No classrooms yet</h3>
                        <p className="text-sm sm:text-base text-slate-600 mb-6 sm:mb-8">Create your first classroom to start managing activities and tracking student progress</p>
                        <button
                          onClick={() => {
                            const event = new CustomEvent('openCreateClassroom')
                            window.dispatchEvent(event)
                          }}
                          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 font-medium shadow-sm hover:shadow-md text-sm sm:text-base"
                        >
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                          Create Your First Classroom
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        {classrooms.map((classroom, index) => {
                          return (
                            <button
                              key={classroom.classroom_id}
                              onClick={() => handleClassroomSelect(classroom)}
                              className="w-full text-left border border-slate-200 rounded-lg p-4 sm:p-6 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200 group"
                            >
                              <div className="flex items-center justify-between gap-3 sm:gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 sm:space-x-4 mb-2 sm:mb-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate tracking-tight">
                                        {classroom.name}
                                      </h3>
                                      {classroom.description && (
                                        <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-1">{classroom.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="ml-13 sm:ml-16 text-xs text-slate-500 flex items-center gap-2">
                                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">Join Code: {classroom.join_code}</span>
                                  </div>
                                </div>
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors duration-200">
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 group-hover:translate-x-0.5 transition-transform duration-200" />
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </TeacherLayoutContext.Provider>
            </div>
          </div>
        </main>
      </div>

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 tracking-tight">Create New Classroom</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Classroom Name *
                </label>
                <input
                  type="text"
                  value={newClassroomName}
                  onChange={(e) => setNewClassroomName(e.target.value)}
                  placeholder="e.g., Algebra 101"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={newClassroomDescription}
                  onChange={(e) => setNewClassroomDescription(e.target.value)}
                  placeholder="Brief description of this classroom"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewClassroomName('')
                  setNewClassroomDescription('')
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newClassroomName.trim()) {
                    alert('Please enter a classroom name')
                    return
                  }
                  await handleClassroomCreate(newClassroomName.trim(), newClassroomDescription.trim() || undefined)
                  setNewClassroomName('')
                  setNewClassroomDescription('')
                  setShowCreateModal(false)
                }}
                disabled={!newClassroomName.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm hover:shadow-md"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}

