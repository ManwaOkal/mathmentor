'use client'

import { Classroom } from '@/lib/auth/types'
import { Share2 } from 'lucide-react'
import Navbar from '@/components/Navbar'

interface TeacherHeaderProps {
  classroom: Classroom | null
  activeSection?: 'activities' | 'analytics' | 'finetuning' | null
}

export function TeacherHeader({ classroom, activeSection }: TeacherHeaderProps) {
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
      />
      {classroom && (
        <div className="border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-center space-x-2 text-sm text-slate-600">
            <span className="text-slate-500 font-light">Join Code:</span>
            <button
              onClick={copyJoinCode}
              className="font-mono bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md text-xs flex items-center space-x-2 transition-colors font-light"
            >
              <span>{classroom.join_code}</span>
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

