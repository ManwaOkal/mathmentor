'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { UserProfile, UserRole } from './types'
import { getUserProfile } from './auth'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, role: UserRole, name?: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user profile from public.users table
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error loading user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error loading user profile:', error)
      return null
    }
  }

  // Create user profile in public.users table
  const createUserProfile = async (userId: string, email: string, role: UserRole, name?: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          name: name || email.split('@')[0],
        })

      if (error) {
        console.error('Error creating user profile:', error)
        // If user already exists, that's okay
        if (error.code !== '23505') { // Unique violation
          throw error
        }
      }
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  }

  // Update user metadata with role
  const updateUserMetadata = async (userId: string, metadata: Record<string, any>) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: metadata
      })

      if (error) throw error
    } catch (error) {
      console.error('Error updating user metadata:', error)
      throw error
    }
  }

  useEffect(() => {
    let mounted = true

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase not configured - skipping auth initialization')
      setLoading(false)
      return
    }

    // Set a timeout to ensure loading doesn't hang forever
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout - setting loading to false')
        setLoading(false)
      }
    }, 5000) // 5 second timeout

    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        clearTimeout(timeoutId)
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Always set profile from user metadata immediately (fast, non-blocking)
          const profileFromMetadata = getUserProfile(session.user)
          if (mounted) {
            setProfile(profileFromMetadata)
            setLoading(false) // Set loading false immediately - don't wait for DB
          }
          
          // Then try to load/create profile in background (non-blocking, doesn't affect loading state)
          setTimeout(() => {
            if (!mounted) return
            loadUserProfile(session.user.id)
              .then((profileData) => {
                if (!mounted) return
                if (profileData) {
                  // Update with database profile if available
                  setProfile(getUserProfile(session.user))
                } else {
                  // Profile doesn't exist, try to create it (silently)
                  const role = profileFromMetadata?.role || UserRole.STUDENT
                  createUserProfile(
                    session.user.id,
                    session.user.email!,
                    role,
                    session.user.user_metadata?.name
                  ).catch((error) => {
                    // Silently fail - profile already set from metadata
                    console.debug('Profile creation failed (non-critical):', error)
                  })
                }
              })
              .catch((error) => {
                // Silently fail - profile already set from metadata
                console.debug('Profile loading failed (non-critical):', error)
              })
          }, 100) // Small delay to not block UI
        } else {
          setProfile(null)
          if (mounted) {
            setLoading(false)
          }
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        console.error('Error getting session:', error)
        if (mounted) {
          setLoading(false)
          setUser(null)
          setProfile(null)
          setSession(null)
        }
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Always set profile from user metadata first (fast)
        const profileFromMetadata = getUserProfile(session.user)
        if (mounted) {
          setProfile(profileFromMetadata)
        }
        
        // Then try to load/create profile in background (non-blocking)
        try {
          const profileData = await loadUserProfile(session.user.id)
          if (profileData && mounted) {
            // Update with database profile if available
            setProfile(getUserProfile(session.user))
          } else if (mounted) {
            // Profile doesn't exist, try to create it (but don't block)
            const role = profileFromMetadata?.role || UserRole.STUDENT
            createUserProfile(
              session.user.id,
              session.user.email!,
              role,
              session.user.user_metadata?.name
            ).catch((error) => {
              console.error('Error creating profile (non-blocking):', error)
              // Profile already set from metadata, so this is fine
            })
          }
        } catch (error) {
          console.error('Error loading profile (non-blocking):', error)
          // Profile already set from metadata, so continue
        }
      } else {
        setProfile(null)
      }
      
      // Always set loading to false after auth state change
      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (
    email: string,
    password: string,
    role: UserRole = UserRole.STUDENT,
    name?: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
            name: name || email.split('@')[0],
          },
        },
      })

      if (error) {
        return { error }
      }

      // If user was created, create profile in public.users table
      if (data.user) {
        try {
          await createUserProfile(data.user.id, email, role, name)
        } catch (profileError) {
          console.error('Error creating user profile:', profileError)
          // Don't fail signup if profile creation fails - it can be created later
        }
      }

      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      // After successful sign in, wait a moment for session to be established
      // The onAuthStateChange handler will update the user/profile
      if (data.session?.user) {
        // Set user immediately from sign-in response
        setUser(data.session.user)
        setSession(data.session)
        const profileFromMetadata = getUserProfile(data.session.user)
        setProfile(profileFromMetadata)
        setLoading(false)
      }

      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      // Clear local state first
      setUser(null)
      setProfile(null)
      setSession(null)
      
      // Sign out from Supabase (this will trigger onAuthStateChange)
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) {
        console.error('Error signing out:', error)
        // Continue anyway to clear local storage
      }
      
      // Clear any persisted session data from localStorage
      if (typeof window !== 'undefined') {
        // Clear Supabase session from localStorage
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key)
          } catch (e) {
            console.warn('Failed to remove localStorage key:', key, e)
          }
        })
        
        // Also try to clear sessionStorage
        try {
          sessionStorage.clear()
        } catch (e) {
          console.warn('Failed to clear sessionStorage:', e)
        }
      }
      
      // Wait a bit for the auth state change to propagate
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error('Error signing out:', error)
      // Even if there's an error, clear local state and storage
      setUser(null)
      setProfile(null)
      setSession(null)
      if (typeof window !== 'undefined') {
        try {
          const keysToRemove: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key))
        } catch (e) {
          console.warn('Failed to clear localStorage on error:', e)
        }
      }
      throw error
    }
  }

  const updateProfile = async (
    updates: Partial<UserProfile>
  ): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('No user logged in') }
    }

    try {
      // Update user metadata
      const metadataUpdates: Record<string, any> = {}
      if (updates.name) metadataUpdates.name = updates.name
      if (updates.role) metadataUpdates.role = updates.role
      if (updates.avatar_url) metadataUpdates.avatar_url = updates.avatar_url
      if (updates.classroom_ids) metadataUpdates.classroom_ids = updates.classroom_ids
      if (updates.preferences) metadataUpdates.preferences = updates.preferences

      if (Object.keys(metadataUpdates).length > 0) {
        await updateUserMetadata(user.id, metadataUpdates)
      }

      // Update public.users table
      const dbUpdates: Record<string, any> = {}
      if (updates.name) dbUpdates.name = updates.name

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('users')
          .update(dbUpdates)
          .eq('id', user.id)

        if (error) throw error
      }

      // Reload profile
      const updatedProfile = await loadUserProfile(user.id)
      if (updatedProfile && user) {
        setProfile(getUserProfile(user))
      }

      return { error: null }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { error: error as Error }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

