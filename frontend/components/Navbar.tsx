'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  const pathname = usePathname()
  const isLandingPage = pathname === '/'

  return (
    <nav className={`sticky top-0 z-50 bg-[#fafafa]/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm ${className}`}>
      <div className="flex items-center justify-between h-14 w-full gap-2 sm:gap-4">
        {/* Left: Content */}
        <div className="flex items-center flex-shrink-0 min-w-0 pl-3 sm:pl-6 lg:pl-8">
          {leftContent && <div>{leftContent}</div>}
          {!leftContent && isLandingPage && (
            <div className="hidden md:flex items-center gap-6">
              <Link href="/students" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                For Students
              </Link>
              <Link href="/teachers" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                For Teachers
              </Link>
              <Link href="/about" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                About
              </Link>
            </div>
          )}
        </div>
        
        {/* Center: Custom content */}
        {centerContent && (
          <div className="flex-1 flex items-center justify-center min-w-0 px-2">
            {centerContent}
          </div>
        )}
        
        {/* Right: Custom content - with consistent spacing */}
        <div className="flex items-center justify-end flex-shrink-0 min-w-0 pr-3 sm:pr-6 lg:pr-8">
          {rightContent}
        </div>
      </div>
    </nav>
  )
}

