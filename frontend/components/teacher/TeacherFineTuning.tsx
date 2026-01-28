'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, Save, X, MessageSquare, Target, CheckCircle, User, Lightbulb, HelpCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'
import Toast from '@/components/Toast'

interface TeachingExample {
  id: string
  assessment_criteria: string
  teacher_input: string
  desired_ai_response: string
  created_at: string
}

export default function TeacherFineTuning() {
  const { session } = useAuth()
  const [examples, setExamples] = useState<TeachingExample[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingExample, setEditingExample] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [newExample, setNewExample] = useState({
    assessment_criteria: '',
    teacher_input: '',
    desired_ai_response: ''
  })
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const templates = {
    'confused': 'Student understands the concept but is confused about the steps or process.',
    'almost_correct': 'Student is on the right track but has a small misunderstanding or calculation error.',
    'misconception': 'Student has a fundamental misconception about how the concept works.',
    'guessing': 'Student is guessing or doesn\'t know where to start.'
  }

  // Cache key for teaching examples
  const CACHE_KEY = 'teaching_examples_cache'
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  useEffect(() => {
    loadExamples()
  }, [])

  const loadExamples = async (forceRefresh: boolean = false) => {
    setLoading(true)
    try {
      const sessionToken = session?.access_token
      if (!sessionToken) {
        throw new Error('Authentication required. Please log in again.')
      }

      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        try {
          const cached = localStorage.getItem(CACHE_KEY)
          if (cached) {
            const cachedData = JSON.parse(cached)
            const cacheAge = Date.now() - (cachedData.timestamp || 0)
            if (cacheAge < CACHE_TTL) {
              // Use cached data
              const mappedExamples = (cachedData.examples || []).map((ex: any) => ({
                id: ex.id || ex.teaching_example_id || ex.example_id || ex['id'],
                assessment_criteria: ex.assessment_criteria || '',
                teacher_input: ex.teacher_input || '',
                desired_ai_response: ex.desired_ai_response || '',
                created_at: ex.created_at || ''
              }))
              setExamples([...mappedExamples])
              setLoading(false)
              // Load fresh data in background
              loadExamples(true)
              return
            }
          }
        } catch (e) {
          // Error occurred
          // Continue to fetch fresh data
        }
      }

      // Fetch fresh data from API
      const data = await api.getTeachingExamples(sessionToken)
      const mappedExamples = (data || []).map((ex: any) => ({
        id: ex.id || ex.teaching_example_id || ex.example_id || ex['id'],
        assessment_criteria: ex.assessment_criteria || '',
        teacher_input: ex.teacher_input || '',
        desired_ai_response: ex.desired_ai_response || '',
        created_at: ex.created_at || ''
      }))
      setExamples([...mappedExamples])

      // Update cache
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          examples: data || [],
          timestamp: Date.now()
        }))
      } catch (e) {
        // Error occurred
      }
    } catch (error) {
      // Error occurred
    } finally {
      setLoading(false)
    }
  }

  // Clear cache helper
  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch (e) {
      // Error occurred
    }
  }

  const handleSaveExample = async () => {
    if (!newExample.assessment_criteria?.trim() || !newExample.teacher_input?.trim() || !newExample.desired_ai_response?.trim()) {
      setToastMessage('Please fill in all required fields')
      setShowToast(true)
      return
    }

    setSaving(true)
    try {
      const sessionToken = session?.access_token
      if (!sessionToken) {
        throw new Error('Authentication required. Please log in again.')
      }

      const exampleData = {
        topic: 'Teaching Example', // Required by API but not shown in UI
        teacher_input: newExample.teacher_input.trim(),
        desired_ai_response: newExample.desired_ai_response.trim(),
        difficulty: 'intermediate', // Default
        teaching_style: 'guided', // Default
        learning_objectives: [], // Empty
        assessment_criteria: [newExample.assessment_criteria.trim()] // Single item array
      }

      if (editingExample) {
        await api.updateTeachingExample(editingExample, exampleData, sessionToken)
      } else {
        await api.createTeachingExample(exampleData, sessionToken)
      }

      // Store editing state before clearing
      const wasEditing = !!editingExample
      
      // Clear cache and reload examples
      clearCache()
      await loadExamples(true)
      setEditingExample(null)
      setShowAddForm(false)
      resetForm()
      
      setToastMessage(wasEditing ? 'Example updated successfully!' : 'Example added successfully!')
      setShowToast(true)
    } catch (error: any) {
      // Error occurred
      const errorMessage = error?.message || error?.detail || 'Failed to save example'
      setToastMessage(`Failed to save example: ${errorMessage}`)
      setShowToast(true)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setNewExample({
      assessment_criteria: '',
      teacher_input: '',
      desired_ai_response: ''
    })
    setSelectedTemplate('')
  }

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey)
    setNewExample({
      ...newExample,
      assessment_criteria: templates[templateKey as keyof typeof templates] || ''
    })
  }

  const handleDeleteExample = async (id: string) => {
    const sessionToken = session?.access_token
    if (!sessionToken) {
      setToastMessage('Authentication required. Please log in again.')
      setShowToast(true)
      return
    }
    if (!confirm('Are you sure you want to delete this teaching example?')) {
      return
    }

    try {
      const updatedExamples = examples.filter(ex => {
        const exId = ex.id || (ex as any).teaching_example_id || (ex as any).example_id
        return exId !== id
      })
      setExamples(updatedExamples)
      
      await api.deleteTeachingExample(id, sessionToken)
      
      // Clear cache and reload
      clearCache()
      setTimeout(async () => {
        await loadExamples(true)
      }, 100)
    } catch (error: any) {
      // Error occurred
      const errorMessage = error?.message || error?.detail || 'Failed to delete example'
      setToastMessage(`Failed to delete example: ${errorMessage}`)
      setShowToast(true)
      clearCache()
      await loadExamples(true)
    }
  }

  const handleEditExample = (example: TeachingExample) => {
    // Extract assessment criteria - handle both string and array formats
    const assessmentCriteria = Array.isArray(example.assessment_criteria) 
      ? example.assessment_criteria[0] || ''
      : example.assessment_criteria || ''
    
    // Set form data first
    setNewExample({
      assessment_criteria: assessmentCriteria || '',
      teacher_input: example.teacher_input || '',
      desired_ai_response: example.desired_ai_response || ''
    })
    
    // Set editing ID and show form
    setEditingExample(example.id)
    setShowAddForm(true)
    
    // Scroll to form after a brief delay to ensure it's rendered
    setTimeout(() => {
      const formElement = document.querySelector('[data-teaching-form]')
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
          <div className="mt-3 text-sm text-slate-500 font-light">Loading teaching examples...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 tracking-tight mb-1 sm:mb-2">
          Fine-Tuning
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          You're teaching the AI how to respond when students get stuck.
        </p>
      </div>

      {/* Add Example Form */}
      {showAddForm && (
        <div className="mb-6 sm:mb-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-8" data-teaching-form>
          {/* Form Header */}
          <div className="flex items-start justify-between mb-4 sm:mb-6 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight mb-1">
                {editingExample ? 'Edit Teaching Example' : 'Share a Teaching Moment'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {editingExample ? 'Update your example below' : 'Each example shows one student situation and the best way to help them.'}
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(false)
                setEditingExample(null)
                resetForm()
              }}
              className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Close form"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            </button>
          </div>

          {/* Template Selector */}
          {!editingExample && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                Quick Start (Optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                disabled={saving}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-xs sm:text-sm text-slate-900 cursor-pointer transition-all bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Choose a common situation...</option>
                <option value="confused">Student is confused</option>
                <option value="almost_correct">Student is almost correct</option>
                <option value="misconception">Student has a misconception</option>
                <option value="guessing">Student is guessing</option>
              </select>
            </div>
          )}

          {/* Form Sections - Story Format */}
          <div className="space-y-4 sm:space-y-6">
            {/* Step 1: The Student */}
            <div className="relative">
              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs sm:text-sm font-semibold mt-0.5">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900">
                    What did the student say?
                  </label>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Write it exactly how a student would say it.</p>
                </div>
              </div>
              <textarea
                value={newExample.teacher_input}
                onChange={(e) => setNewExample({ ...newExample, teacher_input: e.target.value })}
                placeholder="Why do we divide by 3 here? I don't get it."
                rows={3}
                disabled={saving}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Step 2: What's Going On */}
            <div className="relative">
              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs sm:text-sm font-semibold mt-0.5">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900">
                    What does this student understand or misunderstand?
                  </label>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Describe what you think is going on in the student's head.</p>
                </div>
              </div>
              <textarea
                value={newExample.assessment_criteria}
                onChange={(e) => setNewExample({ ...newExample, assessment_criteria: e.target.value })}
                placeholder="Student understands solving equations but doesn't know why inverse operations work."
                rows={3}
                disabled={saving}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Step 3: How to Help */}
            <div className="relative">
              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs sm:text-sm font-semibold mt-0.5">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900">
                    How should the AI explain it?
                  </label>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Write the kind of response you'd want to hear as a student.</p>
                </div>
              </div>
              <textarea
                value={newExample.desired_ai_response}
                onChange={(e) => setNewExample({ ...newExample, desired_ai_response: e.target.value })}
                placeholder="Explain using a balance analogy, step by step, and check understanding."
                rows={5}
                disabled={saving}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Reassurance */}
            <div className="pt-2 pb-3 sm:pb-4">
              <p className="text-[11px] sm:text-xs text-slate-500 italic">
                💡 Don't worry about wording—examples can be short and informal. Just describe a moment from your classroom.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-3 sm:pt-4 border-t border-slate-200">
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingExample(null)
                    resetForm()
                  }}
                  disabled={saving}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveExample}
                  disabled={!newExample.assessment_criteria?.trim() || !newExample.teacher_input?.trim() || !newExample.desired_ai_response?.trim() || saving}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      <span>{editingExample ? 'Updating...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{editingExample ? 'Update' : 'Save Example'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Examples List */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Your Teaching Examples</h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="self-start sm:self-auto w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Share Another Example</span>
            </button>
          )}
        </div>

        {examples.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 sm:mb-2">No examples yet</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 sm:mb-6 px-2">Share a moment from your classroom to teach the AI how to help students</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm hover:shadow-md"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Share Your First Example</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {examples.map((example, index) => {
              // Extract assessment criteria - handle both string and array formats
              const assessmentCriteria = Array.isArray(example.assessment_criteria) 
                ? example.assessment_criteria[0] || ''
                : example.assessment_criteria || ''
              
              return (
                <div 
                  key={example.id} 
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-slate-700 truncate">Teaching Example</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleEditExample(example)
                        }}
                        className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                        title="Edit example"
                        type="button"
                      >
                        <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteExample(example.id)
                        }}
                        className="p-1.5 sm:p-2 text-red-600 hover:text-red-700 hover:bg-white rounded-lg transition-colors"
                        title="Delete example"
                        type="button"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Content - Story Flow */}
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Step 1: What the student said */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] sm:text-xs font-semibold flex-shrink-0">
                          1
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
                          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">What the student said</h3>
                        </div>
                      </div>
                      <div className="ml-6 sm:ml-8 pl-3 sm:pl-4 border-l-2 border-slate-200">
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{example.teacher_input || 'Not specified'}</p>
                      </div>
                    </div>

                    {/* Step 2: What's going on */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] sm:text-xs font-semibold flex-shrink-0">
                          2
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
                          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">What's going on</h3>
                        </div>
                      </div>
                      <div className="ml-6 sm:ml-8 pl-3 sm:pl-4 border-l-2 border-slate-200">
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{assessmentCriteria || 'Not specified'}</p>
                      </div>
                    </div>

                    {/* Step 3: How to help */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] sm:text-xs font-semibold flex-shrink-0">
                          3
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
                          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">How to help</h3>
                        </div>
                      </div>
                      <div className="ml-6 sm:ml-8 pl-3 sm:pl-4 border-l-2 border-slate-200">
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{example.desired_ai_response || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
