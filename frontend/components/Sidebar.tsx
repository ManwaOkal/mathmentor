'use client'

import { MessageSquare, BarChart3, Plus, MessageCircle, X } from 'lucide-react'

interface SidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  conversations: Array<{ id: string; title: string }>
  onNewChat: () => void
  onConversationSelect?: (id: string) => void
  onClose?: () => void
}

export default function Sidebar({ activeView, onViewChange, conversations, onNewChat, onConversationSelect, onClose }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-screen">
      {/* Logo/Header */}
      <div className="p-3 lg:p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <h1 className="text-base lg:text-lg font-semibold text-gray-900">MathMentor</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-3 lg:p-4 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full flex items-center space-x-2 px-3 lg:px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm lg:text-base"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
          <span className="ml-auto text-xs opacity-70 hidden sm:inline">⌘K</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-1">
        <button
          onClick={() => onViewChange('chat')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm lg:text-base ${
            activeView === 'chat'
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <MessageSquare className="w-5 h-5 flex-shrink-0" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => onViewChange('progress')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm lg:text-base ${
            activeView === 'progress'
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="w-5 h-5 flex-shrink-0" />
          <span>Progress</span>
        </button>

        <div className="pt-4 mt-4 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
            Conversations
          </h3>
          <div className="space-y-1 max-h-64 lg:max-h-96 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-500 px-3">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    if (onConversationSelect) {
                      onConversationSelect(conv.id)
                    }
                    onViewChange('chat')
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-left"
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs lg:text-sm truncate">{conv.title}</span>
                </button>
              ))
            )}
          </div>
          {conversations.length > 0 && (
            <button className="text-xs text-blue-600 hover:text-blue-700 px-3 mt-2">
              View All →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
