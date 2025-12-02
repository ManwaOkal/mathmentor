'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  PlayCircle,
  Shield,
  Rocket
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-4 text-slate-600 font-medium">Loading...</div>
        </div>
      </div>
    )
  }

  // If user is logged in, show loading while redirecting (prevent flash of homepage)
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-4 text-slate-600 font-medium">Redirecting...</div>
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

      {/* Hero Section - Enhanced */}
      <section className="relative pt-20 sm:pt-24 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 -z-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered Learning Platform</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
                Math Made{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Simple
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Personalized AI tutoring that adapts to every student. Save time, improve outcomes, and transform how you teach math.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
                  }}
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base sm:text-lg min-h-[52px]"
                >
                  Start Free Today
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a
                  href="mailto:careyoka@gmail.com"
                  className="px-8 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-lg transition-all font-semibold text-center text-base sm:text-lg min-h-[52px] flex items-center justify-center"
                >
                  Contact Us
                </a>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Free to start</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-purple-500" />
                  <span>No credit card</span>
                </div>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-2xl transform hover:scale-[1.02] transition-transform">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                    <div className="text-4xl font-bold text-white mb-2">3x</div>
                    <div className="text-sm text-slate-300">Faster Learning</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                    <div className="text-4xl font-bold text-white mb-2">24/7</div>
                    <div className="text-sm text-slate-300">Available</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                    <div className="text-4xl font-bold text-white mb-2">100%</div>
                    <div className="text-sm text-slate-300">Personalized</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                    <div className="text-4xl font-bold text-white mb-2">∞</div>
                    <div className="text-sm text-slate-300">Patience</div>
                  </div>
                </div>

                {/* AI Tutor Card */}
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-semibold text-lg">AI Tutor</div>
                      <div className="text-sm text-slate-300">Always ready to help</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 w-3/4 animate-pulse"></div>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 w-1/2 animate-pulse animation-delay-1000"></div>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 w-5/6 animate-pulse animation-delay-2000"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced */}
      <section id="features" className="py-20 sm:py-24 md:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Succeed
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Powerful tools designed for both teachers and students
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Conversational Learning</h3>
              <p className="text-slate-600 leading-relaxed">
                Natural dialogue with an AI tutor that adapts to your pace and learning style, making math feel like a conversation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl border-2 border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Customizable Teaching</h3>
              <p className="text-slate-600 leading-relaxed">
                Teachers can fine-tune AI behavior to match their teaching style, assessment criteria, and learning objectives.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Beautiful Math Notation</h3>
              <p className="text-slate-600 leading-relaxed">
                Advanced LaTeX rendering ensures mathematical expressions are displayed clearly and professionally.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl border-2 border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Progress Analytics</h3>
              <p className="text-slate-600 leading-relaxed">
                Track student progress, identify learning gaps, and get actionable insights with detailed analytics.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 rounded-2xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Feedback</h3>
              <p className="text-slate-600 leading-relaxed">
                Get immediate, detailed feedback on your work without waiting days for grades or office hours.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 rounded-2xl border-2 border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Classroom Management</h3>
              <p className="text-slate-600 leading-relaxed">
                Organize students, assign activities, and manage multiple classrooms effortlessly from one dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Enhanced */}
      <section id="how-it-works" className="py-20 sm:py-24 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 mb-12">
            {/* Step 1 */}
            <div className="relative text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Create or Join</h3>
              <p className="text-slate-600 leading-relaxed">
                Teachers create classrooms and activities in seconds. Students join instantly with a simple code.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Start Learning</h3>
              <p className="text-slate-600 leading-relaxed">
                Students engage in natural conversations with AI that adapts to their learning pace and style.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Track & Improve</h3>
              <p className="text-slate-600 leading-relaxed">
                Monitor understanding, get insights, and continuously improve teaching strategies with real-time data.
              </p>
            </div>
          </div>

          <div className="text-center">
            <a
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-semibold shadow-lg hover:shadow-xl text-lg"
            >
              Learn More
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Benefits Section - Enhanced */}
      <section id="benefits" className="py-20 sm:py-24 md:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Why Teachers{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Love
              </span>{' '}
              MathMentor
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
            {/* Benefit 1 */}
            <div className="flex gap-6 p-6 rounded-2xl hover:bg-slate-50 transition-all">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <Clock className="w-7 h-7 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Save Hours Every Week</h3>
                <p className="text-slate-600 leading-relaxed">
                  Stop spending hours creating activities. Let AI generate engaging, curriculum-aligned learning experiences in minutes.
                </p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex gap-6 p-6 rounded-2xl hover:bg-slate-50 transition-all">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-7 h-7 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Better Student Outcomes</h3>
                <p className="text-slate-600 leading-relaxed">
                  Students receive personalized feedback that explains concepts clearly, helping them learn from mistakes without frustration.
                </p>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="flex gap-6 p-6 rounded-2xl hover:bg-slate-50 transition-all">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <Award className="w-7 h-7 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Fair & Consistent</h3>
                <p className="text-slate-600 leading-relaxed">
                  Every student gets the same high-quality, patient instruction. AI tutors never rush or get tired.
                </p>
              </div>
            </div>

            {/* Benefit 4 */}
            <div className="flex gap-6 p-6 rounded-2xl hover:bg-slate-50 transition-all">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Data-Driven Insights</h3>
                <p className="text-slate-600 leading-relaxed">
                  Transform learning data into actionable insights. Identify common misconceptions and adapt your teaching in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Enhanced */}
      <section className="py-20 sm:py-24 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Ready to Transform Math Education?
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Join teachers and students who are already experiencing the future of personalized learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
              }}
              className="group px-8 py-4 bg-white text-slate-900 rounded-xl hover:bg-slate-100 transition-all font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-2 text-lg min-h-[56px]"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="mailto:careyoka@gmail.com"
              className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-xl hover:bg-white/10 transition-all font-semibold text-center text-lg min-h-[56px] flex items-center justify-center"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section - Enhanced */}
      <section id="contact" className="py-20 sm:py-24 md:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-lg sm:text-xl text-slate-600">
              Have questions? We'd love to hear from you.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-8 sm:p-12 border border-slate-200">
            <p className="text-center text-slate-600 mb-8 text-lg">
              For inquiries, support, or to schedule a demo, please reach out to us.
            </p>
            <div className="text-center">
              <a 
                href="mailto:careyoka@gmail.com"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg min-h-[56px]"
              >
                <MessageSquare className="w-5 h-5" />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-6 h-6" />
                <span className="text-xl font-bold">MathMentor</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                AI-powered math tutoring platform transforming education through personalized learning.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#benefits" className="hover:text-white transition-colors">Benefits</a></li>
                <li><a href="/how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Get Started</h4>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-sm w-full sm:w-auto"
              >
                Sign Up Free
              </button>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="mt-4 text-slate-600 font-medium">Loading...</div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
