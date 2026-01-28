'use client'

import { useState, useEffect } from 'react'
import { api, ProgressData } from '@/lib/api'
import { Loader2, TrendingUp, CheckCircle, Clock, BookOpen } from 'lucide-react'

export default function ProgressDashboard() {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProgress()
  }, [])

  const loadProgress = async () => {
    try {
      setLoading(true)
      const userId = localStorage.getItem('user_id')
      
      if (!userId) {
        setProgress({
          total_concepts_studied: 0,
          mastered: 0,
          in_progress: 0,
          not_started: 0,
          concepts: [],
        })
        return
      }

      const [progressData, recs] = await Promise.all([
        api.getProgress(),
        api.getRecommendations(5),
      ])
      
      setProgress(progressData)
      setRecommendations(recs.recommendations)
    } catch (error) {
      // Error occurred
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md px-4">
          <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-base sm:text-lg text-gray-900 mb-2">Sign in to track your progress</p>
          <p className="text-sm text-gray-600">
            Login to see your learning statistics and track your mastery of math concepts.
          </p>
        </div>
      </div>
    )
  }

  const masteryPercentage = progress.total_concepts_studied > 0
    ? Math.round((progress.mastered / progress.total_concepts_studied) * 100)
    : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Concepts Studied</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{progress.total_concepts_studied}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Mastered</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{progress.mastered}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">In Progress</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{progress.in_progress}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Mastery Rate</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{masteryPercentage}%</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Recommended Next Steps</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.concept_id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all bg-white"
              >
                <h4 className="font-medium text-sm sm:text-base text-gray-900 mb-1">{rec.name}</h4>
                <p className="text-xs sm:text-sm text-gray-600">
                  {rec.topic_category} • {rec.difficulty}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Concepts */}
      {progress.concepts.length > 0 && (
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Your Learning Journey</h3>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            {progress.concepts.slice(0, 10).map((concept: any) => (
              <div
                key={concept.concept_id}
                className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                    {concept.math_concepts?.name || 'Unknown'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Mastery: {Math.round((concept.mastery_score || 0) * 100)}%
                  </p>
                </div>
                <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-2 ml-4 flex-shrink-0">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(concept.mastery_score || 0) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
