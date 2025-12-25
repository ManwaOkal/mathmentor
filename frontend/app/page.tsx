'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Auth from '@/components/Auth'
import Navbar from '@/components/Navbar'
import { 
  GraduationCap, 
  BookOpen, 
  Sparkles, 
  Brain, 
  MessageSquare, 
  Target, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Users,
  BarChart3,
  Lightbulb,
  Clock,
  Award,
  TrendingUp,
  Eye,
  Settings,
  Home as HomeIcon,
} from 'lucide-react'
import { useAuth } from '../lib/auth/useAuth'
import { UserRole } from '../lib/auth/types'

function HomeContent() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

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
      <div className="min-h-screen bg-white flex items-center justify-center">
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-3 text-slate-600">Redirecting...</div>
        </div>
      </div>
    )
  }

  // Show landing page only for non-logged-in users
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Navigation Bar */}
      <Navbar
        leftContent={
          <div className="hidden md:flex items-center gap-6">
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
              className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
                pathname === '/teachers'
                  ? 'text-slate-900 bg-slate-100 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              For Teachers
            </Link>
            <Link
              href="/students"
              className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
                pathname === '/students'
                  ? 'text-slate-900 bg-slate-100 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              For Students
            </Link>
          </div>
        }
        rightContent={<Auth />}
      />

      {/* Hero Section - Editorial Style */}
      <section className="relative pt-8 sm:pt-12 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 bg-[#fafafa] overflow-hidden">
        {/* Subtle math-themed background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-[0.03]">
          <div className="absolute top-20 right-20 text-6xl font-light">∑</div>
          <div className="absolute top-40 right-40 text-4xl font-light">∫</div>
          <div className="absolute top-60 right-60 text-5xl font-light">√</div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            {/* Left: Content */}
            <div className="lg:pr-12">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#1f1f1f] mb-8 leading-[1.05] tracking-[-0.02em]">
                Train your own AI{' '}
                <span className="text-[#525252]">teaching assistants</span>
              </h1>
              
              {/* Outcome-focused bullets - no boxes */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-[#475569] flex-shrink-0 mt-0.5" />
                  <p className="text-lg text-[#525252] leading-relaxed">Students get instant, personalized help when they need it</p>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-[#475569] flex-shrink-0 mt-0.5" />
                  <p className="text-lg text-[#525252] leading-relaxed">Teachers customize AI to match their teaching style</p>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-5 h-5 text-[#475569] flex-shrink-0 mt-0.5" />
                  <p className="text-lg text-[#525252] leading-relaxed">See student progress and learning gaps in real-time</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
                  }}
                  className="px-8 py-4 bg-[#1f1f1f] text-white rounded-lg hover:bg-[#2d2d2d] transition-all font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-base"
                >
                  Get Free Trial
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
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1f1f1f] mb-4">
              Trusted by Schools Across Kenya
            </h2>
            <p className="text-lg text-[#737373] max-w-2xl mx-auto">
              Join these schools already using MathMentor to transform their math education
            </p>
          </div>
          
          <div className="relative overflow-hidden py-6">
            <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-[#f5f5f5] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-[#f5f5f5] to-transparent z-10 pointer-events-none"></div>
            
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
                  className="flex items-center justify-center w-28 sm:w-32 h-16 sm:h-20 mx-6 sm:mx-8 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={120}
                    height={80}
                    className="max-w-full max-h-full object-contain grayscale"
                    unoptimized
                  />
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
                  className="flex items-center justify-center w-28 sm:w-32 h-16 sm:h-20 mx-6 sm:mx-8 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={120}
                    height={80}
                    className="max-w-full max-h-full object-contain grayscale"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Contact Section - Always Visible */}
      <section id="contact" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#f5f5f5] border-t border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1f1f1f] mb-4 leading-tight tracking-tight">
              Get in Touch
            </h2>
            <p className="text-xl text-[#737373] leading-relaxed">
              Have questions? We'd love to hear from you.
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <p className="text-lg text-[#737373] leading-relaxed">
              For inquiries, support, or to schedule a demo, please reach out to us.
            </p>
            <div>
              <a 
                href="mailto:careyoka@gmail.com"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#1f1f1f] text-white rounded-lg hover:bg-[#2d2d2d] transition-all font-semibold text-base shadow-sm hover:shadow-md"
              >
                <MessageSquare className="w-5 h-5" />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Lighter */}
      <footer className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#1f1f1f] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-6 h-6" />
                <span className="text-xl font-semibold">MathMentor</span>
              </div>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">
                AI-powered math tutoring platform for modern education.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[#e5e5e5]">Product</h4>
              <ul className="space-y-3 text-sm text-[#a3a3a3]">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="/how-it-works" className="hover:text-white transition-colors">Learn More</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[#e5e5e5]">Company</h4>
              <ul className="space-y-3 text-sm text-[#a3a3a3]">
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 text-center text-sm text-[#a3a3a3]">
            <p>© 2024 MathMentor. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
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


