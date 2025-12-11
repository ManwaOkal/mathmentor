'use client'

import Navbar from '@/components/Navbar'
import { BookOpen, Users, MessageSquare, BarChart3, ArrowRight, CheckCircle, Sparkles, Target, Zap, Brain, Code, TrendingUp, Award, Lightbulb } from 'lucide-react'
import { useAuth } from '@/lib/auth/useAuth'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/lib/auth/types'
import Auth from '@/components/Auth'

export default function HowItWorksPage() {
  const { user, profile } = useAuth()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white">
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
      <section className="pt-0 pb-4 sm:pb-6 px-4 sm:px-6 lg:px-8 bg-white">
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* For Teachers */}
          <div className="mb-24 sm:mb-32">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-sm font-semibold text-blue-700 mb-4">
                <Users className="w-4 h-4" />
                <span>For Teachers</span>
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-5">Create Engaging Learning Experiences</h2>
              <p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto">Everything you need to teach effectively, all in one place</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
              {/* Step 1 */}
              <div className="relative group">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-100 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-slate-300 hover:shadow-2xl transition-all h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                      1
                    </div>
                    <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <Users className="w-7 h-7 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Create a Classroom</h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Set up your classroom in seconds and get a unique join code to share with students. Organize multiple classes effortlessly.
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                    <Code className="w-4 h-4" />
                    <span>Unique Join Code</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative group">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-purple-100 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-slate-300 hover:shadow-2xl transition-all h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                      2
                    </div>
                    <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                      <BookOpen className="w-7 h-7 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Create Activities</h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Generate conversational learning activities with AI. Customize teaching style, difficulty, and assessment criteria to match your curriculum.
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
                    <Sparkles className="w-4 h-4" />
                    <span>AI-Powered Generation</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative group">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-green-100 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-slate-300 hover:shadow-2xl transition-all h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                      3
                    </div>
                    <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                      <BarChart3 className="w-7 h-7 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Track Progress</h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Monitor student engagement in real-time, view detailed analytics, and identify learning gaps to improve your teaching strategy.
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>Real-Time Analytics</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* For Students */}
          <div className="mb-24 sm:mb-32">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full text-sm font-semibold text-orange-700 mb-4">
                <MessageSquare className="w-4 h-4" />
                <span>For Students</span>
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-5">Learn at Your Own Pace</h2>
              <p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto">Personalized AI tutoring that adapts to your learning style</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
              {/* Step 1 */}
              <div className="relative group">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-orange-100 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-slate-300 hover:shadow-2xl transition-all h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                      1
                    </div>
                    <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                      <Code className="w-7 h-7 text-orange-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Join a Classroom</h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Enter the join code from your teacher to instantly access all assigned activities. No complicated setup required.
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
                    <Zap className="w-4 h-4" />
                    <span>Instant Access</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative group">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-indigo-100 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-slate-300 hover:shadow-2xl transition-all h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                      2
                    </div>
                    <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <Brain className="w-7 h-7 text-indigo-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Start Learning</h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Engage in natural conversation with your AI tutor. Ask questions anytime and get instant, personalized explanations tailored to your level.
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
                    <MessageSquare className="w-4 h-4" />
                    <span>24/7 Available</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative group">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-emerald-100 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-slate-300 hover:shadow-2xl transition-all h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                      3
                    </div>
                    <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <Award className="w-7 h-7 text-emerald-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Master Concepts</h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Receive detailed feedback on every response, practice with personalized problems, and track your understanding as you progress.
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Detailed Feedback</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fine-Tuning Section */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-10 sm:p-14 lg:p-20 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)]"></div>
            <div className="relative max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm rounded-full text-sm font-semibold text-blue-300 mb-6 border border-blue-400/30">
                  <Target className="w-4 h-4" />
                  <span>Advanced Feature</span>
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">Fine-Tune Your AI Tutor</h2>
                <p className="text-xl sm:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
                  Customize how the AI responds by providing teaching examples. Define assessment criteria, 
                  show example student questions, and specify ideal teaching responses. The AI learns from these examples 
                  to match your teaching style perfectly.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all group">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center text-3xl font-bold text-white mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    1
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">Define Criteria</h4>
                  <p className="text-slate-300 leading-relaxed">Specify how to assess student understanding and set clear learning objectives</p>
                </div>
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all group">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center text-3xl font-bold text-white mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    2
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">Provide Examples</h4>
                  <p className="text-slate-300 leading-relaxed">Show example student questions and ideal teaching responses to guide the AI</p>
                </div>
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all group">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center text-3xl font-bold text-white mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    3
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">AI Learns</h4>
                  <p className="text-slate-300 leading-relaxed">The AI adapts to your teaching style automatically and consistently</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Ready to Get Started?</h2>
          <p className="text-lg sm:text-xl text-slate-300 mb-6 sm:mb-8">
            Join teachers and students transforming math education
          </p>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
            }}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mx-auto text-sm sm:text-base"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </section>
    </div>
  )
}

