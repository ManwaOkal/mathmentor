'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  TrendingUp
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
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <Navbar
        leftContent={
          user && profile ? (
            <div className="hidden md:flex items-center gap-6">
              {profile.role === UserRole.TEACHER && (
                <button
                  onClick={() => router.push('/teacher')}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Teacher Portal
                </button>
              )}
              {(profile.role === UserRole.STUDENT || profile.role === UserRole.ADMIN) && (
                <button
                  onClick={() => router.push('/student')}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Student Portal
                </button>
              )}
            </div>
          ) : undefined
        }
        rightContent={<Auth />}
      />

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-24 pb-24 sm:pb-36 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
            {/* Left: Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full text-xs font-semibold text-slate-700 mb-6 sm:mb-8 border border-blue-100/50 shadow-sm">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>AI-Powered Math Tutoring</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 mb-6 sm:mb-8 leading-tight tracking-tight">
                Conversational AI Tutor for{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Math</span>
              </h1>
              
              <p className="text-lg sm:text-xl md:text-2xl text-slate-600 mb-8 sm:mb-10 leading-relaxed font-medium">
                Rethinking how math is taught.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
                  }}
                  className="group px-8 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-700 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-base sm:text-lg min-h-[52px] transform hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a
                  href="mailto:careyoka@gmail.com"
                  className="px-8 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all font-semibold text-center text-base sm:text-lg min-h-[52px] flex items-center justify-center shadow-sm hover:shadow-md"
                >
                  Contact Us
                </a>
              </div>
            </div>

            {/* Right: Chat Interface Image */}
            <div className="relative order-1 lg:order-2 w-full flex items-center justify-center">
              <div className="relative w-full max-w-2xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-3xl blur-2xl opacity-20 transform rotate-3"></div>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 transform hover:scale-[1.02] transition-transform duration-500">
                  <Image
                    src="/chat_intereface.png"
                    alt="AI Tutor Chat Interface - Faster Learning, 24/7 Available, 100% Personalized, Infinite Patience, Always ready to help"
                    width={800}
                    height={1000}
                    className="w-full h-auto"
                    priority
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-4 sm:mb-6 px-4">
              Powerful AI Tools to{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Supercharge Learning</span>
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto px-4 font-medium">
              Everything you need to create engaging, personalized math learning experiences
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="group p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">Conversational Learning</h3>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Engage in natural dialogue with an AI tutor that adapts to your pace and learning style
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">Fine-Tuned Teaching</h3>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Teachers can customize AI behavior to match their teaching style and assessment criteria
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-yellow-50 to-white border border-yellow-100 hover:border-yellow-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">Instant Feedback</h3>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Get immediate, detailed feedback on your work without waiting days for grades
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-green-50 to-white border border-green-100 hover:border-green-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">Progress Analytics</h3>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Track student progress and identify learning gaps with detailed analytics
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-4 sm:mb-6 px-4">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto px-4 font-medium">
              Simple, intuitive workflow for both teachers and students
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 mb-12">
            {/* Step 1 */}
            <div className="text-center px-6 group">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-6 sm:mb-8 shadow-lg group-hover:scale-110 transition-transform duration-300">
                1
                <div className="absolute inset-0 bg-blue-400 rounded-2xl blur-xl opacity-50 -z-10"></div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Create or Join</h3>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Teachers create classrooms and activities. Students join using a simple code.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center px-6 group">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-6 sm:mb-8 shadow-lg group-hover:scale-110 transition-transform duration-300">
                2
                <div className="absolute inset-0 bg-purple-400 rounded-2xl blur-xl opacity-50 -z-10"></div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Start Learning</h3>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Students engage in conversational learning with AI that adapts to their needs.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center px-6 group">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-6 sm:mb-8 shadow-lg group-hover:scale-110 transition-transform duration-300">
                3
                <div className="absolute inset-0 bg-green-400 rounded-2xl blur-xl opacity-50 -z-10"></div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Track Progress</h3>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Monitor understanding, get insights, and improve teaching strategies.
              </p>
            </div>
          </div>

          <div className="text-center">
            <a
              href="/how-it-works"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-700 transition-all font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl min-h-[52px] transform hover:-translate-y-0.5"
            >
              Learn More
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* Schools Section */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-4 sm:mb-6 px-4">
              Trusted by Schools{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Across Kenya</span>
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto px-4 font-medium">
              Join these schools already using MathMentor to transform their math education
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            <div className="group bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Chavakali High School</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Vihiga</p>
            </div>
            
            <div className="group bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Darajambili Secondary School</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium ml-13">Kisii</p>
            </div>
            
            <div className="group bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-200 hover:border-green-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">St. Benedicts Mixed Academy</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium ml-13">Nairobi</p>
            </div>
            
            <div className="group bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-200 hover:border-yellow-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Hannington Academy</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium ml-13">Oyugis</p>
            </div>
            
            <div className="group bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Nyansiongo High School</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium ml-13">Kisii</p>
            </div>
            
            <div className="group bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Agoro Sare High School</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium ml-13">Homabay</p>
            </div>
            
            <div className="group bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-200 hover:border-green-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Kisumu Day High School</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium ml-13">Kisumu</p>
            </div>
            
            <div className="group bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-200 hover:border-yellow-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Kisii High School</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium ml-13">Kisii</p>
            </div>
            
            <div className="group bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Clanne Junior High School</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium ml-13">Busia</p>
            </div>
            
            <div className="group bg-white rounded-xl p-5 sm:p-6 border-2 border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Zigma Junior Secondary School</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium ml-13">Busia</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 sm:py-24 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 sm:mb-8 px-4 leading-tight">
            Ready to Transform{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Math Education?</span>
          </h2>
          <p className="text-xl sm:text-2xl md:text-3xl text-slate-200 mb-8 sm:mb-10 px-4 font-medium">
            Join teachers and students who are already experiencing the future of personalized learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center px-4">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
              }}
              className="group px-8 sm:px-10 py-4 sm:py-5 bg-white text-slate-900 rounded-xl hover:bg-slate-100 transition-all font-bold shadow-2xl hover:shadow-3xl flex items-center justify-center gap-2 text-lg sm:text-xl min-h-[56px] transform hover:-translate-y-1"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="mailto:careyoka@gmail.com"
              className="px-8 sm:px-10 py-4 sm:py-5 bg-transparent text-white border-3 border-white rounded-xl hover:bg-white/10 transition-all font-bold text-center text-lg sm:text-xl min-h-[56px] flex items-center justify-center shadow-lg hover:shadow-xl"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-4 sm:mb-6 px-4">
              Get in Touch
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-600 px-4 font-medium">
              Have questions? We'd love to hear from you.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-xl border border-slate-200">
            <p className="text-center text-base sm:text-lg text-slate-600 mb-6 sm:mb-8 font-medium">
              For inquiries, support, or to schedule a demo, please reach out to us.
            </p>
            <div className="text-center">
              <a 
                href="mailto:careyoka@gmail.com"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-700 transition-all font-bold text-base sm:text-lg shadow-lg hover:shadow-xl min-h-[52px] transform hover:-translate-y-0.5"
              >
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-4 sm:mb-6">
            <div>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-lg sm:text-xl font-semibold">MathMentor</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                AI-powered math tutoring platform for modern education.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Product</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#benefits" className="hover:text-white transition-colors">Benefits</a></li>
                <li><a href="/how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Company</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-400">
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-slate-400">
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
