'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Users, CheckCircle, AlertCircle, Award, BookOpen } from 'lucide-react'
import { ClassroomAnalytics } from '@/lib/auth/types'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'

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

interface ScoreDistribution {
  range: string
  count: number
}

export default function AnalyticsDashboard({ 
  classroomId
}: AnalyticsDashboardProps) {
  const { session } = useAuth()
  const [analytics, setAnalytics] = useState<ClassroomAnalytics | null>(null)
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([])
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    if (!session?.access_token) return
    
    setLoading(true)
    try {
      const data = await api.getClassroomAnalytics(classroomId, 'week', session.access_token)
      if (data) {
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
        setScoreDistribution(data.score_distribution || [])
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [classroomId, session?.access_token])

  useEffect(() => {
    if (!session?.access_token || !classroomId) return
    
    fetchAnalytics()
    // Auto-refresh every 30 seconds to get updated analytics (reduced frequency)
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 text-sm">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-2xl sm:text-3xl font-light text-slate-900 tracking-tight mb-1">Analytics</h2>
        <p className="text-xs sm:text-sm text-slate-500 font-light">Classroom performance overview</p>
      </div>

      {/* Overview Metrics - Rebalanced Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {/* First metric - left aligned, prominent */}
        <div className="sm:col-span-1">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Students</p>
            <div className="flex items-baseline space-x-3">
              <p className="text-3xl sm:text-4xl font-light text-slate-900">{analytics?.total_students || 0}</p>
              <div className="p-2 rounded-lg bg-slate-50">
                <Users className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Middle two metrics - grouped tighter */}
        <div className="sm:col-span-2 lg:col-span-2 grid grid-cols-2 gap-6 sm:gap-8">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Score</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl sm:text-3xl font-light text-slate-900">
                {analytics?.average_score ? `${analytics.average_score.toFixed(1)}%` : 'N/A'}
              </p>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completion</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl sm:text-3xl font-light text-slate-900">
                {analytics?.total_activities_assigned
                  ? `${((analytics.completed_activities || 0) / analytics.total_activities_assigned * 100).toFixed(1)}%`
                  : 'N/A'}
              </p>
              <CheckCircle className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Last metric - slightly offset */}
        <div className="sm:col-span-1 lg:col-span-1 lg:text-right">
          <div className="space-y-2 lg:inline-block">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</p>
            <div className="flex items-baseline lg:justify-end space-x-2">
              <Award className="w-4 h-4 text-slate-400" />
              <p className="text-3xl sm:text-4xl font-light text-slate-900">{analytics?.active_students || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row - Breathing Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Score Distribution Chart */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-8">Score Distribution</h3>
          {scoreDistribution.length > 0 ? (
            <div className="space-y-6">
              {scoreDistribution.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 font-light">{item.range}</span>
                    <span className="text-sm font-medium text-slate-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-slate-900 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${(item.count / Math.max(...scoreDistribution.map(s => s.count), 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 font-light mb-1">No data yet</p>
              <p className="text-xs text-slate-400">Scores will appear here as students complete activities</p>
            </div>
          )}
        </div>

        {/* Activity Completion Chart */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-8">Activity Completion</h3>
          {analytics?.total_activities_assigned ? (
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-light">Completed</span>
                  <span className="text-sm font-medium text-slate-900">
                    {analytics.completed_activities || 0} / {analytics.total_activities_assigned}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-900 h-2 rounded-full transition-all"
                    style={{
                      width: `${((analytics.completed_activities || 0) / analytics.total_activities_assigned) * 100}%`
                    }}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-light">Pending</span>
                  <span className="text-sm font-medium text-slate-900">
                    {analytics.total_activities_assigned - (analytics.completed_activities || 0)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-300 h-2 rounded-full transition-all"
                    style={{
                      width: `${((analytics.total_activities_assigned - (analytics.completed_activities || 0)) / analytics.total_activities_assigned) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 font-light mb-1">No activities yet</p>
              <p className="text-xs text-slate-400">Assign activities to see completion data</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights - Conversational Banner */}
      {analytics?.insights && (
        <div className="relative">
          <div className="bg-gradient-to-r from-slate-50 to-slate-50/50 rounded-2xl px-8 py-6 border-l-4 border-slate-900">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 mb-2">Insights</h3>
                  <p className="text-slate-700 text-sm leading-relaxed font-light">{analytics.insights}</p>
                </div>
                
                {analytics.struggling_concepts && analytics.struggling_concepts.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Struggling Concepts</p>
                    <div className="flex flex-wrap gap-2">
                      {analytics.struggling_concepts.map((concept, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-white text-slate-700 rounded-full text-xs font-medium border border-slate-200 shadow-sm"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Performance Table */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-6 sm:mb-8">Student Performance</h3>
        {studentPerformance.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-2 sm:px-0 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-2 sm:px-0 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                      Completed
                    </th>
                    <th className="px-2 sm:px-0 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-2 sm:px-0 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Last Activity
                    </th>
                    <th className="px-2 sm:px-0 py-3 sm:py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentPerformance.map((student, idx) => (
                    <tr 
                      key={student.student_id} 
                      className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${
                        idx === studentPerformance.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-2 sm:px-0 py-4 sm:py-5">
                        <div className="font-medium text-slate-900 text-sm sm:text-base">{student.name}</div>
                        <div className="text-xs text-slate-500 sm:hidden mt-1">
                          {student.completed_activities} / {student.total_activities} completed
                        </div>
                      </td>
                      <td className="px-2 sm:px-0 py-4 sm:py-5 whitespace-nowrap text-sm text-slate-600 font-light hidden sm:table-cell">
                        {student.completed_activities} / {student.total_activities}
                      </td>
                      <td className="px-2 sm:px-0 py-4 sm:py-5 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-900">
                          {student.average_score.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-2 sm:px-0 py-4 sm:py-5 whitespace-nowrap text-xs sm:text-sm text-slate-600 font-light hidden md:table-cell">
                        {student.last_activity_date
                          ? new Date(student.last_activity_date).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-2 sm:px-0 py-4 sm:py-5 whitespace-nowrap text-right hidden lg:table-cell">
                        <button
                          onClick={() => {
                            // TODO: Navigate to student detail page
                            console.log('View student:', student.student_id)
                          }}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-sm text-slate-600 font-light mb-1">No student data yet</p>
            <p className="text-xs text-slate-400">Performance metrics will appear as students engage with activities</p>
          </div>
        )}
      </div>
    </div>
  )
}


