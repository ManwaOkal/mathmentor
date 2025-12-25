'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home as HomeIcon, Menu, X } from 'lucide-react'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className={`sticky top-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-slate-200/60 shadow-xl shadow-slate-900/10 ${className}`}>
      {/* Enhanced gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/40 to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>
      
      {/* Animated shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine pointer-events-none"></div>
      
      <div className="relative flex items-center justify-between h-16 w-full gap-2 sm:gap-4">
        {/* Left: Navigation Links */}
        <div className="flex items-center flex-shrink-0 min-w-0 pl-3 sm:pl-6 lg:pl-8">
          {leftContent ? (
            <div>{leftContent}</div>
          ) : (
            <>
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/"
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-all duration-200 flex-shrink-0 group ${
                    pathname === '/'
                      ? 'text-slate-900 bg-slate-100 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <HomeIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span className="text-sm font-medium hidden sm:inline">Home</span>
                </Link>
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
              
              {/* Mobile Hamburger Button */}
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
            </>
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
      
      {/* Mobile Menu */}
      {mobileMenuOpen && !leftContent && (
        <div className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                pathname === '/'
                  ? 'text-slate-900 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Home</span>
            </Link>
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

