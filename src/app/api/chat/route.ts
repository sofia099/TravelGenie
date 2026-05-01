import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SpanStatusCode } from '@opentelemetry/api'
import {
  SemanticConventions,
  OpenInferenceSpanKind,
  INPUT_VALUE,
  OUTPUT_VALUE,
} from '@arizeai/openinference-semantic-conventions'
import { toolDefinitions, executeTool } from '@/lib/tools'
import { tracer } from '@/lib/tracing'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are TravelGenie, an expert AI travel assistant. You help users search for flights, check availability, book travel, and plan their trips. Be helpful, specific, and always use your tools to get accurate information. Never make up flight or hotel information — always use your tools.

When helping with hotels, note that you can provide recommendations and pricing information, but you currently cannot verify real-time room availability. Be transparent about this limitation — do not guess or assume a hotel is available if you haven't confirmed it with a tool.

Always be warm, enthusiastic, and professional. Format responses clearly with relevant details like prices, times, and confirmation numbers when available.`

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
    const lastUserMessage = messages[messages.length - 1]?.content || ''

    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (data: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
        }

        // ── CHAIN span wraps the entire agent turn ────────────────────────
        await tracer.startActiveSpan('chat-agent', async (chainSpan) => {
          chainSpan.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKind.CHAIN)
          chainSpan.setAttribute(INPUT_VALUE, lastUserMessage)

          let fullText = ''

          try {
            const conversationHistory: Anthropic.MessageParam[] = messages.map((m) => ({
              role: m.role,
              content: m.content,
            }))

            let iterations = 0

            // ── Agentic Loop ──────────────────────────────────────────────
            while (iterations < MAX_ITERATIONS) {
              iterations++

              const response = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 4096,
                system: SYSTEM_PROMPT,
                tools: toolDefinitions,
                messages: conversationHistory,
              })

              for (const block of response.content) {
                if (block.type === 'text' && block.text) {
                  fullText += block.text
                  sendChunk({ type: 'text', content: block.text })
                }
              }

              if (response.stop_reason === 'end_turn') {
                break
              }

              if (response.stop_reason === 'tool_use') {
                const toolUseBlocks = response.content.filter(
                  (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
                )

                if (toolUseBlocks.length === 0) break

                conversationHistory.push({ role: 'assistant', content: response.content })

                const toolResults: Anthropic.ToolResultBlockParam[] = []

                for (const toolUse of toolUseBlocks) {
                  const toolInput = toolUse.input as Record<string, unknown>

                  sendChunk({ type: 'tool_call', id: toolUse.id, name: toolUse.name, input: toolInput, status: 'running' })

                  // ── TOOL span wraps each tool execution ───────────────
                  const toolResult = await tracer.startActiveSpan(toolUse.name, async (toolSpan) => {
                    toolSpan.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKind.TOOL)
                    toolSpan.setAttribute(INPUT_VALUE, JSON.stringify(toolInput))

                    let result: string
                    try {
                      result = await executeTool(toolUse.name, toolInput)
                      toolSpan.setAttribute(OUTPUT_VALUE, result)
                      toolSpan.setStatus({ code: SpanStatusCode.OK })
                    } catch (err) {
                      result = JSON.stringify({
                        success: false,
                        error: err instanceof Error ? err.message : 'Tool execution failed',
                      })
                      toolSpan.setAttribute(OUTPUT_VALUE, result)
                      toolSpan.setStatus({ code: SpanStatusCode.ERROR })
                    } finally {
                      toolSpan.end()
                    }
                    return result
                  })

                  let parsedResult: unknown
                  try { parsedResult = JSON.parse(toolResult) } catch { parsedResult = toolResult }

                  sendChunk({ type: 'tool_call', id: toolUse.id, name: toolUse.name, input: toolInput, result: parsedResult, status: 'done' })

                  toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: toolResult })
                }

                conversationHistory.push({ role: 'user', content: toolResults })
                continue
              }

              break
            }

            if (iterations >= MAX_ITERATIONS) {
              const note = '\n\n*Note: Reached maximum processing steps. Please try a simpler request.*'
              fullText += note
              sendChunk({ type: 'text', content: note })
            }

            chainSpan.setAttribute(OUTPUT_VALUE, fullText)
            chainSpan.setStatus({ code: SpanStatusCode.OK })
            sendChunk({ type: 'done' })
          } catch (err) {
            console.error('Agentic loop error:', err)
            chainSpan.setStatus({ code: SpanStatusCode.ERROR })
            if (err instanceof Error) chainSpan.recordException(err)
            sendChunk({ type: 'error', message: err instanceof Error ? err.message : 'An unexpected error occurred' })
            sendChunk({ type: 'done' })
          } finally {
            chainSpan.end()
            controller.close()
          }
        })
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
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
