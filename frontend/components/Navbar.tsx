'use client'

import { BookOpen } from 'lucide-react'
import { ReactNode } from 'react'
import Link from 'next/link'

interface NavbarProps {
  leftContent?: ReactNode
  centerContent?: ReactNode
  rightContent?: ReactNode
  className?: string
}

export default function Navbar({ 
  leftContent, 
  centerContent, 
  rightContent,
  className = ''
}: NavbarProps) {
  return (
    <nav className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm ${className}`}>
      <div className="flex items-center justify-between h-14 w-full">
        {/* Left: MathMentor Logo (always present) */}
        <div className="flex items-center flex-1 min-w-0 pl-4 sm:pl-6 lg:pl-8">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-slate-700 stroke-[1.5]" />
            </div>
            <div className="text-base font-semibold text-slate-900 truncate tracking-tight leading-tight">
              MathMentor
            </div>
          </Link>
          {leftContent && <div className="ml-6">{leftContent}</div>}
          {!leftContent && (
            <div className="hidden md:flex items-center gap-6 ml-8">
              <Link href="/how-it-works" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                How It Works
              </Link>
              <Link href="/about" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                About
              </Link>
            </div>
          )}
        </div>
        
        {/* Center: Custom content */}
        {centerContent && (
          <div className="flex-1 flex items-center justify-center min-w-0">
            {centerContent}
          </div>
        )}
        
        {/* Right: Custom content */}
        <div className="flex items-center justify-end flex-1 min-w-0 pr-4 sm:pr-6 lg:pr-8">
          {rightContent}
        </div>
      </div>
    </nav>
  )
}

