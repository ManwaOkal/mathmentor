'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

interface NavbarProps {
  leftContent?: ReactNode
  centerContent?: ReactNode
  rightContent?: ReactNode
  className?: string
  compact?: boolean
}

export default function Navbar({ 
  leftContent, 
  centerContent, 
  rightContent,
  className = '',
  compact = false
}: NavbarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check if we're on one of the pages that should have the special mobile layout
  const isSpecialPage = pathname === '/' || pathname === '/about' || pathname === '/teachers' || pathname === '/students'
  const shouldUseSpecialMobileLayout = isSpecialPage && !leftContent

  return (
    <nav className={`sticky top-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-slate-200/60 shadow-xl shadow-slate-900/10 overflow-hidden flex flex-col ${className}`}>
      {/* Enhanced gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/40 to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>
      
      {/* Animated shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine pointer-events-none"></div>
      
      <div className={`relative flex items-center w-full gap-2 sm:gap-4 ${
        shouldUseSpecialMobileLayout 
          ? 'md:justify-between' 
          : 'justify-between'
      }`} style={{ height: compact ? '4rem' : '6rem' }}>
        {/* Left: Logo and Navigation Links */}
        <div className="flex items-center flex-shrink-0 min-w-0 pl-3 sm:pl-6 lg:pl-8">
          {leftContent ? (
            <div>{leftContent}</div>
          ) : (
            <>
              {/* Logo */}
              <Link href="/" className="mr-4 sm:mr-6 flex-shrink-0 flex items-center">
                <Image
                  src="/mathmentor_logo.png"
                  alt="MathMentor"
                  width={300}
                  height={100}
                  className={`w-auto ${
                    compact 
                      ? 'h-8 sm:h-10' 
                      : 'h-16 sm:h-20 md:h-24 lg:h-28'
                  }`}
                  priority
                />
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
                <Link 
                  href="/teachers" 
                  className={`relative text-sm font-medium px-4 py-2 rounded-lg transition-all duration-300 group ${
                    pathname === '/teachers'
                      ? 'text-slate-900 bg-gradient-to-br from-slate-100 to-slate-50 font-semibold shadow-md shadow-slate-200/50'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-gradient-to-br hover:from-slate-50 hover:to-white'
                  }`}
                >
                  {pathname === '/teachers' && (
                    <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-50 blur-sm"></span>
                  )}
                  <span className="relative">For Teachers</span>
                  {pathname !== '/teachers' && (
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 group-hover:w-full"></span>
                  )}
                </Link>
                <Link 
                  href="/students" 
                  className={`relative text-sm font-medium px-4 py-2 rounded-lg transition-all duration-300 group ${
                    pathname === '/students'
                      ? 'text-slate-900 bg-gradient-to-br from-slate-100 to-slate-50 font-semibold shadow-md shadow-slate-200/50'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-gradient-to-br hover:from-slate-50 hover:to-white'
                  }`}
                >
                  {pathname === '/students' && (
                    <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-50 blur-sm"></span>
                  )}
                  <span className="relative">For Students</span>
                  {pathname !== '/students' && (
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 group-hover:w-full"></span>
                  )}
                </Link>
              </div>
              
            </>
          )}
        </div>
        
        {/* Center: Custom content OR Auth buttons (mobile only for special pages) */}
        {shouldUseSpecialMobileLayout ? (
          <>
            {/* Center: Auth buttons on mobile */}
            <div className="md:hidden flex-1 flex items-center justify-center min-w-0 px-2">
              {rightContent}
            </div>
            {/* Right: Hamburger on mobile, Auth buttons on desktop */}
            <div className="flex items-center justify-end flex-shrink-0 min-w-0 pr-3 sm:pr-6 lg:pr-8 gap-2 overflow-visible">
              {!leftContent && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              )}
              <div className="hidden md:block overflow-visible">
                {rightContent}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Center: Custom content */}
            {centerContent && (
              <div className="flex-1 flex items-center justify-center min-w-0 px-2">
                {centerContent}
              </div>
            )}
            
            {/* Right: Hamburger (mobile) and Custom content */}
            <div className="flex items-center justify-end flex-shrink-0 min-w-0 pr-3 sm:pr-6 lg:pr-8 gap-2 overflow-visible">
              {!leftContent && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              )}
              <div className="overflow-visible">
                {rightContent}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && !leftContent && (
        <div className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-2">
            <Link
              href="/teachers"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                pathname === '/teachers'
                  ? 'text-slate-900 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm font-medium">For Teachers</span>
            </Link>
            <Link
              href="/students"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                pathname === '/students'
                  ? 'text-slate-900 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm font-medium">For Students</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

