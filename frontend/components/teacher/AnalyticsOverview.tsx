'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'

interface AnalyticsOverviewProps {
  classroomId: string
}

interface QuickStats {
  total_students?: number
  active_students?: number
  completed_activities?: number
  average_score?: number
}

export function AnalyticsOverview({ classroomId }: AnalyticsOverviewProps) {
  const { session } = useAuth()
  const [stats, setStats] = useState<QuickStats>({})
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    if (!session?.access_token || !classroomId) return
    
    try {
      const data = await api.getClassroomAnalytics(classroomId, 'week', session.access_token)
      if (data && data.metrics) {
        setStats({
          total_students: data.metrics.total_students || 0,
          active_students: data.metrics.active_students || 0,
          completed_activities: data.metrics.completed_activities || 0,
          average_score: data.metrics.average_score || 0
        })
      }
    } catch (error) {
      // Error occurred
      // Keep previous stats on error, don't reset to zero
    } finally {
      setLoading(false)
    }
  }, [classroomId, session?.access_token])

  useEffect(() => {
    if (!classroomId || !session?.access_token) return
    
    loadStats()
    // Auto-refresh every 5 minutes to reduce server load (only when page is visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadStats()
      }
    }
    
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadStats()
      }
    }, 300000) // 5 minutes
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadStats, classroomId, session?.access_token])

  if (loading) {
    return <div className="text-sm text-slate-500">Loading analytics...</div>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg flex-shrink-0">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-500">Total Students</div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
            {stats.total_students || 0}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg flex-shrink-0">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-500">Active Students</div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
            {stats.active_students || 0}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg flex-shrink-0">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-500">Completed</div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
            {stats.completed_activities || 0}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg flex-shrink-0">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-500">Avg Score</div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
            {stats.average_score ? `${stats.average_score.toFixed(1)}%` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}

