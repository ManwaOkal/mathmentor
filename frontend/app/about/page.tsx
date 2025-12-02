'use client'

import Navbar from '@/components/Navbar'
import { BookOpen, Sparkles, Heart, Target } from 'lucide-react'
import { useAuth } from '@/lib/auth/useAuth'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/lib/auth/types'
import Auth from '@/components/Auth'

export default function AboutPage() {
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
      <section className="pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 sm:mb-6">
            About MathMentor
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Transforming math education through AI-powered personalized learning
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Mission */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">Our Mission</h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-4">
              MathMentor was born from a simple belief: every student deserves personalized, patient, 
              and effective math tutoring, and every teacher deserves tools that amplify their impact 
              without adding to their workload.
            </p>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              We're on a mission to modernize math education by making AI-powered tutoring accessible, 
              customizable, and effective. Our platform empowers teachers to create engaging learning 
              experiences while giving students 24/7 access to personalized help that adapts to their 
              learning style.
            </p>
          </div>

          {/* Founder */}
          <div className="mb-12 sm:mb-16 bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-12">
            <div className="text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-2xl sm:text-3xl font-bold text-white">CO</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Carey Okal</h2>
              <p className="text-base sm:text-lg text-slate-600 mb-4 sm:mb-6">Founder</p>
              <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Carey Okal founded MathMentor with a vision to bridge the gap between traditional 
                education and modern technology. With a passion for both mathematics and innovation, 
                Carey created MathMentor to make high-quality math tutoring accessible to everyone, 
                regardless of location or resources.
              </p>
            </div>
          </div>

          {/* Vision */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">Our Vision</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-slate-700" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Accessible Education</h3>
                  <p className="text-slate-600">
                    Make high-quality math tutoring available to students everywhere, breaking down 
                    barriers to learning.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Heart className="w-6 h-6 text-slate-700" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Empower Teachers</h3>
                  <p className="text-slate-600">
                    Give teachers powerful tools to create engaging learning experiences without 
                    increasing their workload.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-slate-700" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Personalized Learning</h3>
                  <p className="text-slate-600">
                    Provide every student with a personalized learning experience that adapts to 
                    their pace and style.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-slate-700" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Continuous Innovation</h3>
                  <p className="text-slate-600">
                    Continuously improve our platform based on feedback from teachers and students 
                    to better serve the education community.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-6 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 sm:mb-8 text-center">Our Values</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Student-First</h3>
                <p className="text-slate-600 text-sm">
                  Every decision we make prioritizes student learning and success.
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Teacher Partnership</h3>
                <p className="text-slate-600 text-sm">
                  We build tools that amplify teachers' impact, not replace them.
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Innovation</h3>
                <p className="text-slate-600 text-sm">
                  We embrace cutting-edge technology to solve real educational challenges.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Join Us on Our Mission</h2>
          <p className="text-lg sm:text-xl text-slate-300 mb-6 sm:mb-8">
            Be part of the future of math education
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-all font-medium shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            Get Started
          </button>
        </div>
      </section>
    </div>
  )
}

