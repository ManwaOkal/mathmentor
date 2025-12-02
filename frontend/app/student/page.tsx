'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import StudentActivity from '@/components/student/StudentActivity'
import JoinClassroom from '@/components/student/JoinClassroom'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'
import { UserRole } from '@/lib/auth/types'
import Navbar from '@/components/Navbar'
import Auth from '@/components/Auth'
import { 
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  Search,
  Menu,
  X,
  Activity as ActivityIcon,
  Clock,
  Award,
  CheckCircle
} from 'lucide-react'

function StudentPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, profile, signOut, session, loading: authLoading } = useAuth()
  const activityId = searchParams?.get('activityId') || null
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showJoin, setShowJoin] = useState(false)
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isLoadingRef = useRef(false)

  // Memoize loadClassrooms to prevent infinite loops
  const loadClassrooms = useCallback(async () => {
    // Prevent concurrent requests
    if (isLoadingRef.current) {
      return
    }
    
    try {
      isLoadingRef.current = true
      setLoading(true)
      
      // Check if user is logged in
      if (!user || !session) {
        console.warn('Cannot load classrooms: user or session not available')
        setClassrooms([])
        setLoading(false)
        isLoadingRef.current = false
        return
      }
      
      // Get session token from auth context
      const sessionToken = session.access_token
      console.log('Loading classrooms for user:', user.id)
      console.log('Using session token:', sessionToken ? `Yes (length: ${sessionToken.length})` : 'No')
      
      // Call API with session token
      const data = await api.getStudentClassrooms(sessionToken)
      
      // Ensure we have an array and update state
      const classroomsList = Array.isArray(data) ? data : []
      console.log('Loaded classrooms:', classroomsList.length, classroomsList)
      
      setClassrooms(classroomsList)
    } catch (error) {
      console.error('Error loading classrooms:', error)
      setClassrooms([])
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }, [user, session])

  // Memoize loadActivities to prevent infinite loops
  const loadActivities = useCallback(async (classroomId: string) => {
    if (!session) {
      console.warn('Cannot load activities: session not available')
      return
    }

    setLoadingActivities(true)
    try {
      // Get session token from auth context
      const sessionToken = session.access_token
      const data = await api.getStudentActivities(classroomId, undefined, sessionToken)
      const activitiesList = Array.isArray(data) ? data : (data?.activities || [])
      setActivities(activitiesList)
      // Expand first activity by default (check current state, don't depend on it)
      setExpandedActivities(prev => {
        if (activitiesList.length > 0 && prev.size === 0) {
          return new Set([activitiesList[0].student_activity_id])
        }
        return prev
      })
    } catch (error) {
      console.error('Error loading activities:', error)
      setActivities([])
    } finally {
      setLoadingActivities(false)
    }
  }, [session])

  // Redirect only after auth is fully loaded and user doesn't have access
  useEffect(() => {
    if (!authLoading) {
      // Wait for auth to finish loading before checking
      if (!user || !profile) {
        // Only redirect if we're sure auth is done loading
        router.push('/')
        return
      }
      
      if (profile.role !== UserRole.STUDENT && profile.role !== UserRole.ADMIN) {
        router.push('/')
        return
      }
    }
  }, [user, profile, authLoading, router])

  // Load classrooms when user and session are available
  useEffect(() => {
    if (user && profile && session && !authLoading) {
      loadClassrooms()
    }
  }, [user, profile, session, authLoading, loadClassrooms])

  // Set up polling interval only when ready (poll every 30 seconds instead of 5)
  useEffect(() => {
    if (!user || !session || authLoading) {
      return
    }
    
    // Initial load happens in the other useEffect, so we can wait a bit before polling
    const interval = setInterval(() => {
      // Only poll if user and session are still available and we're not already loading
      if (user && session && !isLoadingRef.current) {
        loadClassrooms()
      }
    }, 30000) // Poll every 30 seconds instead of 5
    
    return () => clearInterval(interval)
  }, [user, session, authLoading, loadClassrooms])

  // Load activities when classroom is selected
  useEffect(() => {
    if (selectedClassroomId && session) {
      loadActivities(selectedClassroomId)
    }
  }, [selectedClassroomId, session, loadActivities])

  // Refresh activities when returning from an activity (when activityId becomes null)
  useEffect(() => {
    if (!activityId && selectedClassroomId && session) {
      // Refresh activities list when returning from activity view
      loadActivities(selectedClassroomId)
    }
  }, [activityId, selectedClassroomId, session, loadActivities])

  const handleJoinSuccess = async (classroomId: string) => {
    await loadClassrooms()
    setShowJoin(false)
  }

  const handleSelectClassroom = (classroomId: string) => {
    setSelectedClassroomId(classroomId)
    setExpandedActivities(new Set())
  }

  const handleStartActivity = (activityId: string) => {
    router.push(`/student?activityId=${activityId}`)
  }

  const toggleActivityExpansion = (activityId: string) => {
    setExpandedActivities(prev => {
      const newSet = new Set(prev)
      if (newSet.has(activityId)) {
        newSet.delete(activityId)
      } else {
        newSet.add(activityId)
      }
      return newSet
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <Clock className="w-4 h-4" />
      case 'in_progress': return <ActivityIcon className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'graded': return <Award className="w-4 h-4" />
      default: return <ActivityIcon className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'text-blue-600'
      case 'in_progress': return 'text-yellow-600'
      case 'completed': return 'text-green-600'
      case 'graded': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-3 text-slate-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user || !profile || (profile.role !== UserRole.STUDENT && profile.role !== UserRole.ADMIN)) {
    return null
  }

  // If activity ID is provided, show activity
  if (activityId) {
    return <StudentActivity activityId={activityId} />
  }

  const selectedClassroom = classrooms.find(
    (enrollment) => {
      const classroom = enrollment.classrooms || enrollment
      const classroomId = classroom.classroom_id || enrollment.classroom_id
      return classroomId === selectedClassroomId
    }
  )

  const classroomName = selectedClassroom 
    ? (selectedClassroom.classrooms || selectedClassroom).name || 'Unnamed Classroom'
    : ''

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar - matching homepage style */}
      <Navbar
        leftContent={
          selectedClassroomId ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedClassroomId(null)
                  setActivities([])
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 flex-shrink-0 group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="text-sm font-medium">Dashboard</span>
              </button>
              <div className="h-5 w-px bg-slate-300" />
              <div className="text-sm text-slate-500 truncate max-w-[200px]">
                {classroomName}
              </div>
            </div>
          ) : undefined
        }
        rightContent={
          <div className="flex items-center gap-3">
            {!selectedClassroomId && (
              <button
                onClick={() => setShowJoin(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 text-sm font-medium flex-shrink-0 shadow-sm hover:shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Join Classroom</span>
                <span className="sm:hidden">Join</span>
              </button>
            )}
            <Auth />
          </div>
        }
      />

      {/* Subtle Greeting Banner - integrated with navbar */}
      {profile && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-full mx-auto">
            <p className="text-sm text-slate-600 font-medium">
              Hello, {profile.name || profile.email}!
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] sm:h-[calc(100vh-7rem)]">
        {/* Left Sidebar - Only shown when classroom is selected - Wider for better readability */}
        {selectedClassroomId && (
          <aside className={`w-full lg:w-[420px] bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 hidden lg:block'}`}>
            <div className="p-4 sm:p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 truncate pr-2 tracking-tight">
                  {classroomName}
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200 flex-shrink-0 lg:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              <div className="mb-4 sm:mb-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Activities
                </h3>
              </div>

              {loadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium">No activities assigned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity: any, index: number) => {
                    const activityData = activity.learning_activities || {}
                    const status = activity.status || 'assigned'
                    const isExpanded = expandedActivities.has(activity.student_activity_id)
                    const statusColor = getStatusColor(status)

                    return (
                      <div 
                        key={activity.student_activity_id} 
                        className="border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-all duration-200 overflow-hidden group shadow-sm hover:shadow-md"
                      >
                        <button
                          onClick={() => toggleActivityExpansion(activity.student_activity_id)}
                          className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 transition-colors duration-200 text-left"
                        >
                          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                            <div className={`${statusColor} p-1.5 sm:p-2 rounded-lg bg-slate-50 flex-shrink-0`}>
                              {getStatusIcon(status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                                {activityData.title || 'Untitled Activity'}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 capitalize">
                                {status.replace('_', ' ')}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-2 sm:ml-3">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 transition-transform duration-200" />
                            ) : (
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 transition-transform duration-200" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-slate-200 bg-slate-50/50 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                                {activity.total_questions !== null && (
                                  <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                                    <BookOpen className="w-3 h-3" />
                                    {activity.total_questions} questions
                                  </span>
                                )}
                                {activity.score !== null && (
                                  <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                                    <Award className="w-3 h-3" />
                                    {activity.score}% score
                                  </span>
                                )}
                              </div>

                              {/* Divider before action button */}
                              <div className="border-t border-slate-200 pt-2 sm:pt-3">
                                {(status === 'assigned' || status === 'in_progress') && (
                                  <button
                                    onClick={() => handleStartActivity(activity.activity_id)}
                                    className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                                      status === 'assigned'
                                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                                        : 'bg-slate-700 text-white hover:bg-slate-600'
                                    }`}
                                  >
                                    {status === 'assigned' ? 'Start Activity' : 'Continue'}
                                  </button>
                                )}
                                
                                {status === 'completed' && (
                                  <button
                                    onClick={() => handleStartActivity(activity.activity_id)}
                                    className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm font-medium text-center hover:bg-slate-200 transition-all duration-200"
                                  >
                                    View Results
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {selectedClassroomId ? (
              /* Classroom Activities View */
              <div className="flex items-center justify-center min-h-[60vh]">
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="absolute top-20 left-4 inline-flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 lg:hidden z-10"
                  >
                    <Menu className="w-5 h-5" />
                    <span className="font-medium">Show Activities</span>
                  </button>
                )}
                
                {/* Centered card when no activity selected */}
                <div className="w-full max-w-2xl">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
                    <div className="text-center mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600" />
                      </div>
                      <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2 tracking-tight">
                        {classroomName}
                      </h1>
                      <p className="text-slate-600 text-sm sm:text-[15px]">
                        Select an activity from the sidebar to get started
                      </p>
                    </div>

                    {activities.length === 0 && !loadingActivities && (
                      <div className="text-center py-6 sm:py-8 border-t border-slate-200 pt-6 sm:pt-8">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-slate-50 rounded-xl flex items-center justify-center">
                          <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">No activities yet</h3>
                        <p className="text-xs sm:text-sm text-slate-600">Your teacher will assign activities here</p>
                      </div>
                    )}

                    {activities.length > 0 && (
                      <div className="border-t border-slate-200 pt-4 sm:pt-6">
                        <p className="text-xs sm:text-sm text-slate-500 text-center">
                          <span className="font-medium text-slate-700">{activities.length}</span> {activities.length === 1 ? 'activity' : 'activities'} available
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Dashboard View - Classrooms List */
              <div>
                {showJoin && (
                  <div className="mb-8 max-w-2xl">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                          Join a Classroom
                        </h2>
                        <button
                          onClick={() => setShowJoin(false)}
                          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-all duration-200 flex-shrink-0"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <JoinClassroom 
                        onJoinSuccess={async (classroomId) => {
                          await handleJoinSuccess(classroomId)
                        }} 
                      />
                    </div>
                  </div>
                )}

                <div className="mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                    My Classrooms
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-[15px]">Select a classroom to view and start activities</p>
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
                    <p className="text-sm sm:text-base text-slate-600 mb-6 sm:mb-8">Join a classroom using the join code from your teacher</p>
                    <button
                      onClick={() => setShowJoin(true)}
                      className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 font-medium shadow-sm hover:shadow-md text-sm sm:text-base"
                    >
                      <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Join Your First Classroom
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {classrooms.map((enrollment, index) => {
                      const classroom = enrollment.classrooms || enrollment
                      const classroomId = classroom.classroom_id || enrollment.classroom_id
                      
                      return (
                        <button
                          key={classroomId || enrollment.enrollment_id}
                          onClick={() => handleSelectClassroom(classroomId)}
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
                                    {classroom.name || 'Unnamed Classroom'}
                                  </h3>
                                  {classroom.description && (
                                    <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-1">{classroom.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="ml-13 sm:ml-16 text-xs text-slate-500 flex items-center gap-2">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span>Joined {enrollment.enrolled_at 
                                  ? new Date(enrollment.enrolled_at).toLocaleDateString()
                                  : 'Recently'}</span>
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
          </div>
        </main>
      </div>
    </div>
  )
}

export default function StudentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-3 text-slate-600">Loading...</div>
        </div>
      </div>
    }>
      <StudentPageContent />
    </Suspense>
  )
}












