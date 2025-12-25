'use client'

import { useEffect, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Auth from '@/components/Auth'
import Navbar from '@/components/Navbar'
import { 
  CheckCircle,
  ArrowRight,
  Mail,
  Send,
  GraduationCap,
  Users,
  ArrowRightCircle,
} from 'lucide-react'
import { useAuth } from '../lib/auth/useAuth'
import { UserRole } from '../lib/auth/types'

function HomeContent() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [emailError, setEmailError] = useState('')

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

      {/* Partners Section - Enhanced */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 overflow-hidden">
        {/* Background Pattern Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(148,163,184,0.15),transparent_60%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(100,116,139,0.12),transparent_60%)]"></div>
          <div className="absolute top-1/2 left-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(71,85,105,0.08),transparent_70%)] transform -translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="absolute inset-0 opacity-[0.08]" style={{
            backgroundImage: 'linear-gradient(rgba(71,85,105,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(71,85,105,0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}></div>
          
          {/* Diagonal lines from top right to bottom left */}
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.06]" style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(71,85,105,0.15) 10px, rgba(71,85,105,0.15) 20px)'
          }}></div>
          
          {/* Math Symbols - Floating around the section */}
          <div className="absolute top-20 right-1/4 text-7xl font-light text-slate-300/50 select-none rotate-12" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>∑</div>
          <div className="absolute top-40 left-1/5 text-6xl font-light text-slate-300/45 select-none -rotate-6" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>∫</div>
          <div className="absolute top-1/3 right-1/5 text-5xl font-light text-slate-300/40 select-none rotate-45" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>√</div>
          <div className="absolute bottom-1/3 left-1/4 text-6xl font-light text-slate-300/45 select-none -rotate-12" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>π</div>
          <div className="absolute bottom-40 right-1/3 text-5xl font-light text-slate-300/40 select-none rotate-6" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>∞</div>
          <div className="absolute top-1/2 left-1/2 text-4xl font-light text-slate-300/35 select-none transform -translate-x-1/2 -translate-y-1/2 rotate-12" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>Δ</div>
          <div className="absolute top-2/3 right-1/6 text-5xl font-light text-slate-300/40 select-none -rotate-45" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>∂</div>
          <div className="absolute bottom-1/4 left-1/6 text-4xl font-light text-slate-300/35 select-none rotate-12" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>∇</div>
          <div className="absolute top-1/4 right-1/6 text-4xl font-light text-slate-300/35 select-none rotate-30" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>α</div>
          <div className="absolute bottom-1/2 right-1/5 text-5xl font-light text-slate-300/40 select-none -rotate-30" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>β</div>
          <div className="absolute top-3/4 left-1/5 text-4xl font-light text-slate-300/35 select-none rotate-20" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>θ</div>
          
          {/* Geometric shapes with stronger shadows */}
          <div className="absolute top-32 left-1/3 w-24 h-24 border-3 border-slate-400/35 rotate-45 rounded-lg shadow-xl" style={{
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))',
            borderWidth: '3px'
          }}></div>
          <div className="absolute bottom-32 right-1/4 w-20 h-20 bg-slate-300/25 rotate-12 rounded-full shadow-xl" style={{
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))'
          }}></div>
          <div className="absolute top-1/2 right-20 w-18 h-18 border-3 border-slate-400/30 rotate-45 shadow-xl" style={{
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))',
            borderWidth: '3px'
          }}></div>
          <div className="absolute top-1/4 left-1/5 w-16 h-16 bg-slate-300/20 rotate-30 rounded-lg shadow-lg"></div>
          <div className="absolute bottom-1/4 right-1/5 w-20 h-20 border-3 border-slate-400/25 -rotate-12 rounded-full shadow-xl" style={{
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))',
            borderWidth: '3px'
          }}></div>
          <div className="absolute top-2/3 left-1/4 w-14 h-14 border-3 border-slate-400/30 rotate-45 rounded-lg shadow-lg" style={{
            borderWidth: '3px'
          }}></div>
          <div className="absolute bottom-1/3 left-1/6 w-22 h-22 bg-slate-300/20 -rotate-45 rounded-lg shadow-xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-slate-200/50 shadow-sm mb-6">
              <span className="text-sm font-medium text-slate-700">Trusted Partners</span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1f1f1f] mb-6 leading-tight">
              Trusted by 10+ Schools
            </h2>
            <p className="text-lg sm:text-xl text-[#737373] max-w-2xl mx-auto leading-relaxed">
              Join our growing community of partner high schools.
            </p>
          </div>
          
          <div className="relative overflow-hidden py-10">
            {/* Enhanced gradient fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-32 sm:w-48 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 sm:w-48 bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent z-20 pointer-events-none"></div>
            
            {/* Marquee container with pause on hover */}
            <div className="flex animate-marquee hover:[animation-play-state:paused] group" style={{ width: 'fit-content' }}>
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
                  className="group/logo flex items-center justify-center mx-4 sm:mx-6 flex-shrink-0"
                >
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/60 hover:border-slate-300/80 hover:scale-110 w-56 sm:w-64 md:w-56 h-40 sm:h-44 md:h-40 flex items-center justify-center overflow-hidden">
                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-50/80 via-white/50 to-slate-50/80 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500"></div>
                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/logo:translate-x-full transition-transform duration-1000"></div>
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                      width={200}
                      height={120}
                      className="relative z-10 max-w-full max-h-full object-contain transition-all duration-500 group-hover/logo:scale-105 filter grayscale-[0.3] group-hover/logo:grayscale-0"
                    unoptimized
                  />
                  </div>
                </div>
              ))}
              
              {/* Duplicate set for seamless loop */}
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
                  className="group/logo flex items-center justify-center mx-4 sm:mx-6 flex-shrink-0"
                >
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/60 hover:border-slate-300/80 hover:scale-110 w-56 sm:w-64 md:w-56 h-40 sm:h-44 md:h-40 flex items-center justify-center overflow-hidden">
                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-50/80 via-white/50 to-slate-50/80 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500"></div>
                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/logo:translate-x-full transition-transform duration-1000"></div>
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                      width={200}
                      height={120}
                      className="relative z-10 max-w-full max-h-full object-contain transition-all duration-500 group-hover/logo:scale-105 filter grayscale-[0.3] group-hover/logo:grayscale-0"
                    unoptimized
                  />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-slate-200/60">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                {/* For Students */}
                <Link
                  href="/students"
                  className="group w-full sm:w-auto flex items-center gap-4 px-6 sm:px-8 py-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <GraduationCap className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#1f1f1f] group-hover:text-blue-600 transition-colors">For Students</div>
                    <div className="text-xs text-[#737373]">Learn with AI tutoring</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Link>

                {/* For Teachers */}
                <Link
                  href="/teachers"
                  className="group w-full sm:w-auto flex items-center gap-4 px-6 sm:px-8 py-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-green-50 transition-colors">
                    <Users className="w-5 h-5 text-slate-600 group-hover:text-green-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#1f1f1f] group-hover:text-green-600 transition-colors">For Teachers</div>
                    <div className="text-xs text-[#737373]">Create & manage activities</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 overflow-hidden">
        {/* Background Pattern Elements - Matching landing page style with variations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient overlays - slightly different positioning */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_40%_30%,rgba(148,163,184,0.12),transparent_60%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_60%_70%,rgba(100,116,139,0.10),transparent_60%)]"></div>
          <div className="absolute top-1/2 left-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(71,85,105,0.06),transparent_70%)] transform -translate-x-1/2 -translate-y-1/2"></div>
          
          {/* Grid pattern - slightly different opacity */}
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: 'linear-gradient(rgba(71,85,105,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(71,85,105,0.12) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}></div>
          
          {/* Diagonal lines - varied pattern */}
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.04]" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(71,85,105,0.12) 10px, rgba(71,85,105,0.12) 20px)'
          }}></div>
          
          {/* Additional diagonal pattern - different angle */}
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.025]" style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 15px, rgba(71,85,105,0.10) 15px, rgba(71,85,105,0.10) 30px)'
          }}></div>
          
          {/* Math Symbols - Floating around the section */}
          <div className="absolute top-20 right-1/4 text-6xl font-light text-slate-300/45 select-none rotate-12" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>∑</div>
          <div className="absolute top-40 left-1/5 text-5xl font-light text-slate-300/40 select-none -rotate-6" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>∫</div>
          <div className="absolute top-1/3 right-1/5 text-4xl font-light text-slate-300/35 select-none rotate-45" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>√</div>
          <div className="absolute bottom-1/3 left-1/4 text-5xl font-light text-slate-300/40 select-none -rotate-12" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>π</div>
          <div className="absolute bottom-40 right-1/3 text-4xl font-light text-slate-300/35 select-none rotate-6" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>∞</div>
          <div className="absolute top-1/2 left-1/2 text-3xl font-light text-slate-300/30 select-none transform -translate-x-1/2 -translate-y-1/2 rotate-12" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>Δ</div>
          <div className="absolute top-2/3 right-1/6 text-4xl font-light text-slate-300/35 select-none -rotate-45" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>∂</div>
          <div className="absolute bottom-1/4 left-1/6 text-3xl font-light text-slate-300/30 select-none rotate-12" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>∇</div>
          <div className="absolute top-1/4 right-1/6 text-3xl font-light text-slate-300/30 select-none rotate-30" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>α</div>
          <div className="absolute bottom-1/2 right-1/5 text-4xl font-light text-slate-300/35 select-none -rotate-30" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>β</div>
          <div className="absolute top-3/4 left-1/5 text-3xl font-light text-slate-300/30 select-none rotate-20" style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>θ</div>
          
          {/* Geometric shapes */}
          <div className="absolute top-32 left-1/3 w-20 h-20 border-3 border-slate-400/30 rotate-45 rounded-lg shadow-lg" style={{
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.12))',
            borderWidth: '3px'
          }}></div>
          <div className="absolute bottom-32 right-1/4 w-18 h-18 bg-slate-300/20 rotate-12 rounded-full shadow-lg" style={{
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.12))'
          }}></div>
          <div className="absolute top-1/2 right-20 w-16 h-16 border-3 border-slate-400/25 rotate-45 shadow-lg" style={{
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.12))',
            borderWidth: '3px'
          }}></div>
          <div className="absolute top-1/4 left-1/5 w-14 h-14 bg-slate-300/15 rotate-30 rounded-lg shadow-md"></div>
          <div className="absolute bottom-1/4 right-1/5 w-18 h-18 border-3 border-slate-400/20 -rotate-12 rounded-full shadow-lg" style={{
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.12))',
            borderWidth: '3px'
          }}></div>
          <div className="absolute top-2/3 left-1/4 w-12 h-12 border-3 border-slate-400/25 rotate-45 rounded-lg shadow-md" style={{
            borderWidth: '3px'
          }}></div>
          <div className="absolute bottom-1/3 left-1/6 w-20 h-20 bg-slate-300/15 -rotate-45 rounded-lg shadow-lg"></div>
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-slate-200/50 shadow-sm mb-6">
              <Mail className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Let's Connect</span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1f1f1f] mb-6 leading-tight">
              Get in Touch
            </h2>
            <p className="text-lg sm:text-xl text-[#737373] max-w-2xl mx-auto leading-relaxed">
              Have questions or want to learn more? Reach out to us directly or subscribe to stay updated with the latest news and features.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
            {/* Get in Touch Card */}
            <div className="group relative flex flex-col items-center justify-center p-10 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/60 hover:border-slate-300/80 overflow-hidden">
              
              <div className="relative z-10 w-full">
                <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-8 h-8 text-slate-700" />
                </div>
                <h3 className="text-2xl font-bold text-[#1f1f1f] mb-3 text-center">Contact Us</h3>
                <p className="text-base text-[#737373] mb-8 text-center leading-relaxed">
                  Send us an email directly and we'll get back to you as soon as possible
                </p>
                <a
                  href="mailto:careyokal@gmail.com"
                  className="group/btn inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#1f1f1f] to-[#2d2d2d] text-white rounded-xl hover:from-[#2d2d2d] hover:to-[#1f1f1f] transition-all font-semibold shadow-lg hover:shadow-xl w-full justify-center"
                >
                  <Mail className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                  <span>Get in Touch</span>
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Newsletter Signup Form */}
            <div className="group relative flex flex-col p-10 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/60 hover:border-slate-300/80 overflow-hidden">
              
              <div className="relative z-10 w-full">
                <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Send className="w-8 h-8 text-slate-700" />
                </div>
                <h3 className="text-2xl font-bold text-[#1f1f1f] mb-3 text-center">Stay Updated</h3>
                <p className="text-base text-[#737373] mb-8 text-center leading-relaxed">
                  Subscribe to get the latest news, updates, and feature announcements
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    
                    // Prevent double submission
                    if (isSubmitting) return
                    
                    // Clear previous errors
                    setEmailError('')
                    setSubmitStatus('idle')

                    // Basic client-side email validation
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    if (!email || !emailRegex.test(email)) {
                      setEmailError('Please enter a valid email address')
                      return
                    }

                    setIsSubmitting(true)

                    try {
                      const { api } = await import('../lib/api')
                      const result = await api.subscribeNewsletter(email.trim(), name?.trim() || undefined, 'landing_page')
                      
                      if (result.success) {
                        setSubmitStatus('success')
                        setEmail('')
                        setName('')
                        
                        // Reset success message after 5 seconds
                        setTimeout(() => {
                          setSubmitStatus('idle')
                        }, 5000)
                      } else {
                        throw new Error(result.message || 'Subscription failed')
                      }
                    } catch (error) {
                      console.error('Newsletter subscription error:', error)
                      setSubmitStatus('error')
                      setEmailError(error instanceof Error ? error.message : 'Failed to subscribe. Please try again.')
                      
                      // Reset error message after 5 seconds
                      setTimeout(() => {
                        setSubmitStatus('idle')
                        setEmailError('')
                      }, 5000)
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  className="space-y-5"
                >
                  {name && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name (optional)"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1f1f1f] focus:border-[#1f1f1f] text-sm text-slate-900 placeholder:text-slate-400 transition-all bg-white/50 backdrop-blur-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (emailError) setEmailError('')
                      }}
                      onBlur={() => {
                        if (email && !name) {
                          // Extract name from email if not provided
                          const emailName = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ')
                          if (emailName) setName(emailName)
                        }
                      }}
                      placeholder="Enter your email"
                      required
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all bg-white/50 backdrop-blur-sm ${
                        emailError 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-slate-300 focus:ring-[#1f1f1f] focus:border-[#1f1f1f]'
                      }`}
                      disabled={isSubmitting}
                    />
                    {emailError && (
                      <p className="text-xs text-red-600 mt-2 ml-1">{emailError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="group/btn w-full px-8 py-4 bg-gradient-to-r from-[#1f1f1f] to-[#2d2d2d] text-white rounded-xl hover:from-[#2d2d2d] hover:to-[#1f1f1f] transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Subscribing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                        <span>Subscribe Now</span>
                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                  {submitStatus === 'success' && (
                    <div className="animate-in slide-in-from-top-2 duration-300 text-sm text-green-700 text-center bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium">Successfully subscribed! Check your email for confirmation.</span>
                      </div>
                    </div>
                  )}
                  {submitStatus === 'error' && (
                    <div className="animate-in slide-in-from-top-2 duration-300 text-sm text-red-700 text-center bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 shadow-sm">
                      <span className="font-medium">Something went wrong. Please try again later.</span>
                    </div>
                  )}
                </form>
                <p className="text-xs text-[#737373] mt-6 text-center">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </div>
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


