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
      <section className="relative pt-16 sm:pt-20 pb-20 sm:pb-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left: Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700 mb-4 sm:mb-6">
                <Sparkles className="w-3 h-3" />
                <span>AI-Powered Math Tutoring</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">
                Conversational AI Tutor for{' '}
                <span className="text-slate-700">Math</span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-3 sm:mb-4 leading-relaxed">
                Teachers should spend their time teaching, not creating endless activities.
              </p>
              
              <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-6 sm:mb-8 leading-relaxed">
                Students deserve personalized help that adapts to their learning style. Join us on our mission to modernize math education.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
                  }}
                  className="px-6 py-3 sm:py-3.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="https://careyokal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 sm:py-3.5 bg-white text-slate-900 border-2 border-slate-900 rounded-lg hover:bg-slate-50 transition-all font-medium text-center text-sm sm:text-base min-h-[44px] flex items-center justify-center"
                >
                  Contact Us
                </a>
              </div>
            </div>

            {/* Right: Visual/Stats */}
            <div className="relative order-1 lg:order-2">
              <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl">
                <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">3x</div>
                    <div className="text-xs sm:text-sm text-slate-300">Faster Learning</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">24/7</div>
                    <div className="text-xs sm:text-sm text-slate-300">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">100%</div>
                    <div className="text-xs sm:text-sm text-slate-300">Personalized</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">∞</div>
                    <div className="text-xs sm:text-sm text-slate-300">Patience</div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 sm:p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-medium text-sm sm:text-base">AI Tutor</div>
                      <div className="text-xs sm:text-sm text-slate-300 truncate">Always ready to help</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-3/4"></div>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-1/2"></div>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2">3x</div>
              <div className="text-xs sm:text-sm md:text-base text-slate-300 px-2">Faster Understanding</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2">100+</div>
              <div className="text-xs sm:text-sm md:text-base text-slate-300 px-2">students helped</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2">99%</div>
              <div className="text-xs sm:text-sm md:text-base text-slate-300 px-2">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2">100%</div>
              <div className="text-xs sm:text-sm md:text-base text-slate-300 px-2">Personalized</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-3 sm:mb-4 px-4">
              Powerful AI Tools to Supercharge Learning
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto px-4">
              Everything you need to create engaging, personalized math learning experiences
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Conversational Learning</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Engage in natural dialogue with an AI tutor that adapts to your pace and learning style
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Fine-Tuned Teaching</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Teachers can customize AI behavior to match their teaching style and assessment criteria
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Advanced LaTeX Rendering</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Beautiful mathematical notation with proper LaTeX formatting for clear explanations
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Progress Analytics</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Track student progress and identify learning gaps with detailed analytics
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Instant Feedback</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Get immediate, detailed feedback on your work without waiting days for grades
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Classroom Management</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Organize students, assign activities, and manage multiple classrooms effortlessly
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-3 sm:mb-4 px-4">
              How It Works
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto px-4">
              Simple, intuitive workflow for both teachers and students
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 mb-8 sm:mb-12">
            {/* Step 1 */}
            <div className="text-center px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-4 sm:mb-6">
                1
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2 sm:mb-3">Create or Join</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Teachers create classrooms and activities. Students join using a simple code.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-4 sm:mb-6">
                2
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2 sm:mb-3">Start Learning</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Students engage in conversational learning with AI that adapts to their needs.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-4 sm:mb-6">
                3
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2 sm:mb-3">Track Progress</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Monitor understanding, get insights, and improve teaching strategies.
              </p>
            </div>
          </div>

          <div className="text-center">
            <a
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-medium text-sm sm:text-base min-h-[44px]"
            >
              Learn More
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 px-4">
              We Help Students Learn by Helping You Teach
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 md:gap-12">
            {/* Benefit 1 */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Save Time on Activity Creation</h3>
                <p className="text-sm sm:text-base text-slate-600">
                  Instead of spending hours creating activities, let AI help you generate engaging learning experiences tailored to your curriculum.
                </p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Detailed, Actionable Feedback</h3>
                <p className="text-sm sm:text-base text-slate-600">
                  Students receive personalized feedback that explains concepts clearly, helping them learn from mistakes with minimal frustration.
                </p>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Consistent, Fair Learning</h3>
                <p className="text-sm sm:text-base text-slate-600">
                  AI tutors don't get tired or rush through explanations. Every student gets the same high-quality, patient instruction.
                </p>
              </div>
            </div>

            {/* Benefit 4 */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Data-Driven Teaching</h3>
                <p className="text-sm sm:text-base text-slate-600">
                  Transform learning data into actionable insights. Identify common misconceptions and adapt your teaching strategy in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            Ready to Transform Math Education?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-6 sm:mb-8 px-4">
            Join teachers and students who are already experiencing the future of personalized learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
              }}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <a
              href="https://careyokal.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white/10 transition-all font-medium text-center text-sm sm:text-base min-h-[44px] flex items-center justify-center"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-3 sm:mb-4 px-4">
              Get in Touch
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4">
              Have questions? We'd love to hear from you.
            </p>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-6 sm:p-8">
            <p className="text-center text-sm sm:text-base text-slate-600 mb-4 sm:mb-6">
              For inquiries, support, or to schedule a demo, please reach out to us.
            </p>
            <div className="text-center">
              <a 
                href="https://careyokal.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-medium text-sm sm:text-base min-h-[44px]"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
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
