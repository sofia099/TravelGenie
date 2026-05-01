'use client'

import { useState } from 'react'

export interface ToolCall {
  id?: string
  name: string
  input: Record<string, unknown>
  result?: unknown
  status?: 'running' | 'done'
}

export interface MessageProps {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

const TOOL_LABELS: Record<string, string> = {
  search_flights: 'Search Flights',
  get_seat_availability: 'Check Seat Availability',
  book_flight: 'Book Flight',
  get_hotel_recommendations: 'Get Hotel Recommendations',
}

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isRunning = toolCall.status === 'running'
  const label = TOOL_LABELS[toolCall.name] ?? toolCall.name

  return (
    <div className="mt-2 rounded-xl border border-indigo-500/30 bg-indigo-950/40 overflow-hidden">
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-indigo-900/30 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base" role="img" aria-label="tool">
            {isRunning ? '⏳' : '⚙️'}
          </span>
          <span className="text-sm font-semibold text-indigo-300">{label}</span>
          {isRunning && (
            <span className="flex gap-1 items-center ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
            </span>
          )}
          {!isRunning && toolCall.result !== undefined && (
            <span className="text-xs text-green-400 font-medium">✓ Complete</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-indigo-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-indigo-500/20">
          <div className="mt-3">
            <p className="text-xs font-semibold text-indigo-400/70 uppercase tracking-wider mb-1.5">
              Input
            </p>
            <pre className="text-xs text-slate-300 bg-slate-900/60 rounded-lg p-3 overflow-x-auto leading-relaxed font-mono">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <p className="text-xs font-semibold text-indigo-400/70 uppercase tracking-wider mb-1.5">
                Result
              </p>
              <pre className="text-xs text-slate-300 bg-slate-900/60 rounded-lg p-3 overflow-x-auto leading-relaxed font-mono max-h-64">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
    </span>
  )
}

// Simple markdown-like text renderer for assistant messages
function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-base font-bold text-white mt-3 mb-1">
              {line.slice(4)}
            </h3>
          )
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-lg font-bold text-white mt-3 mb-1">
              {line.slice(3)}
            </h2>
          )
        }
        if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
          return (
            <p key={i} className="font-semibold text-white">
              {line.slice(2, -2)}
            </p>
          )
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 text-slate-200">
              <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
              <span className="leading-relaxed">{line.slice(2)}</span>
            </div>
          )
        }
        if (line.trim() === '') {
          return <div key={i} className="h-1" />
        }
        // Inline bold handling
        const boldPattern = /\*\*(.*?)\*\*/g
        if (boldPattern.test(line)) {
          const parts = line.split(/\*\*(.*?)\*\*/g)
          return (
            <p key={i} className="text-slate-200 leading-relaxed">
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <strong key={j} className="font-semibold text-white">
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </p>
          )
        }
        return (
          <p key={i} className="text-slate-200 leading-relaxed">
            {line}
          </p>
        )
      })}
    </div>
  )
}

export default function Message({ role, content, toolCalls, isStreaming }: MessageProps) {
  const isUser = role === 'user'

  return (
    <div
      className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg
          ${isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40'
            : 'bg-gradient-to-br from-indigo-600 to-violet-700 shadow-lg shadow-indigo-900/40'
          }
        `}
      >
        {isUser ? '👤' : '✈️'}
      </div>

      {/* Message Bubble + Tool Calls */}
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Main bubble */}
        <div
          className={`
            px-4 py-3 shadow-lg
            ${isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-br-sm shadow-blue-900/30'
              : 'bg-[#1e293b] text-slate-200 rounded-2xl rounded-bl-sm shadow-slate-900/50 border border-slate-700/50'
            }
          `}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed text-white">{content}</p>
          ) : (
            <div className="text-sm">
              {content ? (
                <FormattedText text={content} />
              ) : isStreaming && (!toolCalls || toolCalls.every((t) => t.status === 'done')) ? (
                <ThinkingDots />
              ) : null}
              {isStreaming && content && (
                <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          )}
        </div>

        {/* Tool calls (assistant only) */}
        {!isUser && toolCalls && toolCalls.length > 0 && (
          <div className="w-full space-y-1.5">
            {toolCalls.map((tc, i) => (
              <ToolCallCard key={tc.id ?? i} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
