'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { UserRole } from '@/lib/auth/types'
import Navbar from '@/components/Navbar'
import { BookOpen, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, signIn, signUp, loading } = useAuth()
  // Check if signup mode is requested via query parameter
  const initialMode = searchParams?.get('mode') === 'signup' ? false : true
  const [isLogin, setIsLogin] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      // If profile exists, redirect immediately
      if (profile) {
        if (profile.role === UserRole.TEACHER || profile.role === UserRole.ADMIN) {
          router.push('/teacher')
        } else {
          router.push('/student')
        }
      } else {
        // If user exists but profile doesn't, check metadata for role
        const roleFromMetadata = user.user_metadata?.role
        if (roleFromMetadata === 'teacher' || roleFromMetadata === 'admin') {
          router.push('/teacher')
        } else if (roleFromMetadata === 'student') {
          router.push('/student')
        }
        // If no role in metadata, wait a bit for profile to load
      }
    }
  }, [user, profile, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setAuthLoading(true)

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password)
        if (signInError) {
          setError(signInError.message || 'Failed to sign in')
          setAuthLoading(false)
          return
        }
        // Success - wait a moment for auth state to update, then redirect will happen via useEffect
        // Small delay to ensure user/profile state is updated
        setTimeout(() => {
          // Redirect logic is handled in useEffect
        }, 100)
      } else {
        // Validate signup fields
        if (!name.trim()) {
          setError('Name is required')
          setAuthLoading(false)
          return
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setAuthLoading(false)
          return
        }
        
        const { error: signUpError } = await signUp(email, password, role, name)
        if (signUpError) {
          setError(signUpError.message || 'Failed to sign up')
          setAuthLoading(false)
          return
        }
        
        // Show success message and reset form
        setError('')
        setAuthLoading(false)
        setIsLogin(true)
        setEmail('')
        setPassword('')
        setName('')
        setRole(UserRole.STUDENT)
        
        // Show success message after state updates
        setTimeout(() => {
          alert('Account created successfully! You can now sign in.')
        }, 100)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setAuthLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-3 text-slate-600">Loading...</div>
        </div>
      </div>
    )
  }

  // Don't render if already logged in (redirect is happening)
  if (user && profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        rightContent={
          <Link 
            href="/"
            className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Link>
        }
      />

      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <BookOpen className="w-8 h-8 text-slate-700" />
              <span className="text-2xl font-semibold text-slate-900">MathMentor</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Your Account'}
            </h1>
            <p className="text-slate-600">
              {isLogin 
                ? 'Sign in to continue to your portal' 
                : 'Join MathMentor and start your learning journey'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.STUDENT)}
                        className={`px-4 py-3 rounded-lg border-2 transition-colors font-medium ${
                          role === UserRole.STUDENT
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.TEACHER)}
                        className={`px-4 py-3 rounded-lg border-2 transition-colors font-medium ${
                          role === UserRole.TEACHER
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Teacher
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isLogin ? undefined : 6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900"
                  placeholder="••••••••"
                />
                {!isLogin && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setError('')
                    setEmail('')
                    setPassword('')
                    setName('')
                    setRole(UserRole.STUDENT)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
                </button>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-slate-900 text-white py-3 px-4 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-base"
              >
                {authLoading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-3 text-slate-600">Loading...</div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

