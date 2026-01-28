'use client'

import { useState, useEffect } from 'react'
import { Plus, BookOpen, ChevronDown, ChevronRight, Activity, BarChart3, Settings } from 'lucide-react'
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

  // Listen for custom event to open create modal
  useEffect(() => {
    const handleOpenCreate = () => {
      setShowCreateModal(true)
    }
    window.addEventListener('openCreateClassroom' as any, handleOpenCreate as EventListener)
    return () => {
      window.removeEventListener('openCreateClassroom' as any, handleOpenCreate as EventListener)
    }
  }, [])

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
    <aside className="w-full lg:w-[420px] bg-white flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10 backdrop-blur-sm bg-white/95 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide lg:block hidden mb-3">
          My Classrooms
        </h3>
        {/* New Classroom button - hidden on mobile, shown on desktop */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="hidden lg:flex w-full items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Classroom</span>
        </button>
      </div>

      {/* Classrooms List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600 px-4">
            <p className="text-sm font-medium mb-2">Error loading classrooms</p>
            <p className="text-xs text-red-500">{error}</p>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium">No classrooms yet</p>
            <p className="text-xs mt-1 text-slate-400">Create your first classroom to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classrooms.map((classroom) => {
              const isActive = activeClassroom?.classroom_id === classroom.classroom_id
              const isExpanded = isClassroomExpanded(classroom.classroom_id)
              
              return (
                <div 
                  key={classroom.classroom_id} 
                  className="rounded-lg bg-white transition-all duration-200 overflow-hidden group shadow-md hover:shadow-lg"
                >
                  <button
                    onClick={() => {
                      onSelectClassroom(classroom)
                      toggleClassroomExpansion(classroom.classroom_id)
                    }}
                    className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 transition-colors duration-200 text-left"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50 flex-shrink-0">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                          {classroom.name}
                        </div>
                        {classroom.description && (
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {classroom.description}
                          </div>
                        )}
                        <div className="flex items-center mt-1 text-xs text-slate-400">
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                            {classroom.join_code}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2 sm:ml-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 transition-transform duration-200" />
                      )}
                    </div>
                  </button>
                  
                  {/* Collapsible Sections */}
                  {isExpanded && isActive && (
                    <div className="px-2 sm:px-4 pb-2 sm:pb-4 bg-slate-50/50">
                      <div className="pt-2 space-y-1.5 sm:space-y-2">
                        <button
                          onClick={() => {
                            onSelectSection('activities')
                            // Close sidebar on mobile after selecting section
                            if (onClose) {
                              onClose()
                            }
                          }}
                          className={`w-full text-left px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center space-x-2 ${
                            activeSection === 'activities'
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">Activities</span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectSection('finetuning')
                            // Close sidebar on mobile after selecting section
                            if (onClose) {
                              onClose()
                            }
                          }}
                          className={`w-full text-left px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center space-x-2 ${
                            activeSection === 'finetuning'
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">Fine-Tuning</span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectSection('analytics')
                            // Close sidebar on mobile after selecting section
                            if (onClose) {
                              onClose()
                            }
                          }}
                          className={`w-full text-left px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center space-x-2 ${
                            activeSection === 'analytics'
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">Analytics</span>
                        </button>
                      </div>
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
    </aside>
  )
}

