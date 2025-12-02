'use client'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-3 sm:py-4 px-4 sm:px-6 flex-shrink-0">
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 w-full gap-2 sm:gap-0">
        <div className="text-center sm:text-left">
          <span>© 2025 MathMentor. Built by </span>
          <a
            href="https://github.com/careyokal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            careyokal
          </a>
        </div>
        <div className="text-gray-500 text-center sm:text-right">
          AI-powered math tutoring
        </div>
      </div>
    </footer>
  )
}
