import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { toolDefinitions, executeTool } from '@/lib/tools'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are TravelGenie, an expert AI travel assistant. You help users search for flights, check availability, book travel, and plan their trips. Be helpful, specific, and always use your tools to get accurate information. Never make up flight or hotel information — always use your tools.

When helping with hotels, note that you can provide recommendations and pricing information, but you currently cannot verify real-time room availability. Be transparent about this limitation — do not guess or assume a hotel is available if you haven't confirmed it with a tool.

Always be warm, enthusiastic, and professional. Format responses clearly with relevant details like prices, times, and confirmation numbers when available.`

export interface Message {
  role: 'user' | 'assistant'
  content: string | Anthropic.ContentBlock[]
}

const MAX_ITERATIONS = 10

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages } = body as { messages: { role: 'user' | 'assistant'; content: string }[] }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (data: object) => {
          const line = JSON.stringify(data) + '\n'
          controller.enqueue(encoder.encode(line))
        }

        try {
          // Build the conversation history for the agentic loop
          // We need to maintain a mutable copy to append tool results
          const conversationHistory: Anthropic.MessageParam[] = messages.map((m) => ({
            role: m.role,
            content: m.content,
          }))

          let iterations = 0

          // ── Agentic Loop ──────────────────────────────────────────────────
          while (iterations < MAX_ITERATIONS) {
            iterations++

            const response = await anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 4096,
              system: SYSTEM_PROMPT,
              tools: toolDefinitions,
              messages: conversationHistory,
            })

            // Stream text content blocks immediately
            for (const block of response.content) {
              if (block.type === 'text' && block.text) {
                sendChunk({ type: 'text', content: block.text })
              }
            }

            // If Claude is done, exit the loop
            if (response.stop_reason === 'end_turn') {
              break
            }

            // If Claude wants to use tools, process them
            if (response.stop_reason === 'tool_use') {
              const toolUseBlocks = response.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
              )

              if (toolUseBlocks.length === 0) {
                break
              }

              // Add Claude's response (with tool_use blocks) to history
              conversationHistory.push({
                role: 'assistant',
                content: response.content,
              })

              // Execute all tools and build the tool_result message
              const toolResults: Anthropic.ToolResultBlockParam[] = []

              for (const toolUse of toolUseBlocks) {
                const toolInput = toolUse.input as Record<string, unknown>

                // Notify the client that a tool is being called
                sendChunk({
                  type: 'tool_call',
                  id: toolUse.id,
                  name: toolUse.name,
                  input: toolInput,
                  status: 'running',
                })

                let toolResult: string
                try {
                  toolResult = await executeTool(toolUse.name, toolInput)
                } catch (err) {
                  toolResult = JSON.stringify({
                    success: false,
                    error: err instanceof Error ? err.message : 'Tool execution failed',
                  })
                }

                // Parse result for display
                let parsedResult: unknown
                try {
                  parsedResult = JSON.parse(toolResult)
                } catch {
                  parsedResult = toolResult
                }

                // Notify client with the result
                sendChunk({
                  type: 'tool_call',
                  id: toolUse.id,
                  name: toolUse.name,
                  input: toolInput,
                  result: parsedResult,
                  status: 'done',
                })

                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: toolResult,
                })
              }

              // Add all tool results to history in a single user message
              conversationHistory.push({
                role: 'user',
                content: toolResults,
              })

              // Continue the loop — Claude will now process the tool results
              continue
            }

            // Any other stop reason (max_tokens, stop_sequence, etc.) — exit
            break
          }

          if (iterations >= MAX_ITERATIONS) {
            sendChunk({
              type: 'text',
              content:
                '\n\n*Note: Reached maximum processing steps. Please try a simpler request.*',
            })
          }

          sendChunk({ type: 'done' })
        } catch (err) {
          console.error('Agentic loop error:', err)
          sendChunk({
            type: 'error',
            message: err instanceof Error ? err.message : 'An unexpected error occurred',
          })
          sendChunk({ type: 'done' })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('Route handler error:', err)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
