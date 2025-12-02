'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

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
  const [stats, setStats] = useState<QuickStats>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classroomId) return
    
    loadStats()
    // Auto-refresh every 5 seconds to get updated student count
    const interval = setInterval(loadStats, 5000)
    return () => clearInterval(interval)
  }, [classroomId])

  const loadStats = async () => {
    try {
      const data = await api.getClassroomAnalytics(classroomId, 'week')
      if (data && data.metrics) {
        setStats({
          total_students: data.metrics.total_students || 0,
          active_students: data.metrics.active_students || 0,
          completed_activities: data.metrics.completed_activities || 0,
          average_score: data.metrics.average_score || 0
        })
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      // Keep previous stats on error, don't reset to zero
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Loading analytics...</div>
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <Users className="w-5 h-5 text-slate-700" />
        </div>
        <div>
          <div className="text-xs text-slate-500">Total Students</div>
          <div className="text-lg font-semibold text-slate-900 tracking-tight">
            {stats.total_students || 0}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <TrendingUp className="w-5 h-5 text-slate-700" />
        </div>
        <div>
          <div className="text-xs text-slate-500">Active Students</div>
          <div className="text-lg font-semibold text-slate-900 tracking-tight">
            {stats.active_students || 0}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <CheckCircle className="w-5 h-5 text-slate-700" />
        </div>
        <div>
          <div className="text-xs text-slate-500">Completed</div>
          <div className="text-lg font-semibold text-slate-900 tracking-tight">
            {stats.completed_activities || 0}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <AlertCircle className="w-5 h-5 text-slate-700" />
        </div>
        <div>
          <div className="text-xs text-slate-500">Avg Score</div>
          <div className="text-lg font-semibold text-slate-900 tracking-tight">
            {stats.average_score ? `${stats.average_score.toFixed(1)}%` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}

