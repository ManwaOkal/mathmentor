'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Send, Loader2, ArrowLeft, Brain, Clock, User, CheckCircle2, Home } from 'lucide-react'
import { StudentActivity as StudentActivityType } from '@/lib/auth/types'
import { api } from '@/lib/api'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import Navbar from '../Navbar'

// Lazy load markdown renderer
const MarkdownRenderer = dynamic(() => import('../MarkdownRenderer'), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      <div className="animate-pulse h-4 bg-slate-700 rounded w-3/4"></div>
      <div className="animate-pulse h-4 bg-slate-700 rounded w-full"></div>
      <div className="animate-pulse h-4 bg-slate-700 rounded w-2/3"></div>
    </div>
  )
})

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  id: string
}

type LearningPhase = 'introduction' | 'teach' | 'practice' | 'evaluate' | 'complete'

interface StudentActivityProps {
  activityId: string
  onActivityCompleted?: () => void
}

export default function StudentActivity({ activityId, onActivityCompleted }: StudentActivityProps) {
  const router = useRouter()
  const { session } = useAuth()
  const [activity, setActivity] = useState<StudentActivityType | null>(null)
  const [activityTitle, setActivityTitle] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<LearningPhase>('introduction')
  const [timeSpent, setTimeSpent] = useState(0)
  const [understandingScore, setUnderstandingScore] = useState<number | null>(null)
  const [assessmentFeedback, setAssessmentFeedback] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Memoize session token to avoid repeated retrieval
  const sessionToken = useMemo(() => session?.access_token || null, [session?.access_token])

  // Helper: Convert messages to conversation history format
  const getConversationHistory = useCallback((msgs: Message[] = messages) => {
    return msgs.map(m => ({ role: m.role, content: m.content }))
  }, [messages])

  // Helper: Check if user messages contain mathematical work
  const hasMathematicalWork = useCallback((userMessages: string[]) => {
    const mathKeywords = [
      'solve', 'answer', 'calculate', 'work', 'step', 'equation', 'problem',
      'example', 'explain', 'understand', 'think', 'try', 'attempt', 'got',
      'result', 'answer is', 'equals', 'formula', 'solution', 'method',
      '=', '+', '-', '*', '/', 'x', 'y', 'variable', 'algebra', 'math'
    ]
    
    return userMessages.some(content => {
      const lowerContent = content.toLowerCase()
      const hasNumbers = /\d/.test(content)
      const hasMathKeywords = mathKeywords.some(keyword => lowerContent.includes(keyword))
      const hasMathExpressions = /[+\-*/=<>]/.test(content) || /\d+\s*[+\-*/=<>]\s*\d+/.test(content)
      return hasNumbers || hasMathKeywords || hasMathExpressions
    })
  }, [])

  // Helper: Check if messages are just greetings
  const isJustGreetings = useCallback((userMessages: string[]) => {
    const greetingWords = ['hello', 'hi', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'sure', 'cool', 'nice']
    return userMessages.every(content => {
      const trimmed = content.trim().toLowerCase()
      return greetingWords.some(word => trimmed.startsWith(word)) && content.length < 50
    })
  }, [])

  // Memoized user message stats
  const userMessageStats = useMemo(() => {
    const userMessages = messages.filter(m => m.role === 'user')
    const userMessageContents = userMessages.map(m => m.content.toLowerCase())
    const hasMath = hasMathematicalWork(userMessageContents)
    const isGreetings = isJustGreetings(userMessageContents)
    const totalExchanges = Math.ceil(messages.length / 2)
    
    return {
      count: userMessages.length,
      contents: userMessageContents,
      hasMathematicalWork: hasMath,
      isJustGreetings: isGreetings,
      totalExchanges,
      canComplete: userMessages.length >= 2 && (hasMath || userMessages.length >= 3)
    }
  }, [messages, hasMathematicalWork, isJustGreetings])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadActivity = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getStudentActivity(activityId, sessionToken || undefined)
      
      if (data && data.activity && data.student_activity) {
        setActivity({
          ...data.student_activity,
          activity_id: data.activity.activity_id,
        } as StudentActivityType)
        
        setActivityTitle(data.activity.title || 'Math Activity')
        
        if (data.student_activity.status === 'completed') {
          setCompleted(true)
          setCurrentPhase('complete')
          // Load conversation history if available
          if (data.student_activity.metadata?.conversation_history) {
            const history = data.student_activity.metadata.conversation_history
            const loadedMessages: Message[] = history.map((msg: any, idx: number) => ({
              role: msg.role,
              content: msg.content,
              timestamp: new Date(),
              id: `loaded_${idx}`
            }))
            setMessages(loadedMessages)
          }
          // Load understanding score if available
          if (data.student_activity.score !== null && data.student_activity.score !== undefined) {
            setUnderstandingScore(data.student_activity.score)
          }
          if (data.student_activity.feedback) {
            setAssessmentFeedback(data.student_activity.feedback)
          }
          return // Don't proceed with normal flow for completed activities
        }
        
        // Check if there's saved conversation history for in-progress activities
        if (data.student_activity.metadata?.conversation_history && 
            Array.isArray(data.student_activity.metadata.conversation_history) &&
            data.student_activity.metadata.conversation_history.length > 0) {
          // Restore saved conversation
          const history = data.student_activity.metadata.conversation_history
          const loadedMessages: Message[] = history.map((msg: any, idx: number) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(),
            id: `loaded_${idx}`
          }))
          setMessages(loadedMessages)
          
          // Determine current phase based on conversation length
          // This is a simple heuristic - you might want to make it smarter
          const conversationLength = history.length
          if (conversationLength >= 13) {
            setCurrentPhase('evaluate')
          } else if (conversationLength >= 10) {
            setCurrentPhase('practice')
          } else if (conversationLength >= 6) {
            setCurrentPhase('teach')
          } else {
            setCurrentPhase('teach') // Default to teach phase
          }
        } else {
          // No saved conversation - start fresh with introduction
          try {
            const introResponse = await api.getActivityIntroduction(data.activity.activity_id, sessionToken || undefined)
            
            // Ensure we have valid introduction data
            if (introResponse && introResponse.trim() && !introResponse.includes('Welcome\n\n\n\nI\'m your')) {
              const introMessage: Message = {
                role: 'assistant',
                content: introResponse,
                timestamp: new Date(),
                id: 'intro'
              }
              setMessages([introMessage])
            } else {
              // If introduction is invalid, use fallback
              const introMessage: Message = {
                role: 'assistant',
                content: generateWelcomeMessage(),
                timestamp: new Date(),
                id: 'intro'
              }
              setMessages([introMessage])
            }
            // Skip introduction phase and go straight to teach
            setCurrentPhase('teach')
          } catch (error) {
            console.error('Error getting introduction:', error)
            const introMessage: Message = {
              role: 'assistant',
              content: generateWelcomeMessage(),
              timestamp: new Date(),
              id: 'intro'
            }
            setMessages([introMessage])
            // Skip introduction phase and go straight to teach
            setCurrentPhase('teach')
          }
        }
        
        if (data.student_activity.status === 'assigned') {
          try {
            await api.startActivity(activityId, sessionToken || undefined)
            const updatedData = await api.getStudentActivity(activityId, sessionToken || undefined)
            if (updatedData && updatedData.student_activity) {
              setActivity({
                ...updatedData.student_activity,
                activity_id: updatedData.activity.activity_id,
              } as StudentActivityType)
              if (updatedData.activity?.title) {
                setActivityTitle(updatedData.activity.title)
              }
            }
          } catch (error) {
            console.error('Error starting activity:', error)
          }
        }
      } else {
        alert('Activity not found')
      }
    } catch (error) {
      console.error('Error loading activity:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [activityId, sessionToken])

  const loadActivityRef = useRef<string | null>(null)
  
  useEffect(() => {
    // Only load if activityId changed or hasn't been loaded yet
    if (loadActivityRef.current !== activityId) {
      loadActivityRef.current = activityId
      loadActivity()
    }
    
    const timer = setInterval(() => setTimeSpent(prev => prev + 1), 60000) // Every minute
    return () => {
      clearInterval(timer)
      if (loadActivityRef.current === activityId) {
        loadActivityRef.current = null
      }
    }
  }, [activityId, loadActivity])

  useEffect(() => {
    scrollToBottom()
  }, [messages, sending, scrollToBottom])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // Auto-save conversation periodically and on unmount
  useEffect(() => {
    if (!activity || !activity.student_activity_id || completed || !sessionToken) {
      return
    }

    // Save conversation every 30 seconds if there are messages
    const autoSaveInterval = setInterval(() => {
      if (messages.length > 0) {
        const conversationHistory = getConversationHistory()
        if (conversationHistory.length > 0) {
          api.saveConversation(activity.student_activity_id, conversationHistory, sessionToken).catch((error) => {
            console.error('Error auto-saving conversation:', error)
          })
        }
      }
    }, 30000) // Save every 30 seconds

    // Save when page becomes hidden (user switches tabs or minimizes)
    const handleVisibilityChange = () => {
      if (document.hidden && messages.length > 0) {
        const conversationHistory = getConversationHistory()
        if (conversationHistory.length > 0) {
          api.saveConversation(activity.student_activity_id, conversationHistory, sessionToken).catch((error) => {
            console.error('Error saving conversation on visibility change:', error)
          })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup: save conversation when navigating away
    return () => {
      clearInterval(autoSaveInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // Final save on unmount
      if (messages.length > 0) {
        const conversationHistory = getConversationHistory()
        if (conversationHistory.length > 0) {
          api.saveConversation(activity.student_activity_id, conversationHistory, sessionToken).catch((error) => {
            console.error('Error saving conversation on unmount:', error)
          })
        }
      }
    }
  }, [activity, messages, completed, sessionToken, getConversationHistory])

  const generateWelcomeMessage = () => {
    return `Hi! My name is MathMentor, your AI math tutor. I've been programmed by your teacher to teach you using their specific methods and instructions. Your teacher has planned this lesson to help you master mathematical concepts through conversation. I'm here to help you succeed!`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending || completed || activity?.status === 'completed') return

    const trimmedInput = input.trim()
    setInput('')
    setSending(true)

    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
      id: `user_${Date.now()}`
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const conversationHistory = [...getConversationHistory(), { role: 'user' as const, content: trimmedInput }]

      // Get phase-based response
      const phaseResponse = await api.getPhaseResponse(activity!.activity_id, {
        student_input: trimmedInput,
        current_phase: currentPhase,
        conversation_history: conversationHistory
      }, sessionToken || undefined)

      // Set sending to false BEFORE adding the message to prevent double rendering
      setSending(false)

      const aiMessage: Message = {
        role: 'assistant',
        content: phaseResponse.response || 'Thanks for your response!',
        timestamp: new Date(),
        id: `ai_${Date.now()}`
      }
      setMessages(prev => [...prev, aiMessage])

      // Update phase if needed
      if (phaseResponse.next_phase && phaseResponse.next_phase !== currentPhase) {
        setCurrentPhase(phaseResponse.next_phase as LearningPhase)
        // Don't auto-complete - let user click the complete button when ready
      }

      // Save conversation including the AI response
      try {
        const fullConversationHistory = [
          ...conversationHistory,
          { role: 'assistant', content: phaseResponse.response || 'Thanks for your response!' }
        ]
        await api.saveConversation(activity!.student_activity_id, fullConversationHistory, sessionToken || undefined)
      } catch (error) {
        console.error('Error saving conversation:', error)
      }
    } catch (error) {
      console.error('Error getting tutor response:', error)
      // Set sending to false BEFORE adding error message
      setSending(false)
      
      const fallbackMessage: Message = {
        role: 'assistant',
        content: `Thanks for your response! Let's continue exploring this concept together.`,
        timestamp: new Date(),
        id: `fallback_${Date.now()}`
      }
      setMessages(prev => [...prev, fallbackMessage])
    }
  }

  const completeActivity = async () => {
    if (!activity || completed || isCompleting || messages.length <= 1 || activity.status === 'completed') return

    setIsCompleting(true)
    try {
      const conversationHistory = getConversationHistory()
      const { count: userMessageCount, hasMathematicalWork, isJustGreetings } = userMessageStats

      // Track the score and feedback we'll send to the backend
      let finalScore = 0
      let finalFeedback: string | undefined = undefined

      // Only assess if there's meaningful conversation (more than just intro)
      if (conversationHistory.length > 1 && userMessageCount > 0) {
        try {
          const assessment = await api.assessUnderstanding(activity.activity_id, conversationHistory, sessionToken || undefined)
          
          // Override if AI gave score but there's no actual math work
          if (!hasMathematicalWork || isJustGreetings) {
            finalScore = 0
            setUnderstandingScore(0)
            // Let backend generate dynamic feedback - don't set fixed text
            setAssessmentFeedback(null)
          } else {
            finalScore = assessment.score
            finalFeedback = assessment.feedback || undefined
            setUnderstandingScore(assessment.score)
            // Use AI-generated feedback if available, otherwise let backend generate it
            setAssessmentFeedback(assessment.feedback || null)
          }
        } catch (error) {
          console.error('Error assessing understanding:', error)
          // Calculate score based on actual engagement - 0 if no math work
          finalScore = (isJustGreetings || !hasMathematicalWork) 
            ? 0 
            : Math.min(30 + (userMessageCount * 10), 70)
          
          setUnderstandingScore(finalScore)
          // Let backend generate dynamic feedback instead of using fixed text
          setAssessmentFeedback(null)
        }
      } else {
        finalScore = 0
        setUnderstandingScore(0)
        // Let backend generate dynamic feedback
        setAssessmentFeedback(null)
      }

      // Always send score (backend will generate dynamic feedback if not provided)
      console.log(`DEBUG: Sending score ${finalScore} and feedback ${finalFeedback ? 'present' : 'undefined'} to backend`)

      await api.completeConversationalActivity(
        activity.student_activity_id, 
        conversationHistory, 
        sessionToken || undefined,
        finalScore,
        finalFeedback
      )
      
      // Reload activity to get updated status from server
      try {
        const updatedData = await api.getStudentActivity(activityId, sessionToken || undefined)
        if (updatedData && updatedData.student_activity) {
          setActivity({
            ...updatedData.student_activity,
            activity_id: updatedData.activity.activity_id,
          } as StudentActivityType)
        }
      } catch (error) {
        console.error('Error reloading activity:', error)
      }
      
      setCompleted(true)
      setCurrentPhase('complete')
      
      const finalMessage: Message = {
        role: 'assistant',
        content: generateCompletionMessage(),
        timestamp: new Date(),
        id: `final_${Date.now()}`
      }
      setMessages(prev => [...prev, finalMessage])
      
      // Notify parent to refresh activities list after a short delay to ensure backend has processed
      setTimeout(() => {
        if (onActivityCompleted) {
          onActivityCompleted()
        }
      }, 500)
    } catch (error) {
      console.error('Error completing activity:', error)
      alert('Error completing activity. Please try again.')
    } finally {
      setIsCompleting(false)
    }
  }

  const generateCompletionMessage = () => {
    return `# Great work

You've shown excellent mathematical thinking throughout this activity. Keep up the great work.`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-sm text-slate-600 font-medium">Loading activity...</div>
        </div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="space-y-2">
            <div className="text-lg font-semibold text-slate-900">Activity Not Found</div>
            <div className="text-sm text-slate-600">This activity may have been removed or you don't have access</div>
          </div>
          <button
            onClick={() => router.push('/student')}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white flex flex-col">
      {/* Navigation Bar - matching student landing page */}
      <Navbar
        leftContent={
          <button
            onClick={() => router.push('/student')}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 flex-shrink-0 group"
            aria-label="Back to dashboard"
          >
            <Home className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="text-sm font-medium">Home</span>
          </button>
        }
        centerContent={
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
              {activityTitle || 'Math Activity'}
            </h1>
            {!completed && (
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 capitalize font-medium px-2 py-0.5 bg-slate-100 rounded-md">
                  {currentPhase.replace('_', ' ')}
                </span>
                <div className="flex items-center text-xs text-slate-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {timeSpent} min
                </div>
              </div>
            )}
          </div>
        }
        rightContent={
          <div className="flex items-center gap-3 flex-shrink-0">
            {!completed ? (
              <button
                onClick={completeActivity}
                disabled={isCompleting || sending || !userMessageStats.canComplete}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center gap-2 ${
                  userMessageStats.canComplete
                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                title={!userMessageStats.canComplete 
                  ? `Engage more with the activity. Complete activities require demonstrating understanding through problem-solving (${userMessageStats.count} message${userMessageStats.count !== 1 ? 's' : ''} so far).`
                  : `Complete activity (${userMessageStats.totalExchanges} exchange${userMessageStats.totalExchanges !== 1 ? 's' : ''})`
                }
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Completing...</span>
                  </>
                ) : userMessageStats.canComplete ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Complete</span>
                    <span className="sm:hidden">Complete</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      {userMessageStats.count === 0
                        ? 'Start conversation'
                        : `Engage more (${userMessageStats.count})`
                      }
                    </span>
                    <span className="sm:hidden">Start</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl border border-green-200">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold hidden sm:inline">Completed</span>
              </div>
            )}
          </div>
        }
      />

      {/* Chat Container */}
      <main className="flex-1 overflow-hidden bg-gradient-to-b from-white to-slate-50/50">
        <div className="max-w-6xl mx-auto h-full flex flex-col px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto py-6 sm:py-8 md:py-10 space-y-4 sm:space-y-5 pb-24 sm:pb-28 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            {messages.map((message, index) => {
              const isUser = message.role === 'user'
              const showAvatar = index === 0 || messages[index - 1]?.role !== message.role

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {!isUser && showAvatar && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg ring-2 ring-blue-100">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${showAvatar ? '' : isUser ? 'mr-12' : 'ml-12'} max-w-[95%] sm:max-w-[90%] md:max-w-[85%]`}>
                    {isUser ? (
                      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm px-4 sm:px-5 py-3 sm:py-3.5 shadow-lg shadow-blue-500/20">
                        <p className="text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap font-normal">{message.content}</p>
                      </div>
                    ) : (
                      <div className="w-full">
                        {showAvatar && (
                          <div className="mb-1.5 ml-1">
                            <span className="text-xs font-semibold text-slate-600 tracking-wide">MathMentor</span>
                          </div>
                        )}
                        <div className="bg-white rounded-2xl rounded-tl-sm px-4 sm:px-5 py-3 sm:py-3.5 shadow-md border border-slate-100">
                          <div className="prose prose-sm max-w-none prose-headings:mt-0 prose-headings:mb-2 prose-headings:text-slate-900 prose-headings:font-semibold prose-headings:tracking-tight prose-p:my-0 prose-p:leading-relaxed prose-p:text-slate-700 prose-p:text-[15px] sm:prose-p:text-base prose-ul:my-2 prose-li:my-1 prose-li:text-slate-700 prose-li:leading-relaxed prose-strong:text-slate-900 prose-strong:font-semibold prose-code:text-slate-900 prose-code:bg-blue-50 prose-code:px-2 prose-code:py-1 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-code:border prose-code:border-blue-100 prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:rounded-lg">
                            <MarkdownRenderer content={message.content} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {isUser && showAvatar && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg ring-2 ring-slate-100">
                        <span className="text-white text-sm font-semibold">S</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {sending && (
              <div className="flex justify-start items-start gap-3 animate-in fade-in duration-200">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg ring-2 ring-blue-100">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 sm:px-5 py-3 sm:py-3.5 shadow-md border border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-slate-600 font-medium">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input Area */}
      {!completed && (
        <div className="sticky bottom-0 bg-white/98 backdrop-blur-lg border-t border-slate-200/60 px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.08)]">
          <div className="max-w-5xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl blur-sm opacity-50"></div>
                <div className="relative bg-white border-2 border-slate-200 rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 shadow-sm">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      currentPhase === 'teach' ? "Ask a question..." :
                      currentPhase === 'practice' ? "Share your thinking..." :
                      currentPhase === 'evaluate' ? "Show what you've learned..." :
                      "Type your message..."
                    }
                    className="w-full border-none outline-none bg-transparent text-slate-900 placeholder-slate-400 text-sm sm:text-[15px] leading-relaxed"
                    disabled={sending}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="px-5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base font-semibold flex-shrink-0 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:shadow-none flex items-center justify-center gap-2 min-w-[80px]"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Completion Screen */}
      {completed && understandingScore !== null && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-8 shadow-xl my-8 animate-in zoom-in-95 duration-300">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-2 tracking-tight">Activity Complete</h2>
              <p className="text-slate-600 text-[15px]">
                Summary of your work on {activityTitle || 'this activity'}
              </p>
            </div>
            
            {/* Detailed Breakdown */}
            <div className="space-y-8 mb-8">
              {/* Understanding Score */}
              <div>
                <div className="mb-4">
                  <div className="text-5xl font-semibold text-slate-900 mb-1.5 tracking-tight">{understandingScore}%</div>
                  <div className="text-sm text-slate-600 font-medium">Understanding Score</div>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-slate-900 transition-all duration-1000 ease-out rounded-full"
                    style={{ width: `${understandingScore}%` }}
                  />
                </div>
              </div>

              {/* Assessment Feedback */}
              {assessmentFeedback && (
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 tracking-wide">Feedback</h3>
                  <div className="text-[15px] text-slate-700 leading-relaxed">
                    <MarkdownRenderer content={assessmentFeedback} />
                  </div>
                </div>
              )}

              {/* Activity Statistics */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Time Spent</div>
                  <div className="text-xl font-semibold text-slate-900">{timeSpent} min</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Messages</div>
                  <div className="text-xl font-semibold text-slate-900">{messages.length}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Exchanges</div>
                  <div className="text-xl font-semibold text-slate-900">{Math.ceil(messages.length / 2)}</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                // Navigate back to student dashboard
                // The parent page will refresh activities automatically
                router.push('/student')
              }}
              className="w-full py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
