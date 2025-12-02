'use client'

import { useState, useEffect } from 'react'
import { LogIn, LogOut, User } from 'lucide-react'
import { useAuth } from '../lib/auth/useAuth'
import { UserRole } from '../lib/auth/types'

export default function Auth() {
  const { user, profile, signIn, signUp, signOut, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isLogin, setIsLogin] = useState(true)

  // Listen for custom event to open auth modal
  useEffect(() => {
    const handleOpenAuth = (e: CustomEvent) => {
      setIsOpen(true)
      if (e.detail?.signup) {
        setIsLogin(false)
      } else {
        setIsLogin(true)
      }
    }

    window.addEventListener('openAuth' as any, handleOpenAuth as EventListener)
    return () => {
      window.removeEventListener('openAuth' as any, handleOpenAuth as EventListener)
    }
  }, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setAuthLoading(true)

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password)
        if (signInError) {
          setError(signInError.message || 'Failed to sign in')
          return
        }
      } else {
        // Validate signup fields
        if (!name.trim()) {
          setError('Name is required')
          return
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          return
        }
        
        const { error: signUpError } = await signUp(email, password, role, name)
        if (signUpError) {
          setError(signUpError.message || 'Failed to sign up')
          return
        }
        
        // Show success message
        setError('')
        alert('Account created! Please check your email to verify your account before signing in.')
      }
      
      setIsOpen(false)
      setEmail('')
      setPassword('')
      setName('')
      setRole(UserRole.STUDENT)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (user && profile) {
    return (
      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-700">
          <User className="w-4 h-4" />
          <div className="hidden sm:flex flex-col">
            <span className="max-w-[120px] lg:max-w-none truncate font-medium">
              {profile.name}
            </span>
            <span className="text-xs text-gray-500 truncate max-w-[120px] lg:max-w-none">
              {profile.email}
            </span>
          </div>
          <span className="sm:hidden max-w-[80px] truncate">{profile.name}</span>
        </div>
        <div className="hidden sm:block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
          {profile.role}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(true)}
          className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
        >
          Login
        </button>
        <button
          onClick={() => {
            setIsOpen(true)
            setIsLogin(false)
          }}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all text-sm font-medium shadow-sm hover:shadow-md"
        >
          Get Started
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {isLogin ? 'Login' : 'Sign Up'}
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setError('')
                  setEmail('')
                  setPassword('')
                  setName('')
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base text-gray-900"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.STUDENT)}
                        className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
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
                        className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base text-gray-900"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isLogin ? undefined : 6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base text-gray-900"
                  placeholder="••••••••"
                />
                {!isLogin && (
                  <p className="mt-1 text-xs text-gray-500">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
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
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
                </button>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
              >
                {authLoading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
