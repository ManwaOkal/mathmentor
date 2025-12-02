'use client'

import { useState } from 'react'
import { Plus, BookOpen, ChevronDown, ChevronRight, Activity, BarChart3, Settings, X } from 'lucide-react'
import { Classroom } from '@/lib/auth/types'

interface ClassroomSidebarProps {
  classrooms: Classroom[]
  activeClassroom: Classroom | null
  activeSection: 'activities' | 'analytics' | 'finetuning' | null
  onSelectClassroom: (classroom: Classroom) => void
  onSelectSection: (section: 'activities' | 'analytics' | 'finetuning') => void
  onCreateClassroom: (name: string, description?: string) => void
  loading?: boolean
  error?: string | null
  onClose?: () => void
}

export function ClassroomSidebar({
  classrooms,
  activeClassroom,
  activeSection,
  onSelectClassroom,
  onSelectSection,
  onCreateClassroom,
  loading,
  error,
  onClose
}: ClassroomSidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClassroomName, setNewClassroomName] = useState('')
  const [newClassroomDescription, setNewClassroomDescription] = useState('')
  const [expandedClassrooms, setExpandedClassrooms] = useState<Set<string>>(new Set())

  const handleCreate = () => {
    if (newClassroomName.trim()) {
      onCreateClassroom(newClassroomName.trim(), newClassroomDescription.trim() || undefined)
      setNewClassroomName('')
      setNewClassroomDescription('')
      setShowCreateModal(false)
    }
  }

  const toggleClassroomExpansion = (classroomId: string) => {
    setExpandedClassrooms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(classroomId)) {
        newSet.delete(classroomId)
      } else {
        newSet.add(classroomId)
      }
      return newSet
    })
  }

  const isClassroomExpanded = (classroomId: string) => {
    return expandedClassrooms.has(classroomId) || activeClassroom?.classroom_id === classroomId
  }

  return (
    <div className="w-80 bg-white border-r border-slate-100 flex flex-col h-screen z-30 relative">
      {/* Header */}
      <div className="p-4 sm:p-6 pb-4 sm:pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-base font-light text-slate-900 tracking-tight">My Classrooms</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-xs font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Classroom</span>
        </button>
      </div>

      {/* Classrooms List */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {loading ? (
          <div className="text-center text-slate-500 py-8 text-xs font-light">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8 px-4">
            <p className="text-xs font-medium mb-2">Error loading classrooms</p>
            <p className="text-xs text-red-500 font-light">{error}</p>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <div className="w-16 h-16 mx-auto mb-3 bg-slate-50 rounded-full flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-xs font-light">No classrooms yet</p>
            <p className="text-xs mt-1 text-slate-400 font-light">Create your first classroom to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {classrooms.map((classroom) => {
              const isActive = activeClassroom?.classroom_id === classroom.classroom_id
              const isExpanded = isClassroomExpanded(classroom.classroom_id)
              
              return (
                <div key={classroom.classroom_id} className="space-y-1">
                  <button
                    onClick={() => {
                      onSelectClassroom(classroom)
                      toggleClassroomExpansion(classroom.classroom_id)
                    }}
                    className={`w-full text-left p-2 sm:p-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-slate-50'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-light text-slate-900 mb-0.5 text-xs sm:text-sm tracking-tight truncate">{classroom.name}</div>
                        {classroom.description && (
                          <div className="text-xs text-slate-500 line-clamp-1 font-light">
                            {classroom.description}
                          </div>
                        )}
                        <div className="flex items-center mt-1 sm:mt-1.5 text-xs text-slate-400">
                          <span className="font-mono bg-slate-50 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-light">
                            {classroom.join_code}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>
                  
                  {/* Collapsible Sections */}
                  {isExpanded && isActive && (
                    <div className="ml-3 space-y-0.5 border-l border-slate-100 pl-3">
                      <button
                        onClick={() => onSelectSection('activities')}
                        className={`w-full text-left px-3 py-1.5 rounded-md transition-colors text-xs flex items-center space-x-2 font-light ${
                          activeSection === 'activities'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Activities</span>
                      </button>
                      <button
                        onClick={() => onSelectSection('analytics')}
                        className={`w-full text-left px-3 py-1.5 rounded-md transition-colors text-xs flex items-center space-x-2 font-light ${
                          activeSection === 'analytics'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Analytics</span>
                      </button>
                      <button
                        onClick={() => onSelectSection('finetuning')}
                        className={`w-full text-left px-3 py-1.5 rounded-md transition-colors text-xs flex items-center space-x-2 font-light ${
                          activeSection === 'finetuning'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Fine-Tuning</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 tracking-tight">Create New Classroom</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Classroom Name *
                </label>
                <input
                  type="text"
                  value={newClassroomName}
                  onChange={(e) => setNewClassroomName(e.target.value)}
                  placeholder="e.g., Algebra 101"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={newClassroomDescription}
                  onChange={(e) => setNewClassroomDescription(e.target.value)}
                  placeholder="Brief description of this classroom"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewClassroomName('')
                  setNewClassroomDescription('')
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newClassroomName.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm hover:shadow-md"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

