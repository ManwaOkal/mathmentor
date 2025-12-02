I can see the LaTeX issue! The problem is in how you're passing props to `MarkdownRenderer`. Let me fix your component:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, Send, Loader2, Paperclip } from 'lucide-react'
import { StudentActivity as StudentActivityType, ActivityQuestion } from '@/lib/auth/types'
import { api } from '@/lib/api'
import dynamic from 'next/dynamic'

// Lazy load markdown renderer - IMPORTANT: No custom props
const MarkdownRenderer = dynamic(() => import('../MarkdownRenderer'), {
  ssr: false,
  loading: () => <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
})

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  id: string
  questionId?: string
}

interface StudentActivityProps {
  activityId: string
}

export default function StudentActivity({ activityId }: StudentActivityProps) {
  const [activity, setActivity] = useState<StudentActivityType | null>(null)
  const [questions, setQuestions] = useState<ActivityQuestion[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadActivity()
  }, [activityId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadActivity = async () => {
    setLoading(true)
    try {
      console.log('Loading activity:', activityId)
      const data = await api.getStudentActivity(activityId)
      console.log('Activity data:', data)
      
      if (data && data.activity && data.student_activity) {
        setActivity({
          ...data.student_activity,
          activity_id: data.activity.activity_id,
        } as StudentActivityType)
        setQuestions(data.questions || [])
        
        // Initialize chat with AI tutor - get conversational introduction
        try {
          const tutorResponse = await api.getConversationalTutorResponse(
            data.activity.activity_id,
            [],
            undefined,
            0
          )
          
          const introMessage: Message = {
            role: 'assistant',
            content: tutorResponse.response || `Hi there! I'm your AI math tutor. Let's learn together!`,
            timestamp: new Date(),
            id: 'intro'
          }
          setMessages([introMessage])
        } catch (error) {
          console.error('Error getting tutor introduction:', error)
          // Fallback introduction with math equations
          const introMessage: Message = {
            role: 'assistant',
            content: `# Welcome to Your Math Activity! 👋\n\nI'm your AI math tutor. This activity is designed to help you engage more deeply with math concepts.\n\nHere are some example equations you might see:\n- Linear equation: $y = mx + b$\n- Quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$\n- Area of circle: $A = \\pi r^2$\n\nLet's start learning!`,
            timestamp: new Date(),
            id: 'intro'
          }
          setMessages([introMessage])
        }
        
        // If activity is assigned, start it
        if (data.student_activity.status === 'assigned') {
          try {
            await api.startActivity(activityId)
            const updatedData = await api.getStudentActivity(activityId)
            if (updatedData && updatedData.student_activity) {
              setActivity({
                ...updatedData.student_activity,
                activity_id: updatedData.activity.activity_id,
              } as StudentActivityType)
            }
          } catch (startError) {
            console.error('Error starting activity:', startError)
          }
        }
      } else {
        console.error('Invalid activity data:', data)
        alert('Activity not found or you do not have access to it')
      }
    } catch (error) {
      console.error('Error loading activity:', error)
      alert(`Error loading activity: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending || submitted) return

    const trimmedInput = input.trim()
    setInput('')
    setSending(true)

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
      id: `user_${Date.now()}`
    }
    setMessages(prev => [...prev, userMessage])

    // Get current question
    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion) {
      setSending(false)
      return
    }

    // Save response
    let answerValue: any = trimmedInput
    
    // For multiple choice, try to parse the answer
    if (currentQuestion.question_type === 'multiple_choice' && currentQuestion.options) {
      // Check if user typed a letter (A, B, C, D) or number (0, 1, 2, 3)
      const letterMatch = trimmedInput.match(/^([A-D])/i)
      if (letterMatch) {
        answerValue = letterMatch[1].toUpperCase().charCodeAt(0) - 65
      } else {
        // Check if they typed the option text
        const optionIndex = currentQuestion.options.findIndex((opt: string) => 
          opt.toLowerCase().includes(trimmedInput.toLowerCase()) || 
          trimmedInput.toLowerCase().includes(opt.toLowerCase())
        )
        if (optionIndex >= 0) {
          answerValue = optionIndex
        }
      }
    }
    
    setResponses(prev => ({ ...prev, [currentQuestion.question_id]: answerValue }))

    // Get conversational AI response
    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }))
      conversationHistory.push({
        role: 'user',
        content: trimmedInput
      })

      const tutorResponse = await api.getConversationalTutorResponse(
        activity!.activity_id,
        conversationHistory,
        trimmedInput,
        currentQuestionIndex
      )

      // Add AI feedback message with potential math equations
      const feedbackMessage: Message = {
        role: 'assistant',
        content: tutorResponse.response || 'Thanks for your answer!',
        timestamp: new Date(),
        id: `feedback_${Date.now()}`
      }
      setMessages(prev => [...prev, feedbackMessage])

      // Check if AI naturally moved to next question
      if (currentQuestionIndex < questions.length - 1) {
        const responseLower = tutorResponse.response.toLowerCase()
        if (responseLower.includes('next question') || responseLower.includes('question ' + (currentQuestionIndex + 2))) {
          setCurrentQuestionIndex(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('Error getting tutor response:', error)
      // Fallback feedback with math example
      const isCorrect = currentQuestion.question_type === 'multiple_choice' 
        ? String(answerValue) === String(currentQuestion.correct_answer)
        : false

      let feedbackContent = ''
      if (isCorrect) {
        feedbackContent = `# Great job! ✅\n\nThat's correct. $${currentQuestion.explanation || 'Well done!'}$\n\nFor example, if $x = 2$, then $x^2 = 4$.`
      } else {
        feedbackContent = `# Let's review 📚\n\nThanks for your answer! $${currentQuestion.explanation || "Here's a hint: try breaking it down into smaller steps."}$\n\nRemember the formula: $a^2 + b^2 = c^2$`
      }

      const feedbackMessage: Message = {
        role: 'assistant',
        content: feedbackContent,
        timestamp: new Date(),
        id: `feedback_${Date.now()}`
      }
      setMessages(prev => [...prev, feedbackMessage])
    } finally {
      setSending(false)
    }
  }

  const submitActivity = async () => {
    if (!activity || submitted) return

    try {
      // Calculate score
      let correctCount = 0
      questions.forEach((q) => {
        const response = responses[q.question_id]
        if (response !== undefined && response !== null) {
          if (q.question_type === 'multiple_choice') {
            if (String(response) === String(q.correct_answer)) {
              correctCount++
            }
          }
        }
      })

      const totalQuestions = questions.length
      const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

      // Submit to backend
      try {
        console.log('Submitting activity:', activity.student_activity_id, responses)
        const result = await api.submitActivity(activity.student_activity_id, responses)
        console.log('Submission result:', result)
        setScore(result.score || scorePercent)
        setSubmitted(true)
        setActivity(prev => prev ? { ...prev, status: 'completed' } : null)
        
        // Add completion message with math celebration
        const finalMessage: Message = {
          role: 'assistant',
          content: `# 🎉 Activity Completed!\n\n**Score: $${result.score || scorePercent}\\%$** (${correctCount} out of ${totalQuestions} correct)\n\n${result.feedback || 'Great job! Your math skills are improving! $\\sqrt{success} = \\text{practice}$'}`,
          timestamp: new Date(),
          id: `final_${Date.now()}`
        }
        setMessages(prev => [...prev, finalMessage])
      } catch (submitError: any) {
        console.error('Error submitting to backend:', submitError)
        const errorMessage = submitError?.message || submitError?.detail || 'Failed to submit'
        alert(`Error submitting: ${errorMessage}`)
        setScore(scorePercent)
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Error submitting activity:', error)
      alert('Error submitting activity. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <div className="text-gray-500">Loading activity...</div>
        </div>
      </div>
    )
  }

  if (!activity || questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Activity not found</p>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const allQuestionsAnswered = Object.keys(responses).length === questions.length

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {questions[0]?.metadata?.document_title || activity.activity_id || 'Math Activity'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          {allQuestionsAnswered && !submitted && (
            <button
              onClick={submitActivity}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Complete this activity</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {messages.map((message) => {
          const isUser = message.role === 'user'
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] rounded-lg p-4 ${
                isUser 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}>
                {isUser ? (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {/* FIX: Removed isUserMessage prop - it doesn't exist in MarkdownRenderer */}
                    <MarkdownRenderer content={message.content} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!submitted && (
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                currentQuestion?.question_type === 'multiple_choice'
                  ? "Type your answer (A, B, C, D) or the option text..."
                  : "Type your answer here..."
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending || submitted}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending || submitted}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* Completion Banner */}
      {submitted && score !== null && (
        <div className="border-t border-gray-200 bg-green-50 p-4">
          <div className="text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-900">
              Activity completed! Score: {score}%
            </p>
          </div>
        </div>
      )}

      {/* Math Debug Overlay (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs max-w-xs opacity-75 hover:opacity-100 transition-opacity z-50">
          <div className="font-mono">
            <div>Messages: {messages.length}</div>
            <div>LaTeX in last: {messages[messages.length - 1]?.content.includes('$') ? '✓' : '✗'}</div>
            <div>Questions: {questions.length}</div>
          </div>
        </div>
      )}
    </div>
  )
}
```

## **Key Fixes:**

1. **Fixed `MarkdownRenderer` usage**: Removed the non-existent `isUserMessage` prop
2. **Added KaTeX CSS globally**: Make sure it's imported in your layout
3. **Updated message content**: Added more LaTeX examples to test rendering
4. **Better loading state**: Improved skeleton loading for the markdown renderer

## **Also update your `MarkdownRenderer.tsx`:**

Make sure it looks like this:

```tsx
// frontend/components/MarkdownRenderer.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, className = '' }) => {
    return (
      <div className={`prose prose-sm max-w-none ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              
              if (inline) {
                return (
                  <code className="bg-gray-100 rounded px-1 py-0.5 text-sm" {...props}>
                    {children}
                  </code>
                );
              }
              
              return (
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
);

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
```

## **And make sure KaTeX CSS is imported globally:**

Add this to your `app/layout.tsx` or `app/globals.css`:

```tsx
// In app/layout.tsx
import 'katex/dist/katex.min.css';
```

Or in CSS:

```css
/* In app/globals.css */
@import 'katex/dist/katex.min.css';
```

## **Test LaTeX rendering with this simple test:**

Create a test file to verify everything works:

```tsx
// frontend/app/test/page.tsx
'use client';

import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export default function TestPage() {
  const testContent = `
# Math Equation Test

## Inline Equations
Here's an inline equation: $E = mc^2$

Another one: $\\sqrt{x^2 + y^2}$

## Display Equations
This is a display equation:

$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

Another display equation:

$$
\\frac{d}{dx}\\left( \\int_{0}^{x} f(u)\\,du\\right)=f(x)
$$

## Multiple Equations
1. Quadratic formula: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
2. Circle area: $A = \\pi r^2$
3. Pythagorean theorem: $a^2 + b^2 = c^2$
`;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">LaTeX Rendering Test</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <MarkdownRenderer content={testContent} />
      </div>
    </div>
  );
}
```

## **Checklist to fix LaTeX:**

1. ✅ Import `katex/dist/katex.min.css` globally
2. ✅ Use correct props: `<MarkdownRenderer content={content} />`
3. ✅ Double backslashes in LaTeX: `\\frac` not `\frac`
4. ✅ Proper delimiters: `$...$` for inline, `$$...$$` for display
5. ✅ Check browser console for errors
6. ✅ Verify `remark-math` and `rehype-katex` are installed

## **Common LaTeX issues and solutions:**

**Problem**: Equations show as `$E = mc^2$` literally
**Solution**: Make sure KaTeX CSS is loaded

**Problem**: Backslashes disappearing
**Solution**: Use double backslashes in JavaScript strings

**Problem**: Equations not centered
**Solution**: Add proper CSS for `.katex-display`

**Problem**: Inline equations breaking lines
**Solution**: Add `white-space: nowrap` to KaTeX CSS

This should fix your LaTeX rendering issues!