'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Auth from '@/components/Auth'
import Navbar from '@/components/Navbar'
import { 
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../lib/auth/useAuth'
import { UserRole } from '../lib/auth/types'

function HomeContent() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // If we just logged out, clear any session data
  useEffect(() => {
    if (searchParams?.get('logged_out') === 'true' && typeof window !== 'undefined') {
      // Clear Supabase session from localStorage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      // Remove the query parameter from URL
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  // Redirect logged-in users to their respective portals
  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === UserRole.STUDENT || profile.role === UserRole.ADMIN) {
        router.push('/student')
      } else if (profile.role === UserRole.TEACHER) {
        router.push('/teacher')
      }
    } else if (!loading && user && !profile) {
      // If user exists but profile is still loading, check metadata
      const roleFromMetadata = user.user_metadata?.role
      if (roleFromMetadata === 'student' || roleFromMetadata === 'admin') {
        router.push('/student')
      } else if (roleFromMetadata === 'teacher') {
        router.push('/teacher')
      }
    }
  }, [loading, user, profile, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-3 text-slate-600">Loading...</div>
        </div>
      </div>
    )
  }

  // If user is logged in, show loading while redirecting (prevent flash of homepage)
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-3 text-slate-600">Redirecting...</div>
        </div>
      </div>
    )
  }

  // Show landing page only for non-logged-in users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 relative overflow-hidden">
      {/* Background Pattern Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Aggressive gradient overlays with depth */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(148,163,184,0.15),transparent_60%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(100,116,139,0.12),transparent_60%)]"></div>
        <div className="absolute top-1/2 left-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(71,85,105,0.08),transparent_70%)] transform -translate-x-1/2 -translate-y-1/2"></div>
        
        {/* Stronger grid pattern */}
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: 'linear-gradient(rgba(71,85,105,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(71,85,105,0.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Math Symbols - Larger and More Visible */}
        <div className="absolute top-20 right-1/3 text-8xl font-light text-slate-300/60 select-none rotate-12" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>∑</div>
        <div className="absolute top-40 left-1/4 text-7xl font-light text-slate-300/55 select-none -rotate-6" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>∫</div>
        <div className="absolute top-1/3 right-1/4 text-6xl font-light text-slate-300/50 select-none rotate-45" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>√</div>
        <div className="absolute bottom-1/3 left-1/3 text-7xl font-light text-slate-300/55 select-none -rotate-12" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>π</div>
        <div className="absolute bottom-40 right-1/3 text-6xl font-light text-slate-300/50 select-none rotate-6" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>∞</div>
        <div className="absolute top-1/2 left-1/2 text-5xl font-light text-slate-300/45 select-none transform -translate-x-1/2 -translate-y-1/2 rotate-12" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>Δ</div>
        <div className="absolute top-2/3 right-1/5 text-6xl font-light text-slate-300/50 select-none -rotate-45" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>∂</div>
        <div className="absolute bottom-1/4 left-1/5 text-5xl font-light text-slate-300/45 select-none rotate-12" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>∇</div>
        <div className="absolute top-1/4 right-1/5 text-5xl font-light text-slate-300/45 select-none rotate-30" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>α</div>
        <div className="absolute bottom-1/2 right-1/4 text-6xl font-light text-slate-300/50 select-none -rotate-30" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>β</div>
        <div className="absolute top-3/4 left-1/4 text-5xl font-light text-slate-300/45 select-none rotate-20" style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>θ</div>
        
        {/* Geometric shapes with stronger shadows */}
        <div className="absolute top-32 left-1/3 w-28 h-28 border-3 border-slate-400/40 rotate-45 rounded-lg shadow-xl" style={{
          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))'
        }}></div>
        <div className="absolute bottom-32 right-1/4 w-24 h-24 bg-slate-300/30 rotate-12 rounded-full shadow-xl" style={{
          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))'
        }}></div>
        <div className="absolute top-1/2 right-20 w-20 h-20 border-3 border-slate-400/35 rotate-45 shadow-xl" style={{
          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))'
        }}></div>
        <div className="absolute top-1/4 left-1/5 w-18 h-18 bg-slate-300/25 rotate-30 rounded-lg shadow-lg"></div>
        <div className="absolute bottom-1/4 right-1/5 w-22 h-22 border-3 border-slate-400/30 -rotate-12 rounded-full shadow-xl"></div>
        
        {/* Stronger diagonal lines */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.05]" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(71,85,105,0.15) 10px, rgba(71,85,105,0.15) 20px)'
        }}></div>
        
        {/* Additional diagonal pattern */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 15px, rgba(71,85,105,0.12) 15px, rgba(71,85,105,0.12) 30px)'
        }}></div>
      </div>

      {/* Navigation Bar */}
      <Navbar rightContent={<Auth />} />

      {/* Hero Section - Editorial Style */}
      <section className="relative pt-8 sm:pt-12 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            {/* Left: Content */}
            <div className="lg:pr-12">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-[1.05] tracking-[-0.02em]">
                <span className="bg-gradient-to-r from-slate-700 via-slate-500 to-slate-600 bg-clip-text text-transparent">Train your own AI</span>{' '}
                <span className="bg-gradient-to-r from-slate-600 via-slate-400 to-slate-500 bg-clip-text text-transparent">teaching assistants</span>
              </h1>
              
              {/* Outcome-focused bullets - no boxes */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-lg bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 bg-clip-text text-transparent leading-relaxed font-medium">Students get instant, personalized help when they need it</p>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-lg bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 bg-clip-text text-transparent leading-relaxed font-medium">Teachers customize AI to match their teaching style</p>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-lg bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 bg-clip-text text-transparent leading-relaxed font-medium">See student progress and learning gaps in real-time</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
                  }}
                  className="px-8 py-4 bg-[#1f1f1f] text-white rounded-lg hover:bg-[#2d2d2d] transition-all font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-base"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </button>
                <a
                  href="mailto:careyoka@gmail.com"
                  className="px-8 py-4 bg-transparent text-[#1f1f1f] hover:bg-[#f5f5f5] transition-all font-semibold text-center text-base flex items-center justify-center rounded-lg"
                >
                  Contact Us
                </a>
              </div>
            </div>

            {/* Right: Chat Interface Image - Floating, less framed */}
            <div className="relative w-full flex items-center justify-center lg:pl-12">
              <div className="relative w-full max-w-2xl -mt-8">
                {/* Softer laptop mockup */}
                <div className="relative">
                  <div className="relative rounded-xl overflow-hidden shadow-lg bg-gray-900 p-1">
                    <div className="bg-white rounded-lg overflow-hidden">
                <Image
                        src="/student_ai_chat_interface.png"
                        alt="AI Tutor Chat Interface"
                  width={800}
                  height={1000}
                  className="w-full h-auto"
                  priority
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
                />
              </div>
            </div>
                  <div className="relative h-3 bg-gray-800 rounded-b-xl shadow-lg">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gray-700 rounded-b"></div>
          </div>
        </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section - Always Visible */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        {/* Visual separator with shadow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent"></div>
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-slate-50/80 via-slate-50/40 to-transparent pointer-events-none"></div>
        <div className="absolute top-0 left-0 right-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 pt-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1f1f1f] mb-4">
              Trusted by Schools Across Kenya
            </h2>
            <p className="text-lg text-[#737373] max-w-2xl mx-auto">
              Join our growing list of partner high schools
            </p>
          </div>
          
          <div className="relative overflow-hidden py-8">
            <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none"></div>
            
            <div className="flex animate-marquee" style={{ width: 'fit-content' }}>
              {[
                { src: '/logos/chavakali.jpeg', alt: 'Chavakali High School' },
                { src: '/logos/chuluni.jpeg', alt: 'Chuluni' },
                { src: '/logos/kaboyce.png', alt: 'Kaboyce' },
                { src: '/logos/kagwa.png', alt: 'Kagwa' },
                { src: '/logos/kisii.png', alt: 'Kisii High School' },
                { src: '/logos/kivukoni.png', alt: 'Kivukoni' },
                { src: '/logos/kyondoni.jpeg', alt: 'Kyondoni' },
                { src: '/logos/nduru.jpeg', alt: 'Nduru' },
                { src: '/logos/nkoma.png', alt: 'Nkoma' },
                { src: '/logos/shikoti.png', alt: 'Shikoti' },
              ].map((logo, idx) => (
                <div
                  key={`logo-${idx}`}
                  className="group flex items-center justify-center mx-5 sm:mx-8 flex-shrink-0"
                >
                  <div className="relative bg-white rounded-xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-slate-200/50 hover:border-slate-300/70 hover:scale-105 w-56 sm:w-64 md:w-56 h-36 sm:h-40 md:h-36 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                      width={200}
                      height={120}
                      className="relative z-10 max-w-full max-h-full object-contain transition-all duration-300 group-hover:scale-110"
                    unoptimized
                  />
                  </div>
                </div>
              ))}
              
              {[
                { src: '/logos/chavakali.jpeg', alt: 'Chavakali High School' },
                { src: '/logos/chuluni.jpeg', alt: 'Chuluni' },
                { src: '/logos/kaboyce.png', alt: 'Kaboyce' },
                { src: '/logos/kagwa.png', alt: 'Kagwa' },
                { src: '/logos/kisii.png', alt: 'Kisii High School' },
                { src: '/logos/kivukoni.png', alt: 'Kivukoni' },
                { src: '/logos/kyondoni.jpeg', alt: 'Kyondoni' },
                { src: '/logos/nduru.jpeg', alt: 'Nduru' },
                { src: '/logos/nkoma.png', alt: 'Nkoma' },
                { src: '/logos/shikoti.png', alt: 'Shikoti' },
              ].map((logo, idx) => (
                <div
                  key={`logo-duplicate-${idx}`}
                  className="group flex items-center justify-center mx-5 sm:mx-8 flex-shrink-0"
                >
                  <div className="relative bg-white rounded-xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-slate-200/50 hover:border-slate-300/70 hover:scale-105 w-56 sm:w-64 md:w-56 h-36 sm:h-40 md:h-36 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                      width={200}
                      height={120}
                      className="relative z-10 max-w-full max-h-full object-contain transition-all duration-300 group-hover:scale-110"
                    unoptimized
                  />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-[#1f1f1f] text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <a href="mailto:careyokal@gmail.com" className="text-sm text-[#a3a3a3] hover:text-white transition-colors">Contact</a>
            <span className="hidden sm:inline text-[#a3a3a3]">•</span>
            <a href="/founder" className="text-sm text-[#a3a3a3] hover:text-white transition-colors">About the Founder</a>
            <span className="hidden sm:inline text-[#a3a3a3]">•</span>
            <span className="text-xs sm:text-sm text-[#a3a3a3]">© {new Date().getFullYear()} MathMentor. All rights reserved.</span>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-3 text-slate-600">Loading...</div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}


