'use client'

import { CheckCircle, XCircle, TrendingUp, BookOpen } from 'lucide-react'

interface AIAssessment {
  summary: string
  concept_breakdown: Record<string, number>
  recommendations: string[]
  overall_assessment: 'pass' | 'fail' | 'needs_review'
}

interface AssessmentResultsModalProps {
  score: number
  total: number
  assessment: AIAssessment
  onClose: () => void
  onRetry?: () => void
  onContinue?: () => void
}

export function AssessmentResultsModal({
  score,
  total,
  assessment,
  onClose,
  onRetry,
  onContinue
}: AssessmentResultsModalProps) {
  const percentage = (score / total) * 100
  const passed = percentage >= 70 // Threshold configurable by teacher

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {passed ? (
            <div className="text-green-500 text-6xl mb-4">🎉</div>
          ) : (
            <div className="text-yellow-500 text-6xl mb-4">📚</div>
          )}
          
          <h2 className="text-2xl font-bold mb-2">
            {passed ? 'Congratulations!' : 'Keep Practicing!'}
          </h2>
          
          <div className="text-4xl font-bold mb-2">
            {score}/{total} ({percentage.toFixed(1)}%)
          </div>
          
          <div className={`text-lg font-semibold ${
            passed ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {passed ? 'PASS' : 'NEEDS IMPROVEMENT'}
          </div>
        </div>

        {/* AI Assessment */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            AI Assessment
          </h3>
          <p className="text-gray-700 mb-4">{assessment.summary}</p>
          
          {/* Concept Breakdown */}
          {assessment.concept_breakdown && Object.keys(assessment.concept_breakdown).length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2 text-gray-900">Understanding Breakdown:</h4>
              <div className="space-y-2">
                {Object.entries(assessment.concept_breakdown).map(([concept, score]) => (
                  <div key={concept} className="flex items-center">
                    <div className="w-32 truncate text-sm text-gray-700">{concept}</div>
                    <div className="flex-1 ml-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            score >= 0.8 ? 'bg-green-500' : score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${score * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-medium text-gray-700">
                      {(score * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {assessment.recommendations && assessment.recommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
              Recommended Next Steps
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              {assessment.recommendations.map((rec, idx) => (
                <li key={idx} className="text-gray-700 text-sm">{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {!passed && onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Try Again
            </button>
          )}
          {onContinue && (
            <button
              onClick={onContinue}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue Learning
            </button>
          )}
        </div>
      </div>
    </div>
  )
}














