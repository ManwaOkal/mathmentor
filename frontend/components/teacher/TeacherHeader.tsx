'use client'

import { useState } from 'react'
import { Classroom } from '@/lib/auth/types'
import { Share2, LogOut } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/auth/useAuth'
import { useRouter } from 'next/navigation'

interface TeacherHeaderProps {
  classroom: Classroom | null
  activeSection?: 'activities' | 'analytics' | 'finetuning' | null
}

export function TeacherHeader({ classroom, activeSection }: TeacherHeaderProps) {
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const [logoutLoading, setLogoutLoading] = useState(false)

  const handleLogout = async () => {
    if (logoutLoading) return
    
    try {
      setLogoutLoading(true)
      await signOut()
      router.push('/?logged_out=true')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLogoutLoading(false)
    }
  }
  const copyJoinCode = () => {
    if (classroom?.join_code) {
      navigator.clipboard.writeText(classroom.join_code)
      // TODO: Show toast notification
      alert(`Join code copied: ${classroom.join_code}`)
    }
  }

  const getSectionTitle = () => {
    if (!activeSection) return ''
    switch (activeSection) {
      case 'activities': return 'Activities'
      case 'analytics': return 'Analytics'
      case 'finetuning': return 'Fine-Tuning'
      default: return ''
    }
  }

  return (
    <>
      <Navbar
        centerContent={
          classroom ? (
            <div className="text-center">
              <div className="text-base font-semibold text-slate-900 truncate tracking-tight leading-tight">
                {classroom.name}
              </div>
              {activeSection && (
                <div className="text-xs font-light text-slate-500 uppercase tracking-wider mt-0.5">
                  {getSectionTitle()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-base font-semibold text-slate-900 tracking-tight">
              Teacher Dashboard
            </div>
          )
        }
        rightContent={
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{logoutLoading ? 'Signing out...' : 'Sign out'}</span>
          </button>
        }
      />
      {classroom && (
        <div className="border-b border-slate-200 bg-white px-4 sm:px-6 py-2 sm:py-2.5 flex-shrink-0">
          <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <span className="text-slate-500 font-light text-xs">Join Code:</span>
            <button
              onClick={copyJoinCode}
              className="font-mono bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-2 sm:px-3 py-1 rounded text-xs flex items-center gap-1 sm:gap-1.5 transition-colors text-slate-700"
            >
              <span className="text-xs">{classroom.join_code}</span>
              <Share2 className="w-3 h-3 text-slate-500 flex-shrink-0" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

