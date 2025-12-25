'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Auth from '@/components/Auth'
import { useAuth } from '@/lib/auth/useAuth'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/lib/auth/types'
import { BookOpen, ChevronUp } from 'lucide-react'

export default function StudentsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
        
        {/* More Sticky Notes - Larger and More Prominent */}
        <div className="absolute top-32 right-16 w-40 h-40 bg-yellow-100 rotate-6 shadow-2xl transform hover:rotate-3 transition-transform" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2)) drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
        }}>
          <div className="p-4 text-sm font-semibold text-slate-800">x + y = z</div>
        </div>
        <div className="absolute top-64 left-12 w-36 h-36 bg-blue-100 -rotate-6 shadow-2xl transform hover:-rotate-3 transition-transform" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2)) drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
        }}>
          <div className="p-3 text-xs font-semibold text-slate-800">∫ f(x)dx</div>
        </div>
        <div className="absolute bottom-40 right-24 w-44 h-44 bg-pink-100 rotate-3 shadow-2xl transform hover:rotate-0 transition-transform" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2)) drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
        }}>
          <div className="p-4 text-sm font-semibold text-slate-800">a² + b² = c²</div>
        </div>
        <div className="absolute bottom-64 left-20 w-36 h-36 bg-green-100 -rotate-12 shadow-2xl transform hover:-rotate-9 transition-transform" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2)) drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
        }}>
          <div className="p-3 text-xs font-semibold text-slate-800">lim x→∞</div>
        </div>
        <div className="absolute top-96 right-1/4 w-32 h-32 bg-orange-100 rotate-12 shadow-2xl transform hover:rotate-9 transition-transform" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2)) drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
        }}>
          <div className="p-3 text-xs font-semibold text-slate-800">f'(x)</div>
        </div>
        <div className="absolute bottom-96 left-1/3 w-38 h-38 bg-purple-100 -rotate-9 shadow-2xl transform hover:-rotate-6 transition-transform" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2)) drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
        }}>
          <div className="p-3 text-xs font-semibold text-slate-800">e^x</div>
        </div>
        
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

      <Navbar rightContent={<Auth />} />

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="text-sm sm:text-base text-[#737373] mb-2 font-medium">For Students</div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-[#1f1f1f] mb-6 leading-tight tracking-tight">
            Learn in just a few clicks
          </h1>
          <p className="text-xl text-[#737373] max-w-2xl mx-auto leading-relaxed">
            Simple, intuitive workflow for students
          </p>
        </div>
      </section>

      {/* How It Works Section - Student Flow */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="space-y-24 sm:space-y-32">
            {/* Step 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
              {/* Sticky note decoration */}
              <div className="absolute -left-8 top-8 w-28 h-28 bg-yellow-100 rotate-6 shadow-2xl hidden lg:block" style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25)) drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}>
                <div className="p-3 text-xs font-semibold text-slate-800">Step 1</div>
              </div>
              <div className="space-y-6 relative z-10">
                <h3 className="text-3xl sm:text-4xl font-semibold text-[#1f1f1f] leading-tight">Join Classroom</h3>
                <p className="text-lg text-[#737373] leading-relaxed">
                  Enter a simple code from your teacher to access assigned activities instantly.
                </p>
              </div>
              <div className="relative">
                <div className="relative rounded-xl overflow-hidden shadow-2xl bg-gray-900 p-1" style={{
                  filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.25)) drop-shadow(0 6px 15px rgba(0,0,0,0.2))'
                }}>
                  <div className="bg-white rounded-lg overflow-hidden">
                    <Image
                      src="/student_join_classroom_page.png"
                      alt="Student joining classroom"
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="relative h-2 bg-gray-800 rounded-b-xl shadow-xl">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gray-700 rounded-b"></div>
                </div>
              </div>
            </div>

            {/* Step 2 - View Classes and Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
              {/* Sticky note decoration */}
              <div className="absolute -right-8 top-8 w-28 h-28 bg-blue-100 -rotate-6 shadow-2xl hidden lg:block lg:order-2" style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25)) drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}>
                <div className="p-3 text-xs font-semibold text-slate-800">Step 2</div>
              </div>
              <div className="space-y-6 relative z-10 lg:order-2">
                <h3 className="text-3xl sm:text-4xl font-semibold text-[#1f1f1f] leading-tight">View Your Classes</h3>
                <p className="text-lg text-[#737373] leading-relaxed">
                  See all classes you are enrolled in and click on a class to complete the activities assigned by your teacher.
                </p>
              </div>
              <div className="relative lg:order-1">
                <div className="relative rounded-xl overflow-hidden shadow-2xl bg-gray-900 p-1" style={{
                  filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.25)) drop-shadow(0 6px 15px rgba(0,0,0,0.2))'
                }}>
                  <div className="bg-white rounded-lg overflow-hidden">
                    <Image
                      src="/see_all clases you are enrolled in and click on a class to complete the activites .png"
                      alt="View all enrolled classes and activities"
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="relative h-2 bg-gray-800 rounded-b-xl shadow-xl">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gray-700 rounded-b"></div>
                </div>
              </div>
            </div>

            {/* Step 3 - View Assigned Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
              {/* Sticky note decoration */}
              <div className="absolute -left-8 top-8 w-28 h-28 bg-pink-100 rotate-6 shadow-2xl hidden lg:block" style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25)) drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}>
                <div className="p-3 text-xs font-semibold text-slate-800">Step 3</div>
              </div>
              <div className="space-y-6 relative z-10">
                <h3 className="text-3xl sm:text-4xl font-semibold text-[#1f1f1f] leading-tight">View Assigned Activities</h3>
                <p className="text-lg text-[#737373] leading-relaxed">
                  After selecting a class, view and complete all activities planned by your teacher. See your progress and track which activities you've finished.
                </p>
              </div>
              <div className="relative">
                <div className="relative rounded-xl overflow-hidden shadow-2xl bg-gray-900 p-1" style={{
                  filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.25)) drop-shadow(0 6px 15px rgba(0,0,0,0.2))'
                }}>
                  <div className="bg-white rounded-lg overflow-hidden">
                    <Image
                      src="/student_class_activity_view.png"
                      alt="View assigned activities for a class"
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="relative h-2 bg-gray-800 rounded-b-xl shadow-xl">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gray-700 rounded-b"></div>
                </div>
              </div>
            </div>

            {/* Step 4 - Reversed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
              {/* Sticky note decoration */}
              <div className="absolute -right-8 top-8 w-28 h-28 bg-green-100 -rotate-6 shadow-2xl hidden lg:block lg:order-2" style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25)) drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}>
                <div className="p-3 text-xs font-semibold text-slate-800">Step 4</div>
              </div>
              <div className="relative lg:order-1">
                <div className="relative rounded-xl overflow-hidden shadow-2xl bg-gray-900 p-1" style={{
                  filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.25)) drop-shadow(0 6px 15px rgba(0,0,0,0.2))'
                }}>
                  <div className="bg-white rounded-lg overflow-hidden">
                    <Image
                      src="/student_ai_chat_interface.png"
                      alt="AI chat interface"
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="relative h-2 bg-gray-800 rounded-b-xl shadow-xl">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gray-700 rounded-b"></div>
                </div>
              </div>
              <div className="space-y-6 relative z-10 lg:order-2">
                <h3 className="text-3xl sm:text-4xl font-semibold text-[#1f1f1f] leading-tight">Start Learning</h3>
                <p className="text-lg text-[#737373] leading-relaxed">
                  Engage in natural conversation with your AI tutor. Ask questions and get instant, personalized help.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
              {/* Sticky note decoration */}
              <div className="absolute -left-8 top-8 w-28 h-28 bg-purple-100 rotate-6 shadow-2xl hidden lg:block" style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 90%, 0 90%)',
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25)) drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}>
                <div className="p-3 text-xs font-semibold text-slate-800">Step 5</div>
              </div>
              <div className="space-y-6 relative z-10">
                <h3 className="text-3xl sm:text-4xl font-semibold text-[#1f1f1f] leading-tight">Track Progress</h3>
                <p className="text-lg text-[#737373] leading-relaxed">
                  Monitor understanding, get insights, and improve learning strategies over time.
                </p>
              </div>
              <div className="relative">
                <div className="relative rounded-xl overflow-hidden shadow-2xl bg-gray-900 p-1" style={{
                  filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.25)) drop-shadow(0 6px 15px rgba(0,0,0,0.2))'
                }}>
                  <div className="bg-white rounded-lg overflow-hidden">
                    <Image
                      src="/feedback_student_received_from_ai.png"
                      alt="Student feedback and progress"
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="relative h-2 bg-gray-800 rounded-b-xl shadow-xl">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gray-700 rounded-b"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 sm:px-6 lg:px-8 bg-[#1f1f1f] text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <span className="text-lg font-semibold">MathMentor</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-sm text-[#a3a3a3]">
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
              <a href="/founder" className="hover:text-white transition-colors">About the Founder</a>
              <span className="text-xs sm:text-sm">© {new Date().getFullYear()} MathMentor. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 bg-slate-900 text-white p-3 rounded-full shadow-lg hover:bg-slate-800 transition-all duration-300 hover:scale-110 flex items-center justify-center"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}

