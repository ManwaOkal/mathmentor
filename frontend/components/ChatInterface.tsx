'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { api, QuestionResponse } from '@/lib/api'
import { Send, Loader2 } from 'lucide-react'
import { ChatMessageSkeleton } from './SkeletonLoader'
import React from 'react'
import dynamic from 'next/dynamic'

// Lazy load markdown renderer to reduce initial bundle size
const MarkdownRenderer = dynamic(() => import('./MarkdownRenderer'), {
  ssr: false,
  loading: () => <div className="animate-pulse">Loading...</div>
})

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  id: string
}

interface ChatInterfaceProps {
  onConversationUpdate?: (title: string) => void
}

// Highly optimized message component with lazy rendering
const MessageItem = React.memo(({ message, index, totalMessages }: { message: Message; index: number; totalMessages: number }) => {
  const [isVisible, setIsVisible] = useState(false)
  const messageRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Only render markdown for visible messages or recent messages (last 5)
    const shouldRender = index >= totalMessages - 5
    
    if (shouldRender) {
      setIsVisible(true)
      return
    }

    // Use Intersection Observer for lazy loading
    if (!observerRef.current && messageRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsVisible(true)
            observerRef.current?.disconnect()
          }
        },
        { rootMargin: '100px' } // Start loading 100px before visible
      )
      observerRef.current.observe(messageRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [index, totalMessages])

  const isUser = message.role === 'user'
  const bgClass = isUser ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
  
  return (
    <div
      ref={messageRef}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ contain: 'layout style paint' }} // CSS containment for performance
    >
      <div className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-3 sm:p-4 ${bgClass}`}>
        {isVisible ? (
          <MarkdownRenderer 
            content={message.content}
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            <p className="text-sm opacity-70">{message.content.substring(0, 100)}...</p>
          </div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if message content, role, or position changes significantly
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.role === nextProps.message.role &&
    prevProps.message.id === nextProps.message.id &&
    Math.abs(prevProps.index - nextProps.index) < 10 // Only re-render if position changed significantly
  )
})

MessageItem.displayName = 'MessageItem'

export default function ChatInterface({ onConversationUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasSavedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isInitialMountRef = useRef(true)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleNewChat = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      setMessages([])
      setInput('')
      setConversationId(null)
      hasSavedRef.current = false
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
    
    const handleLoadConversation = (e: any) => {
      const { messages: convMessages, id } = e.detail
      if (convMessages && Array.isArray(convMessages)) {
        setMessages(convMessages.map((m: any, idx: number) => ({
          ...m,
          timestamp: new Date(m.timestamp),
          id: m.id || `msg_${idx}_${Date.now()}`
        })))
        setConversationId(id)
        hasSavedRef.current = true
      }
    }
    
    window.addEventListener('new-chat', handleNewChat)
    window.addEventListener('load-conversation', handleLoadConversation as EventListener)
    
    return () => {
      window.removeEventListener('new-chat', handleNewChat)
      window.removeEventListener('load-conversation', handleLoadConversation as EventListener)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Optimized scroll with requestAnimationFrame and throttling
  const scrollToBottom = useCallback(() => {
    if (isInitialMountRef.current) return
    
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [])

  useEffect(() => {
    if (!isInitialMountRef.current && messages.length > 0) {
      // Throttle scrolling
      const timeoutId = setTimeout(scrollToBottom, 50)
      return () => clearTimeout(timeoutId)
    } else {
      isInitialMountRef.current = false
    }
  }, [messages.length, scrollToBottom])

  // Optimized save with batching and requestIdleCallback
  const saveConversation = useCallback((messagesToSave: Message[]) => {
    if (messagesToSave.length === 0) return

    const firstUserMessage = messagesToSave.find(m => m.role === 'user')
    if (!firstUserMessage) return

    const title = firstUserMessage.content.length > 50 
      ? firstUserMessage.content.substring(0, 50) + '...' 
      : firstUserMessage.content

    let currentId = conversationId
    if (!currentId) {
      currentId = `conv_${Date.now()}`
      setConversationId(currentId)
    }

    const saveToStorage = () => {
      try {
        const conversations = JSON.parse(localStorage.getItem('conversations') || '[]')
        const existingIndex = conversations.findIndex((c: any) => c.id === currentId)
        
        const conversation = {
          id: currentId,
          title: title,
          timestamp: new Date().toISOString(),
          messages: messagesToSave.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
            id: m.id
          })),
        }

        if (existingIndex >= 0) {
          conversations[existingIndex] = conversation
        } else {
          conversations.unshift(conversation)
        }

        const limitedConversations = conversations.slice(0, 50)
        localStorage.setItem('conversations', JSON.stringify(limitedConversations))
        
        if (onConversationUpdate) {
          onConversationUpdate(conversation.title)
        }
      } catch (error) {
        console.error('Error saving conversation:', error)
      }
    }

    // Use requestIdleCallback with fallback
    if ('requestIdleCallback' in window) {
      requestIdleCallback(saveToStorage, { timeout: 2000 })
    } else {
      setTimeout(saveToStorage, 0)
    }
  }, [conversationId, onConversationUpdate])

  // Debounced save with longer delay for better performance
  useEffect(() => {
    if (messages.length === 0 || !hasSavedRef.current || isInitialMountRef.current) {
      return
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveConversation(messages)
    }, 2000) // Increased to 2 seconds for better performance

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [messages, saveConversation])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedInput = input.trim()
    if (!trimmedInput || loading) return

    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
      id: `user_${Date.now()}_${Math.random()}`
    }

    // Optimistically update UI immediately
    setMessages((prev) => {
      const newMessages = [...prev, userMessage]
      if (newMessages.length === 1) {
        hasSavedRef.current = true
      }
      return newMessages
    })
    setInput('')
    setLoading(true)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const response: QuestionResponse = await api.askQuestion(trimmedInput)
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        id: `assistant_${Date.now()}_${Math.random()}`
      }

      // Batch state update
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}.`,
        timestamp: new Date(),
        id: `error_${Date.now()}`
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }, [input, loading])

  // Memoize empty state
  const emptyState = useMemo(() => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Welcome to MathMentor
        </h3>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          Ask me any math question and I'll help you understand it step-by-step.
        </p>
        <div className="text-left space-y-2">
          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Try asking:</p>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>"How do I solve quadratic equations?"</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>"Explain the Pythagorean theorem"</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>"What is a derivative?"</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  ), [])

  // Memoize message list to prevent unnecessary re-renders
  const messageList = useMemo(() => {
    return messages.map((message, index) => (
      <MessageItem 
        key={message.id} 
        message={message} 
        index={index}
        totalMessages={messages.length}
      />
    ))
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container with CSS containment */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6"
        style={{ contain: 'layout style paint', willChange: 'scroll-position' }}
      >
        {messages.length === 0 && emptyState}
        {messageList}
        {loading && <ChatMessageSkeleton />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 sm:p-4 bg-white flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex space-x-2 sm:space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a math question..."
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors min-w-[44px] sm:min-w-[56px]"
            aria-label="Send message"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  )
}
