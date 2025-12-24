'use client'

import { AlertTriangle, X, Loader2 } from 'lucide-react'

interface DeleteActivityModalProps {
  isOpen: boolean
  activityTitle: string
  hasStudentAssignments?: boolean
  startedCount?: number
  isDeleting?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteActivityModal({
  isOpen,
  activityTitle,
  hasStudentAssignments,
  startedCount = 0,
  isDeleting = false,
  onConfirm,
  onCancel
}: DeleteActivityModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Delete Activity</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Are you sure you want to delete <span className="font-semibold text-slate-900">"{activityTitle}"</span>?
          </p>

          {(hasStudentAssignments || startedCount !== undefined) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    This activity has student assignments
                  </p>
                  {startedCount > 0 ? (
                    <p className="text-xs text-amber-700">
                      {startedCount} student(s) have started or completed this activity. Deleting will remove all student progress.
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700">
                      Deleting will remove all student assignments for this activity.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">
            This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              'Delete Activity'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

