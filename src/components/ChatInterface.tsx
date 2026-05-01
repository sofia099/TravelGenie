'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import Message, { ToolCall } from './Message'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

interface StreamChunk {
  type: 'text' | 'tool_call' | 'done' | 'error'
  content?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  result?: unknown
  status?: 'running' | 'done'
  message?: string
}

const SUGGESTED_PROMPTS = [
  {
    emoji: '✈️',
    text: 'Find me flights from New York to Paris next week',
  },
  {
    emoji: '🏨',
    text: 'What hotels do you recommend in Tokyo?',
  },
  {
    emoji: '📋',
    text: 'Book a flight to London for John Smith',
  },
  {
    emoji: '🔍',
    text: 'Is the Grand Palais Hotel available in Paris this weekend?',
  },
]

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
  }, [input])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      setInput('')

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
      }

      // Build history for the API (all previous messages + new user message)
      const historyForApi = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: trimmed },
      ]

      setMessages((prev) => [...prev, userMessage])

      // Create a placeholder assistant message
      const assistantId = generateId()
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          toolCalls: [],
          isStreaming: true,
        },
      ])

      setIsLoading(true)
      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: historyForApi }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let accumulatedText = ''
        const toolCallsMap = new Map<string, ToolCall>()
        const toolCallOrder: string[] = []

        const getOrderedToolCalls = () =>
          toolCallOrder.map((id) => toolCallsMap.get(id)!).filter(Boolean)

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? '' // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine) continue

            let chunk: StreamChunk
            try {
              chunk = JSON.parse(trimmedLine)
            } catch {
              console.warn('Failed to parse chunk:', trimmedLine)
              continue
            }

            if (chunk.type === 'text' && chunk.content) {
              accumulatedText += chunk.content
              const currentText = accumulatedText
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: currentText, toolCalls: getOrderedToolCalls() }
                    : m
                )
              )
            } else if (chunk.type === 'tool_call') {
              const toolId = chunk.id ?? chunk.name ?? generateId()

              if (chunk.status === 'running') {
                const newTool: ToolCall = {
                  id: toolId,
                  name: chunk.name!,
                  input: chunk.input ?? {},
                  status: 'running',
                }
                toolCallsMap.set(toolId, newTool)
                if (!toolCallOrder.includes(toolId)) {
                  toolCallOrder.push(toolId)
                }
              } else if (chunk.status === 'done') {
                const existing = toolCallsMap.get(toolId)
                if (existing) {
                  toolCallsMap.set(toolId, {
                    ...existing,
                    result: chunk.result,
                    status: 'done',
                  })
                }
              }

              const currentTools = getOrderedToolCalls()
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: accumulatedText, toolCalls: currentTools }
                    : m
                )
              )
            } else if (chunk.type === 'done') {
              // Finalize the message
              const finalTools = getOrderedToolCalls()
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: accumulatedText,
                        toolCalls: finalTools,
                        isStreaming: false,
                      }
                    : m
                )
              )
            } else if (chunk.type === 'error') {
              const errorText =
                accumulatedText +
                `\n\n*Error: ${chunk.message ?? 'Something went wrong. Please try again.'}*`
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: errorText, isStreaming: false }
                    : m
                )
              )
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + '\n\n*Response cancelled.*', isStreaming: false }
                : m
            )
          )
        } else {
          const errMsg = err instanceof Error ? err.message : 'Unknown error'
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: `Sorry, I encountered an error: ${errMsg}. Please check your API key and try again.`,
                    isStreaming: false,
                  }
                : m
            )
          )
        }
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
        textareaRef.current?.focus()
      }
    },
    [messages, isLoading]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(input)
      }
    },
    [input, sendMessage]
  )

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-700/50 bg-[#0f172a]/95 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/50 text-xl">
              ✈️
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">TravelGenie</h1>
              <p className="text-xs text-slate-400">Your AI Travel Companion</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              AI Powered
            </span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {isEmpty ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-220px)] text-center animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-4xl shadow-2xl shadow-indigo-900/50 mb-6">
                ✈️
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                Welcome to TravelGenie
              </h2>
              <p className="text-slate-400 mb-10 max-w-md leading-relaxed">
                Your AI-powered travel assistant. Search flights, discover hotels, and plan your
                perfect trip — all with a simple conversation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt.text)}
                    className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800 text-left transition-all duration-200 group"
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{prompt.emoji}</span>
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                      {prompt.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message List */
            <div className="space-y-6 pb-2">
              {messages.map((msg) => (
                <Message
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  toolCalls={msg.toolCalls}
                  isStreaming={msg.isStreaming}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Bar */}
      <div className="flex-shrink-0 border-t border-slate-700/50 bg-[#0f172a]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about flights, hotels, or travel plans..."
                disabled={isLoading}
                rows={1}
                className={`
                  w-full resize-none rounded-2xl px-4 py-3.5 pr-12
                  bg-slate-800/80 border border-slate-700/50
                  text-white placeholder-slate-500 text-sm leading-relaxed
                  focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-all duration-200 custom-scrollbar
                `}
                style={{ maxHeight: '160px' }}
              />
              <div className="absolute right-3 bottom-3 text-xs text-slate-600 pointer-events-none">
                ↵
              </div>
            </div>

            {isLoading ? (
              <button
                onClick={handleStop}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-red-600/80 hover:bg-red-600 border border-red-500/50 flex items-center justify-center transition-all duration-200 shadow-lg"
                title="Stop generating"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className={`
                  flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
                  transition-all duration-200 shadow-lg
                  ${input.trim()
                    ? 'bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 shadow-indigo-900/50 cursor-pointer'
                    : 'bg-slate-700/50 cursor-not-allowed opacity-50'
                  }
                `}
                title="Send message (Enter)"
              >
                <svg
                  className="w-5 h-5 text-white rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
