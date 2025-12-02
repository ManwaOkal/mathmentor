'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut, User, ChevronDown } from 'lucide-react'
import { useAuth } from '../lib/auth/useAuth'
import { UserRole } from '../lib/auth/types'

export default function Auth() {
  const { user, profile, signIn, signUp, signOut, loading } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLogin, setIsLogin] = useState(true)

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Listen for custom event to open auth modal
  useEffect(() => {
    const handleOpenAuth = (e: CustomEvent) => {
      setIsOpen(true)
      setJustLoggedIn(false) // Reset flag when opening modal
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
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [error, setError] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [justLoggedIn, setJustLoggedIn] = useState(false)

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
        // Success - mark that we just logged in
        setJustLoggedIn(true)
        setIsOpen(false)
        setEmail('')
        setPassword('')
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
    if (logoutLoading) return // Prevent double-clicks
    
    try {
      setLogoutLoading(true)
      setError('')
      setDropdownOpen(false)
      // Clear form state
      setIsOpen(false)
      setEmail('')
      setPassword('')
      setName('')
      setRole(UserRole.STUDENT)
      // Sign out
      await signOut()
      // Small delay to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 200))
      // Redirect to homepage with a parameter to prevent auto-login
      window.location.href = '/?logged_out=true'
    } catch (err) {
      console.error('Logout error:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign out')
      // Even if there's an error, try to redirect and clear storage
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }
      setTimeout(() => {
        window.location.href = '/?logged_out=true'
      }, 500)
    } finally {
      setLogoutLoading(false)
    }
  }

  // Redirect after successful login
  useEffect(() => {
    // Only redirect if we just logged in and modal is closed
    if (justLoggedIn && !loading && user && !isOpen) {
      // If profile exists, redirect immediately
      if (profile) {
        setJustLoggedIn(false) // Reset flag
        if (profile.role === UserRole.TEACHER || profile.role === UserRole.ADMIN) {
          router.push('/teacher')
        } else if (profile.role === UserRole.STUDENT) {
          router.push('/student')
        }
      } else {
        // If profile doesn't exist yet, check metadata for role
        const roleFromMetadata = user.user_metadata?.role
        if (roleFromMetadata === 'teacher' || roleFromMetadata === 'admin') {
          setJustLoggedIn(false) // Reset flag
          router.push('/teacher')
        } else if (roleFromMetadata === 'student' || !roleFromMetadata) {
          // Default to student if no role specified
          setJustLoggedIn(false) // Reset flag
          router.push('/student')
        }
      }
    }
  }, [justLoggedIn, user, profile, loading, isOpen, router])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!user || !profile) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen, user, profile])

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (user && profile) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group opacity-90 hover:opacity-100"
        >
          {/* User info with integrated badge - reduced prominence */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate">
                    {profile.name}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded uppercase tracking-wide opacity-75">
                    {profile.role}
                  </span>
                </div>
                <span className="text-xs text-slate-400 max-w-[140px] truncate">
                  {profile.email}
                </span>
              </div>
            </div>
            <span className="sm:hidden text-sm font-medium text-slate-700 max-w-[80px] truncate">
              {profile.name}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            <div className="px-4 py-3 border-b border-slate-100 sm:hidden">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-slate-900">{profile.name}</span>
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded uppercase">
                  {profile.role}
                </span>
              </div>
              <span className="text-xs text-slate-500">{profile.email}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              <span>{logoutLoading ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
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
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false)
            }
          }}
        >
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
            <div 
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 md:p-8 w-full max-w-md my-8 relative"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex justify-between items-center mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {isLogin ? 'Welcome Back' : 'Create Your Account'}
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setJustLoggedIn(false) // Reset flag when closing modal manually
                  setError('')
                  setEmail('')
                  setPassword('')
                  setName('')
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors text-xl sm:text-2xl leading-none w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="w-full px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 transition-all"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.STUDENT)}
                        className={`px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-all text-sm sm:text-base font-medium ${
                          role === UserRole.STUDENT
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.TEACHER)}
                        className={`px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-all text-sm sm:text-base font-medium ${
                          role === UserRole.TEACHER
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                        }`}
                      >
                        Teacher
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isLogin ? undefined : 6}
                  className="w-full px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 transition-all"
                  placeholder="••••••••"
                />
                {!isLogin && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
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
                  className="text-xs sm:text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
                </button>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-slate-900 text-white py-3 sm:py-3.5 px-4 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base font-medium shadow-sm hover:shadow-md min-h-[44px] flex items-center justify-center"
              >
                {authLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </span>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
