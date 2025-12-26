'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  duration?: number
  onClose: () => void
}

export default function Toast({ message, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setIsVisible(true)

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setIsVisible(false)
      // Wait for fade-out animation before calling onClose
      setTimeout(onClose, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 min-w-[280px] max-w-md transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      role="alert"
    >
      <div className="flex-shrink-0">
        <CheckCircle className="w-5 h-5 text-green-600" />
      </div>
      <p className="flex-1 text-sm font-medium text-slate-900">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(onClose, 300)
        }}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}





