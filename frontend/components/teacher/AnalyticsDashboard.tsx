'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Users, CheckCircle, Award, X, ChevronDown, Loader2, Eye, TrendingUp, Lightbulb, RefreshCw, Search, ArrowUp, ArrowDown, Minus, Filter, Sparkles, AlertCircle } from 'lucide-react'
import { ClassroomAnalytics } from '@/lib/auth/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'

// Component for individual activity item with collapsible feedback
function ActivityItem({ activity, idx }: { activity: any, idx: number }) {
  const [showFeedback, setShowFeedback] = useState(false)
  
  return (
    <div className="group relative">
      {/* Subtle left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full ${
        activity.status === 'completed' ? 'bg-slate-300' :
        activity.status === 'in_progress' ? 'bg-blue-400' :
        'bg-slate-200'
      }`} />
      
      <div className="pl-6 pr-4 py-4 hover:bg-slate-50/30 transition-colors duration-200 rounded-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h6 className="text-sm font-semibold text-slate-900 mb-1.5">{activity.title}</h6>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="capitalize">{activity.activity_type}</span>
              <span>•</span>
              <span className="capitalize">{activity.difficulty}</span>
              <span>•</span>
              <span className="capitalize">{activity.status.replace('_', ' ')}</span>
            </div>
          </div>
          {activity.score !== null && (
            <div className="ml-4 flex-shrink-0">
              <span className="text-sm font-medium text-slate-700">Accuracy: {activity.score.toFixed(0)}%</span>
            </div>
          )}
        </div>
        
        {/* Score and Feedback Section */}
        {activity.status === 'completed' && (
          <div className="space-y-3 pt-3">
            {/* Score Display - Neutral */}
            {activity.score !== null && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-base font-medium text-slate-700">Current score</span>
                  <span className="text-sm text-slate-500">{activity.score.toFixed(1)}%</span>
                </div>
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-400 transition-all"
                    style={{ width: `${Math.min(activity.score, 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Feedback - Collapsible */}
            {activity.status === 'completed' && (
              <div>
                <button
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors mb-2"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showFeedback ? 'rotate-180' : ''}`} />
                  <span>{showFeedback ? 'Hide' : 'View'} feedback</span>
                </button>
                {showFeedback && activity.feedback && activity.feedback.trim() && (
                  <div className="pt-2 pb-1">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{activity.feedback}</p>
                  </div>
                )}
                {showFeedback && (!activity.feedback || !activity.feedback.trim()) && (
                  <div className="pt-2 pb-1">
                    <p className="text-sm text-slate-400 italic">No feedback available for this activity.</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Additional Details - Subtle */}
            <div className="flex flex-wrap gap-3 text-xs text-slate-400 pt-1">
              {activity.completed_at && (
                <span>Completed {new Date(activity.completed_at).toLocaleDateString()}</span>
              )}
              {activity.total_questions !== null && activity.correct_answers !== null && (
                <span>{activity.correct_answers} of {activity.total_questions} correct</span>
              )}
            </div>
          </div>
        )}
        
        {/* In Progress or Assigned Status */}
        {activity.status !== 'completed' && (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-medium ${
                activity.status === 'in_progress' 
                  ? 'text-blue-600' 
                  : 'text-slate-500'
              }`}>
                {activity.status === 'in_progress' ? 'In Progress' : 'Assigned'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              {activity.started_at && (
                <span>Started {new Date(activity.started_at).toLocaleDateString()}</span>
              )}
              {!activity.started_at && activity.status === 'assigned' && (
                <span className="italic">Not started yet</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Module-level cache that persists across component unmounts/remounts
const analyticsCache: Map<string, { data: any, timestamp: number }> = new Map()
const studentDetailCache: Map<string, { data: any, timestamp: number }> = new Map()
const CACHE_DURATION = 30000 // 30 seconds

interface AnalyticsDashboardProps {
  classroomId: string
}

interface StudentPerformance {
  student_id: string
  name: string
  total_activities: number
  completed_activities: number
  average_score: number
  last_activity_date?: string
}

interface StudentDetail {
  student_id: string
  name: string
  email: string
  enrolled_at?: string
  summary: {
    total_activities: number
    completed_activities: number
    in_progress_activities: number
    assigned_activities: number
    average_score: number
    highest_score: number | null
    lowest_score: number | null
    completion_rate: number
  }
  activity_breakdown: Array<{
    activity_id: string
    title: string
    activity_type: string
    difficulty: string
    status: string
    score: number | null
    completed_at: string | null
    started_at: string | null
    total_questions: number | null
    correct_answers: number | null
    feedback: string | null
  }>
  score_trend: string
  recent_scores: number[]
}


export default function AnalyticsDashboard({ 
  classroomId
}: AnalyticsDashboardProps) {
  const { session } = useAuth()
  const [analytics, setAnalytics] = useState<ClassroomAnalytics | null>(null)
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'completion'>('score')
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = useCallback(async (showRefreshing = false, forceRefresh = false) => {
    if (!session?.access_token) return
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && !showRefreshing) {
      const cached = analyticsCache.get(classroomId)
      if (cached) {
        const age = Date.now() - cached.timestamp
        if (age < CACHE_DURATION) {
          // Use cached data
          const data = cached.data
          setAnalytics({
            analytics_id: data.analytics_id || '',
            teacher_id: data.teacher_id || '',
            classroom_id: classroomId,
            date: data.date || new Date().toISOString(),
            total_students: data.metrics?.total_students || 0,
            active_students: data.metrics?.active_students || 0,
            total_activities_assigned: data.metrics?.total_activities_assigned || 0,
            completed_activities: data.metrics?.completed_activities || 0,
            average_score: data.metrics?.average_score || 0,
            struggling_concepts: data.struggling_concepts || [],
            top_performers: data.top_performers || {},
            insights: data.insights || '',
            created_at: data.created_at || new Date().toISOString()
          })
          setStudentPerformance(data.student_performance || [])
          setLoading(false)
          return
        }
      }
    }
    
    if (showRefreshing) {
      setRefreshing(true)
    } else {
    setLoading(true)
    }
    
    try {
      const data = await api.getClassroomAnalytics(classroomId, 'week', session.access_token)
      if (data) {
        // Update cache
        analyticsCache.set(classroomId, {
          data: {
            ...data,
            analytics_id: data.analytics_id || '',
            teacher_id: data.teacher_id || '',
            classroom_id: classroomId,
            date: data.date || new Date().toISOString(),
            metrics: data.metrics || {},
            student_performance: data.student_performance || []
          },
          timestamp: Date.now()
        })
        
        // Map API response to analytics state
        setAnalytics({
          analytics_id: data.analytics_id || '',
          teacher_id: data.teacher_id || '',
          classroom_id: classroomId,
          date: data.date || new Date().toISOString(),
          total_students: data.metrics?.total_students || 0,
          active_students: data.metrics?.active_students || 0,
          total_activities_assigned: data.metrics?.total_activities_assigned || 0,
          completed_activities: data.metrics?.completed_activities || 0,
          average_score: data.metrics?.average_score || 0,
          struggling_concepts: data.struggling_concepts || [],
          top_performers: data.top_performers || {},
          insights: data.insights || '',
          created_at: data.created_at || new Date().toISOString()
        })
        setStudentPerformance(data.student_performance || [])
      }
    } catch (error) {
      // Error occurred
      // On error, try to use cached data if available
      const cached = analyticsCache.get(classroomId)
      if (cached) {
        const data = cached.data
        setAnalytics({
          analytics_id: data.analytics_id || '',
          teacher_id: data.teacher_id || '',
          classroom_id: classroomId,
          date: data.date || new Date().toISOString(),
          total_students: data.metrics?.total_students || 0,
          active_students: data.metrics?.active_students || 0,
          total_activities_assigned: data.metrics?.total_activities_assigned || 0,
          completed_activities: data.metrics?.completed_activities || 0,
          average_score: data.metrics?.average_score || 0,
          struggling_concepts: data.struggling_concepts || [],
          top_performers: data.top_performers || {},
          insights: data.insights || '',
          created_at: data.created_at || new Date().toISOString()
        })
        setStudentPerformance(data.student_performance || [])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [classroomId, session?.access_token])

  const fetchStudentDetail = useCallback(async (studentId: string, forceRefresh = false) => {
    if (!session?.access_token || !studentId) return
    
    const cacheKey = `${classroomId}-${studentId}`
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = studentDetailCache.get(cacheKey)
      if (cached) {
        const age = Date.now() - cached.timestamp
        if (age < CACHE_DURATION) {
          // Use cached data
          setStudentDetail(cached.data)
          return
        }
      }
    }
    
    setLoadingStudentDetail(true)
    try {
      const data = await api.getStudentAnalytics(classroomId, studentId, session.access_token)
      // Update cache
      studentDetailCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })
      setStudentDetail(data)
    } catch (error) {
      // Error occurred
      // On error, try to use cached data if available
      const cached = studentDetailCache.get(cacheKey)
      if (cached) {
        setStudentDetail(cached.data)
      } else {
      setStudentDetail(null)
      }
    } finally {
      setLoadingStudentDetail(false)
    }
  }, [classroomId, session?.access_token])

  const handleStudentSelect = (studentId: string | null) => {
    setSelectedStudentId(studentId)
    if (studentId) {
      fetchStudentDetail(studentId).then(() => {
        // Scroll to student detail view after loading to show feedback
        setTimeout(() => {
          const detailElement = document.getElementById('student-detail-view')
          if (detailElement) {
            detailElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      })
    } else {
      setStudentDetail(null)
    }
  }

  useEffect(() => {
    if (!session?.access_token || !classroomId) return
    
    // Initial fetch - check cache first
    const cached = analyticsCache.get(classroomId)
    if (cached) {
      const age = Date.now() - cached.timestamp
      if (age < CACHE_DURATION) {
        // Use cached data immediately
        const data = cached.data
        setAnalytics({
          analytics_id: data.analytics_id || '',
          teacher_id: data.teacher_id || '',
          classroom_id: classroomId,
          date: data.date || new Date().toISOString(),
          total_students: data.metrics?.total_students || 0,
          active_students: data.metrics?.active_students || 0,
          total_activities_assigned: data.metrics?.total_activities_assigned || 0,
          completed_activities: data.metrics?.completed_activities || 0,
          average_score: data.metrics?.average_score || 0,
          struggling_concepts: data.struggling_concepts || [],
          top_performers: data.top_performers || {},
          insights: data.insights || '',
          created_at: data.created_at || new Date().toISOString()
        })
        setStudentPerformance(data.student_performance || [])
        setLoading(false)
        // Still fetch in background if cache is getting stale (more than 20 seconds old)
        if (age > 20000) {
          fetchAnalytics(false, false)
        }
      } else {
        // Cache expired, fetch fresh data
        fetchAnalytics()
      }
    } else {
      // No cache, fetch fresh data
    fetchAnalytics()
    }
    
    // Only auto-refresh if the page is visible (not in background)
    // Reduced frequency to 5 minutes to prevent excessive API calls
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Check cache before fetching
        const cached = analyticsCache.get(classroomId)
        if (cached) {
          const age = Date.now() - cached.timestamp
          if (age < CACHE_DURATION) {
            // Cache still valid, don't fetch
            return
          }
        }
        fetchAnalytics()
      }
    }
    
    // Refresh every 5 minutes (300000ms) instead of 30 seconds to reduce server load
    const interval = setInterval(() => {
      if (!document.hidden) {
        // Check cache before fetching
        const cached = analyticsCache.get(classroomId)
        if (cached) {
          const age = Date.now() - cached.timestamp
          if (age < CACHE_DURATION) {
            // Cache still valid, don't fetch
            return
          }
        }
        fetchAnalytics()
      }
    }, 300000) // 5 minutes
    
    // Also refresh when page becomes visible (user returns to tab)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchAnalytics])

  // Filtered and sorted students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = studentPerformance.filter(student => 
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'score':
          return b.average_score - a.average_score
        case 'completion':
          const aRate = a.total_activities > 0 ? (a.completed_activities / a.total_activities) : 0
          const bRate = b.total_activities > 0 ? (b.completed_activities / b.total_activities) : 0
          return bRate - aRate
        default:
          return 0
      }
    })
    
    return filtered
  }, [studentPerformance, searchQuery, sortBy])

  // Helper function to get completion color
  const getCompletionColor = (percentage: number) => {
    if (percentage >= 70) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: 'bg-green-500' }
    if (percentage >= 40) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', bar: 'bg-yellow-500' }
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-500' }
  }

  // Helper function to get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' }
    if (score >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500' }
    return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' }
  }

  // Calculate trend (simplified - comparing to class average)
  const getTrend = (studentScore: number) => {
    const classAverage = analytics?.average_score || 0
    if (studentScore === 0 || classAverage === 0) return null
    const diff = studentScore - classAverage
    if (Math.abs(diff) < 2) return 'neutral'
    return diff > 0 ? 'up' : 'down'
  }

  // Calculate completion percentage
  const completionPercentage = analytics?.total_activities_assigned
    ? ((analytics.completed_activities || 0) / analytics.total_activities_assigned * 100)
    : 0
  const completionColors = getCompletionColor(completionPercentage)

  // Generate insights
  const generateInsight = useMemo(() => {
    if (!analytics) return null
    
    const totalStudents = analytics.total_students || 0
    const completed = analytics.completed_activities || 0
    const total = analytics.total_activities_assigned || 0
    
    if (total === 0) {
      return "No activities assigned yet. Create your first activity to get started!"
    }
    
    const completionPct = (completed / total) * 100
    
    if (completionPct < 40) {
      return "Most students haven't started yet—sending a reminder may help boost engagement."
    }
    
    if (completionPct >= 40 && completionPct < 70) {
      return "Good progress! Consider checking in with students who haven't completed activities."
    }
    
    if (completionPct >= 70) {
      return "Excellent completion rate! Your students are actively engaging with the material."
    }
    
    return null
  }, [analytics])

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="space-y-8 animate-pulse">
      <div className="h-32 bg-slate-200 rounded-xl"></div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-200 rounded-lg"></div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-slate-200 rounded-lg"></div>
        ))}
      </div>
      </div>
    )

  if (loading) {
    return <SkeletonLoader />
  }

  return (
    <div className="space-y-12">

      {/* Quick Stats Summary */}
      {studentPerformance.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start justify-items-center lg:justify-items-start max-w-6xl mx-auto px-4 sm:px-6">
          {/* Most Active */}
          <div className="space-y-2 flex flex-col w-full sm:w-auto min-w-0 bg-white sm:bg-transparent rounded-lg sm:rounded-none p-4 sm:p-0 shadow-sm sm:shadow-none border border-slate-100 sm:border-0">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Most Active</p>
            </div>
            <p className="text-base sm:text-lg font-semibold text-slate-900 truncate" title={
              [...filteredAndSortedStudents].sort((a, b) => b.completed_activities - a.completed_activities)[0]?.name
            }>
              {[...filteredAndSortedStudents].sort((a, b) => b.completed_activities - a.completed_activities)[0]?.name || '—'}
            </p>
          </div>

          {/* Needs Attention */}
          <div className="space-y-2 flex flex-col w-full sm:w-auto min-w-0 bg-white sm:bg-transparent rounded-lg sm:rounded-none p-4 sm:p-0 shadow-sm sm:shadow-none border border-slate-100 sm:border-0">
            {(() => {
              const needsAttention = [...filteredAndSortedStudents]
                .filter(s => s.total_activities > 0 && (s.completed_activities / s.total_activities) < 0.5)
              const student = needsAttention[0]
              const reason = student ? 
                (student.completed_activities === 0 ? 'not started' : 
                 (student.completed_activities / student.total_activities) < 0.3 ? 'low completion' : 'incomplete') 
                : null
              return (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Needs Attention
                    </p>
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-slate-900 truncate" title={student?.name}>
                    {student?.name || '—'}
                  </p>
                  {reason && (
                    <p className="text-xs text-amber-600 font-medium">{reason}</p>
                  )}
                </>
              )
            })()}
        </div>

          {/* Class Average */}
          <div className="space-y-2 flex flex-col w-full sm:w-auto min-w-0 bg-white sm:bg-transparent rounded-lg sm:rounded-none p-4 sm:p-0 shadow-sm sm:shadow-none border border-slate-100 sm:border-0">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Class Average</p>
            </div>
            <p className="text-2xl sm:text-3xl font-light text-slate-900">
              {analytics?.average_score ? `${analytics.average_score.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500">
              {filteredAndSortedStudents.filter(s => s.average_score > 0).length} {filteredAndSortedStudents.filter(s => s.average_score > 0).length === 1 ? 'student' : 'students'} scored
            </p>
          </div>

          {/* Activities Completed Ring */}
          {analytics && (
            <div className="space-y-2 flex flex-col items-center w-full sm:w-auto bg-white sm:bg-transparent rounded-lg sm:rounded-none p-4 sm:p-0 shadow-sm sm:shadow-none border border-slate-100 sm:border-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider w-full text-center lg:text-left">Activities Completed</p>
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <svg className="transform -rotate-90 w-full h-full">
                  {/* Background circle */}
                  <circle
                    cx="50%"
                    cy="50%"
                    r="42%"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-100"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50%"
                    cy="50%"
                    r="42%"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={`transition-all duration-700 ease-out ${
                      ((analytics.completed_activities || 0) / Math.max(analytics.total_activities_assigned || 1, 1) * 100) >= 70 ? 'text-green-500' :
                      ((analytics.completed_activities || 0) / Math.max(analytics.total_activities_assigned || 1, 1) * 100) >= 40 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - ((analytics.completed_activities || 0) / Math.max(analytics.total_activities_assigned || 1, 1)))}`}
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-none">
                    {analytics.completed_activities || 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-none">of {analytics.total_activities_assigned || 0}</p>
          </div>
        </div>
            </div>
          )}
        </div>
      )}

      {/* Student Performance Section */}
      <div className="pt-4">
        <div className="mb-6 sm:mb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <h3 className="text-base sm:text-lg font-medium text-slate-900">Student Performance</h3>
              {studentPerformance.length > 0 && (
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {filteredAndSortedStudents.length} {filteredAndSortedStudents.length === 1 ? 'student' : 'students'}
                </span>
              )}
            </div>
            {studentPerformance.length > 0 && (
              <span className="text-xs text-slate-500 sm:hidden">
                {filteredAndSortedStudents.length} {filteredAndSortedStudents.length === 1 ? 'student' : 'students'}
              </span>
            )}
          </div>
          
          {/* Controls - Stacked on mobile, horizontal on desktop */}
          {studentPerformance.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search - Full width on mobile */}
              <div className="relative flex-1 w-full sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                />
              </div>
              
              {/* Sort and Student Selector - Side by side on mobile, full width */}
              <div className="flex gap-2 sm:gap-3">
                {/* Sort */}
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'score' | 'completion')}
                    className="appearance-none bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 cursor-pointer hover:border-slate-400 transition-colors w-full"
                  >
                    <option value="score">Sort by Score</option>
                    <option value="completion">Sort by Completion</option>
                    <option value="name">Sort by Name</option>
                  </select>
                  <Filter className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 pointer-events-none" />
                </div>
                
                {/* Student Selector */}
                <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
              <select
                value={selectedStudentId || ''}
                onChange={(e) => handleStudentSelect(e.target.value || null)}
                    className="appearance-none bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 cursor-pointer hover:border-slate-400 transition-colors w-full"
              >
                    <option value="">View All</option>
                {studentPerformance.map((student) => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.name} ({student.average_score.toFixed(1)}%)
                  </option>
                ))}
              </select>
                  <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Student Detail View */}
        {selectedStudentId && (
          <div id="student-detail-view" className="mb-8 p-6 sm:p-8">
            {loadingStudentDetail ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Loading student details...</p>
                </div>
              </div>
            ) : studentDetail ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h4 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">{studentDetail.name}</h4>
                    <p className="text-sm text-slate-600">{studentDetail.email}</p>
                  </div>
                  <button
                    onClick={() => handleStudentSelect(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    aria-label="Close student detail"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Summary Cards - Neutral tones */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Average Score</p>
                    {studentDetail.summary.average_score > 0 ? (
                      <div className="space-y-2">
                        <p className="text-2xl font-light text-slate-700">
                          {studentDetail.summary.average_score.toFixed(1)}%
                        </p>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-400 transition-all duration-500"
                            style={{ width: `${Math.min(studentDetail.summary.average_score, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Not started</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Completed</p>
                    {studentDetail.summary.total_activities > 0 ? (
                      <div className="space-y-2">
                        <p className="text-2xl font-light text-slate-700">
                          {studentDetail.summary.completed_activities} / {studentDetail.summary.total_activities}
                        </p>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-400 transition-all duration-500"
                            style={{ width: `${Math.min(studentDetail.summary.completion_rate, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No activities</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Completion Rate</p>
                    <p className="text-2xl font-light text-slate-700">
                      {studentDetail.summary.completion_rate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Score Range</p>
                    {studentDetail.summary.lowest_score !== null && studentDetail.summary.highest_score !== null ? (
                      <p className="text-sm font-medium text-slate-600">
                        {studentDetail.summary.lowest_score.toFixed(0)}% - {studentDetail.summary.highest_score.toFixed(0)}%
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No scores yet</p>
                    )}
                  </div>
                </div>

                {/* Activity Breakdown */}
                <div>
                  <h5 className="text-sm font-medium text-slate-700 mb-4">Activity Breakdown</h5>
                  {studentDetail.activity_breakdown.length > 0 ? (
                    <div className="space-y-6">
                      {studentDetail.activity_breakdown.map((activity, idx) => (
                        <ActivityItem key={activity.activity_id || idx} activity={activity} idx={idx} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No activities yet</p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-slate-500">Failed to load student details</p>
              </div>
            )}
          </div>
        )}

        {/* Student Performance Table */}
        {searchQuery && filteredAndSortedStudents.length === 0 && studentPerformance.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700 mb-1">No students found</p>
            <p className="text-xs text-slate-500">No students match "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Clear search
            </button>
          </div>
        ) : filteredAndSortedStudents.length > 0 ? (
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden sm:table-cell">
                      <div className="flex flex-col">
                        <span>Progress</span>
                        <span className="text-[10px] font-normal text-slate-500 normal-case mt-0.5">Completion</span>
                      </div>
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      <div className="flex flex-col items-end">
                        <span>Score</span>
                        <span className="text-[10px] font-normal text-slate-500 normal-case mt-0.5">Accuracy</span>
                      </div>
                    </th>
                    {filteredAndSortedStudents.some(s => s.last_activity_date) && (
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden md:table-cell">
                      Last Activity
                    </th>
                    )}
                    <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedStudents.map((student, idx) => {
                    const completionRate = student.total_activities > 0 
                      ? (student.completed_activities / student.total_activities * 100) 
                      : 0
                    const scoreColors = student.average_score > 0 ? getScoreColor(student.average_score) : null
                    const hasActivity = student.last_activity_date !== null && student.last_activity_date !== undefined
                    
                    return (
                    <tr 
                      key={student.student_id} 
                        className={`hover:bg-slate-50 transition-all duration-200 cursor-pointer group ${
                          selectedStudentId === student.student_id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        } ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      onClick={() => handleStudentSelect(student.student_id)}
                    >
                        <td className="px-4 sm:px-6 py-5">
                          <div className="font-medium text-slate-900 text-sm sm:text-base mb-1 group-hover:text-slate-700 transition-colors">
                            {student.name}
                          </div>
                          {student.total_activities > 0 ? (
                            <div className="sm:hidden space-y-1">
                              <div className="flex items-center justify-between text-xs text-slate-600">
                                <span>{student.completed_activities} / {student.total_activities}</span>
                                <span className="text-slate-500">
                                  {((student.completed_activities / student.total_activities) * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    (student.completed_activities / student.total_activities * 100) >= 70 ? 'bg-green-500' :
                                    (student.completed_activities / student.total_activities * 100) >= 40 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min((student.completed_activities / student.total_activities * 100), 100)}%` }}
                                />
                              </div>
                        </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic sm:hidden mt-1">No activities assigned</div>
                          )}
                      </td>
                        <td className="px-4 sm:px-6 py-5 hidden sm:table-cell">
                          {student.total_activities > 0 ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                <span>{student.completed_activities} / {student.total_activities}</span>
                                <span className="text-slate-500">{completionRate.toFixed(0)}%</span>
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden relative group">
                                <div 
                                  className={`h-full transition-all ${
                                    completionRate >= 70 ? 'bg-green-500' :
                                    completionRate >= 40 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(completionRate, 100)}%` }}
                                />
                                <div className="absolute -top-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                                  Progress: {completionRate.toFixed(0)}% complete
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No activities assigned</span>
                          )}
                      </td>
                        <td className="px-4 sm:px-6 py-5 text-right">
                          {student.average_score > 0 ? (
                            <div className="flex items-center justify-end gap-2 group relative">
                              <span className={`text-sm font-semibold ${scoreColors?.text || 'text-slate-900'}`}>
                          {student.average_score.toFixed(1)}%
                        </span>
                              {(() => {
                                const trend = getTrend(student.average_score)
                                if (trend === 'up') return <ArrowUp className="w-3 h-3 text-green-600" />
                                if (trend === 'down') return <ArrowDown className="w-3 h-3 text-red-600" />
                                return <Minus className="w-3 h-3 text-slate-400" />
                              })()}
                              <div className={`w-2 h-2 rounded-full ${scoreColors?.bg || 'bg-slate-300'}`} />
                              <div className="absolute -top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                                Score: {student.average_score.toFixed(1)}% accuracy
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Not started</span>
                          )}
                      </td>
                        {hasActivity && (
                          <td className="px-4 sm:px-6 py-5 text-sm text-slate-600 hidden md:table-cell">
                        {student.last_activity_date
                              ? new Date(student.last_activity_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : null}
                      </td>
                        )}
                        <td className="px-4 sm:px-6 py-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStudentSelect(student.student_id)
                          }}
                            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-110"
                            aria-label="View student details"
                            title="View detailed analytics"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : studentPerformance.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-sm text-slate-600 font-light mb-1">No student data yet</p>
            <p className="text-xs text-slate-400">Performance metrics will appear as students engage with activities</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}


