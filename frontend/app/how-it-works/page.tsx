'use client'

import Navbar from '@/components/Navbar'
import { BookOpen, Users, MessageSquare, BarChart3, ArrowRight, CheckCircle } from 'lucide-react'
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
        rightContent={
          <div className="flex items-center gap-3">
            {user && profile ? (
              <>
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
                <Auth />
              </>
            ) : (
              <Auth />
            )}
          </div>
        }
      />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            How It Works
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Simple, intuitive workflow for both teachers and students
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          {/* For Teachers */}
          <div className="mb-24">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">For Teachers</h2>
              <p className="text-xl text-slate-600">Create engaging learning experiences in minutes</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  1
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Create a Classroom</h3>
                  <p className="text-slate-600">
                    Set up your classroom and get a unique join code to share with students.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  2
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-slate-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Create Activities</h3>
                  <p className="text-slate-600">
                    Generate conversational learning activities with AI. Customize teaching style and difficulty.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  3
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-slate-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Track Progress</h3>
                  <p className="text-slate-600">
                    Monitor student engagement, view analytics, and identify learning gaps.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* For Students */}
          <div className="mb-24">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">For Students</h2>
              <p className="text-xl text-slate-600">Learn at your own pace with personalized AI tutoring</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  1
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Join a Classroom</h3>
                  <p className="text-slate-600">
                    Enter the join code from your teacher to access assigned activities.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  2
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-slate-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Start Learning</h3>
                  <p className="text-slate-600">
                    Engage in natural conversation with your AI tutor. Ask questions and get instant, personalized help.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  3
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-slate-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Master Concepts</h3>
                  <p className="text-slate-600">
                    Receive detailed feedback, practice problems, and track your understanding over time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fine-Tuning Section */}
          <div className="bg-slate-50 rounded-2xl p-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Fine-Tune Your AI Tutor</h2>
              <p className="text-lg text-slate-600 mb-8">
                Teachers can customize how the AI responds by providing teaching examples. Define assessment criteria, 
                show example student questions, and specify ideal teaching responses. The AI learns from these examples 
                to match your teaching style.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-white rounded-lg p-6">
                  <div className="text-2xl font-bold text-slate-900 mb-2">1</div>
                  <h4 className="font-semibold text-slate-900 mb-2">Define Criteria</h4>
                  <p className="text-sm text-slate-600">Specify how to assess student understanding</p>
                </div>
                <div className="bg-white rounded-lg p-6">
                  <div className="text-2xl font-bold text-slate-900 mb-2">2</div>
                  <h4 className="font-semibold text-slate-900 mb-2">Provide Examples</h4>
                  <p className="text-sm text-slate-600">Show example student questions and ideal responses</p>
                </div>
                <div className="bg-white rounded-lg p-6">
                  <div className="text-2xl font-bold text-slate-900 mb-2">3</div>
                  <h4 className="font-semibold text-slate-900 mb-2">AI Learns</h4>
                  <p className="text-sm text-slate-600">The AI adapts to your teaching style automatically</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join teachers and students transforming math education
          </p>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openAuth', { detail: { signup: true } }))
            }}
            className="px-8 py-4 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mx-auto"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  )
}

