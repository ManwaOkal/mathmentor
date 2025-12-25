'use client'

import { Classroom } from '@/lib/auth/types'
import { Home } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Auth from '@/components/Auth'
import { useRouter } from 'next/navigation'

interface TeacherHeaderProps {
  classroom: Classroom | null
  activeSection?: 'activities' | 'analytics' | 'finetuning' | null
  onHomeClick?: () => void
}

export function TeacherHeader({ classroom, activeSection, onHomeClick }: TeacherHeaderProps) {
  const router = useRouter()

  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick()
    } else {
      // Default: go to teacher page root
      router.push('/teacher')
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
        compact={true}
        leftContent={
          <button
            onClick={handleHomeClick}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 flex-shrink-0 group"
          >
            <Home className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="text-sm font-medium hidden sm:inline">Home</span>
          </button>
        }
        centerContent={
          classroom ? (
            <div className="text-center px-2">
              <div className="text-sm sm:text-base font-semibold text-slate-900 truncate tracking-tight leading-tight max-w-[140px] sm:max-w-none">
                {classroom.name}
              </div>
            </div>
          ) : null
        }
        rightContent={
          <Auth />
        }
      />
    </>
  )
}

