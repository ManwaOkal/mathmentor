'use client'

import { useState } from 'react'
import { Users, CheckCircle, AlertCircle, Copy } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'

interface JoinClassroomProps {
  onJoinSuccess?: (classroomId: string) => void
  onClose?: () => void
}

export default function JoinClassroom({ onJoinSuccess, onClose }: JoinClassroomProps) {
  const { user, session } = useAuth()
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a join code')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Check if user is logged in
      if (!user || !session) {
        setError('Please log in first. Go to the home page and sign in.')
        setLoading(false)
        return
      }

      const sessionToken = session.access_token
      const result = await api.joinClassroom(joinCode.trim().toUpperCase(), sessionToken)
      
      setSuccess(`Successfully joined: ${result.classroom_name || 'classroom'}`)
      setJoinCode('')
      
      if (onJoinSuccess) {
        onJoinSuccess(result.classroom_id)
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (error: any) {
      console.error('Error joining classroom:', error)
      const errorMessage = error?.message || error?.detail || 'Failed to join classroom. Please check the join code and try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setJoinCode(text.trim().toUpperCase())
    } catch (err) {
      console.error('Failed to read clipboard:', err)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-center mb-4">
        <Users className="w-10 h-10 text-slate-700" />
      </div>
      
      <p className="text-slate-600 text-center mb-6 text-sm">
        Enter the join code provided by your teacher
      </p>

      <div className="space-y-5">
        {/* Join Code Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Join Code
          </label>
          <div className="relative">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={10}
              className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 uppercase font-mono text-center text-lg tracking-wider transition-all"
              disabled={loading}
            />
            <button
              onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
              title="Paste from clipboard"
              type="button"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Join Button */}
        <button
          onClick={handleJoin}
          disabled={loading || !joinCode.trim()}
          className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
        >
          {loading ? 'Joining...' : 'Join Classroom'}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 pt-5 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center">
          Don't have a join code? Ask your teacher for the classroom join code.
        </p>
      </div>
    </div>
  )
}

