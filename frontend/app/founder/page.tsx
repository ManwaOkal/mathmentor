'use client'

import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Auth from '@/components/Auth'

export default function FounderPage() {
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

      <Navbar rightContent={<Auth />} />

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 sm:mb-6">
            About the Founder
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto relative z-10">
          {/* Founder */}
          <div className="mb-12 sm:mb-16">
            <div className="text-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-6 sm:mb-8 relative">
                <Image
                  src="/carey.jpeg"
                  alt="Carey Okal"
                  width={224}
                  height={224}
                  className="rounded-full object-cover w-full h-full shadow-2xl"
                  quality={90}
                  priority
                  sizes="(max-width: 640px) 192px, 224px"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">Carey Okal</h2>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Carey is a senior at Cornell University studying Information Science, with a concentration in Data Science and Interactive Technology. Passionate about leveraging technology to transform education, Carey founded MathMentor to make personalized math tutoring accessible to students everywhere.
              </p>
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

