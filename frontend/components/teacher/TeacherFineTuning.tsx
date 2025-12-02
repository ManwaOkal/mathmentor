'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, Save, X, MessageSquare, Target, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/useAuth'

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
  const [editingExample, setEditingExample] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newExample, setNewExample] = useState({
    assessment_criteria: '',
    teacher_input: '',
    desired_ai_response: ''
  })

  useEffect(() => {
    loadExamples()
  }, [])

  const loadExamples = async () => {
    setLoading(true)
    try {
      const sessionToken = session?.access_token
      if (!sessionToken) {
        throw new Error('Authentication required. Please log in again.')
      }
      const data = await api.getTeachingExamples(sessionToken)
      const mappedExamples = (data || []).map((ex: any) => ({
        id: ex.id || ex.teaching_example_id || ex.example_id || ex['id'],
        assessment_criteria: ex.assessment_criteria || '',
        teacher_input: ex.teacher_input || '',
        desired_ai_response: ex.desired_ai_response || '',
        created_at: ex.created_at || ''
      }))
      setExamples([...mappedExamples])
    } catch (error) {
      console.error('Error loading examples:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveExample = async () => {
    if (!newExample.assessment_criteria?.trim() || !newExample.teacher_input?.trim() || !newExample.desired_ai_response?.trim()) {
      alert('Please fill in all required fields')
      return
    }

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

      console.log('Saving example with data:', exampleData)

      if (editingExample) {
        await api.updateTeachingExample(editingExample, exampleData, sessionToken)
      } else {
        await api.createTeachingExample(exampleData, sessionToken)
      }

      await loadExamples()
      setEditingExample(null)
      setShowAddForm(false)
      resetForm()
      
      alert(editingExample ? 'Example updated!' : 'Example added!')
    } catch (error: any) {
      console.error('Error saving example:', error)
      const errorMessage = error?.message || error?.detail || 'Failed to save example'
      alert(`Failed to save example: ${errorMessage}`)
    }
  }

  const resetForm = () => {
    setNewExample({
      assessment_criteria: '',
      teacher_input: '',
      desired_ai_response: ''
    })
  }

  const handleDeleteExample = async (id: string) => {
    const sessionToken = session?.access_token
    if (!sessionToken) {
      alert('Authentication required. Please log in again.')
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
      
      setTimeout(async () => {
        await loadExamples()
      }, 100)
    } catch (error: any) {
      console.error('Error deleting example:', error)
      const errorMessage = error?.message || error?.detail || 'Failed to delete example'
      alert(`Failed to delete example: ${errorMessage}`)
      await loadExamples()
    }
  }

  const handleEditExample = (example: TeachingExample) => {
    setEditingExample(example.id)
    // Extract assessment criteria - handle both string and array formats
    const assessmentCriteria = Array.isArray(example.assessment_criteria) 
      ? example.assessment_criteria[0] || ''
      : example.assessment_criteria || ''
    
    setNewExample({
      assessment_criteria: assessmentCriteria,
      teacher_input: example.teacher_input,
      desired_ai_response: example.desired_ai_response
    })
    setShowAddForm(true)
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
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-2">
          Fine-Tuning
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Define how the AI should assess understanding and respond to student questions.
        </p>
      </div>

      {/* Add Example Form */}
      {showAddForm && (
        <div className="mb-12">
          {/* Form Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              {editingExample ? 'Edit Teaching Example' : 'Define Teaching Behavior'}
            </h2>
            <button
              onClick={() => {
                setShowAddForm(false)
                setEditingExample(null)
                resetForm()
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="Close form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Sections */}
          <div className="space-y-10">
            {/* Section 1: Assessment Criteria */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                Assessment Criteria
              </h3>
              <textarea
                value={newExample.assessment_criteria}
                onChange={(e) => setNewExample({ ...newExample, assessment_criteria: e.target.value })}
                placeholder="How to assess understanding..."
                rows={3}
                className="w-full px-3 py-3 text-sm border-b-2 border-slate-200 bg-transparent focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-400 resize-none"
              />
            </section>

            {/* Section 2: Student Difficulty / Question */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                Student Difficulty / Question
              </h3>
              <textarea
                value={newExample.teacher_input}
                onChange={(e) => setNewExample({ ...newExample, teacher_input: e.target.value })}
                placeholder="What the student says or asks..."
                rows={4}
                className="w-full px-3 py-3 text-sm border-b-2 border-slate-200 bg-transparent focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-400 resize-none"
              />
            </section>

            {/* Section 3: Ideal Teaching Response */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                Ideal Teaching Response
              </h3>
              <textarea
                value={newExample.desired_ai_response}
                onChange={(e) => setNewExample({ ...newExample, desired_ai_response: e.target.value })}
                placeholder="How should the AI respond to teach effectively?"
                rows={6}
                className="w-full px-3 py-3 text-sm border-b-2 border-slate-200 bg-transparent focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-400 resize-none"
              />
            </section>

            {/* Actions */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingExample(null)
                    resetForm()
                  }}
                  className="px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveExample}
                  disabled={!newExample.assessment_criteria?.trim() || !newExample.teacher_input?.trim() || !newExample.desired_ai_response?.trim()}
                  className="px-6 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingExample ? 'Update' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Examples List */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Teaching Behaviors</h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Example</span>
            </button>
          )}
        </div>

        {examples.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <Target className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No teaching behaviors defined</h3>
            <p className="text-sm text-slate-600 mb-8">Define how you want the AI to assess and respond to students</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Example</span>
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {examples.map((example, index) => {
              // Extract assessment criteria - handle both string and array formats
              const assessmentCriteria = Array.isArray(example.assessment_criteria) 
                ? example.assessment_criteria[0] || ''
                : example.assessment_criteria || ''
              
              return (
                <div 
                  key={example.id} 
                  className={`py-8 ${index !== examples.length - 1 ? 'border-b border-slate-200' : ''} hover:bg-slate-50/50 transition-colors`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="flex-1 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <div className="text-xs text-slate-500 mb-3 flex items-center font-medium uppercase tracking-wider">
                            <Target className="w-3.5 h-3.5 mr-1.5" /> Assessment Criteria
                          </div>
                          <div className="bg-slate-50 p-3 rounded-md">
                            <div className="text-sm text-slate-700 leading-relaxed">{assessmentCriteria || 'Not specified'}</div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-slate-500 mb-3 flex items-center font-medium uppercase tracking-wider">
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Student Difficulty / Question
                          </div>
                          <div className="bg-slate-50 p-3 rounded-md">
                            <div className="text-sm text-slate-700 leading-relaxed">{example.teacher_input || 'Not specified'}</div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-slate-500 mb-3 flex items-center font-medium uppercase tracking-wider">
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Ideal Teaching Response
                          </div>
                          <div className="bg-slate-50 p-3 rounded-md">
                            <div className="text-sm text-slate-700 leading-relaxed">{example.desired_ai_response || 'Not specified'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 lg:flex-col lg:ml-6">
                      <button
                        onClick={() => handleEditExample(example)}
                        className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteExample(example.id)
                        }}
                        className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
