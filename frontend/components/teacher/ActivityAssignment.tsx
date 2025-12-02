'use client'

import { useEffect, useState } from 'react'
import { Users, X, Send, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface Student {
  student_id: string
  email: string
  name?: string
  enrolled_at?: string
}

interface ActivityAssignmentProps {
  activityId: string
  classroomId: string
  onClose: () => void
  onAssigned?: () => void
}

export default function ActivityAssignment({
  activityId,
  classroomId,
  onClose,
  onAssigned
}: ActivityAssignmentProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    loadStudents()
  }, [classroomId])

  const loadStudents = async () => {
    try {
      setLoading(true)
      console.log('Loading students for classroom:', classroomId)
      const result = await api.getClassroomStudents(classroomId)
      console.log('Students API result:', result)
      
      if (result && result.students) {
        // Extract student info from enrollment data
        const studentList = result.students.map((enrollment: any) => ({
          student_id: enrollment.student_id,
          email: enrollment.users?.email || enrollment.email || 'Unknown',
          name: enrollment.users?.name || enrollment.name,
          enrolled_at: enrollment.enrolled_at
        }))
        console.log('Processed student list:', studentList)
        setStudents(studentList)
      } else {
        console.warn('No students found in result:', result)
        setStudents([])
      }
    } catch (error) {
      console.error('Error loading students:', error)
      alert(`Error loading students: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const selectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map(s => s.student_id)))
    }
  }

  const handleAssign = async () => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student')
      return
    }

    setAssigning(true)
    try {
      const result = await api.assignActivity(activityId, Array.from(selectedStudents))
      if (onAssigned) {
        onAssigned()
      }
      alert(`Activity assigned to ${result.assigned_count} student(s)`)
      onClose()
    } catch (error: any) {
      console.error('Error assigning activity:', error)
      alert(error?.message || 'Failed to assign activity')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Assign Activity to Students</span>
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-2">No students enrolled in this classroom</p>
              <p className="text-sm text-gray-400">Students need to join using the classroom join code</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                  {selectedStudents.size} of {students.length} selected
                </span>
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Student List */}
              <div className="space-y-2">
                {students.map((student) => {
                  const isSelected = selectedStudents.has(student.student_id)
                  return (
                    <div
                      key={student.student_id}
                      onClick={() => toggleStudent(student.student_id)}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {student.name || 'Student'}
                        </div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={selectedStudents.size === 0 || assigning}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{assigning ? 'Assigning...' : `Assign to ${selectedStudents.size} Student${selectedStudents.size !== 1 ? 's' : ''}`}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

