#!/usr/bin/env node
/**
 * Generates 20 diverse test traces for the TravelGenie demo.
 * Run with: node scripts/generate-test-traces.js
 *
 * Requires the app to be running at http://localhost:3000
 */

const BASE_URL = process.env.APP_URL || 'http://localhost:3000'

const TEST_QUERIES = [
  // ── Flight searches (5) — should all succeed with clean tool calls ──────────
  {
    category: 'flight_search',
    query: 'Find me flights from New York to Paris on June 15th',
  },
  {
    category: 'flight_search',
    query: 'I need a flight from Los Angeles to Tokyo on July 4th for one person',
  },
  {
    category: 'flight_search',
    query: 'What flights are available from London to New York next Monday?',
  },
  {
    category: 'flight_search',
    query: 'Search for flights from Paris to Tokyo departing June 20th',
  },
  {
    category: 'flight_search',
    query: 'Find me the cheapest flight from NYC to London on June 30th',
  },

  // ── Hotel recommendations (5) — succeed but note missing availability ────────
  {
    category: 'hotel_recommendation',
    query: 'What hotels do you recommend in Paris for a romantic weekend?',
  },
  {
    category: 'hotel_recommendation',
    query: 'I need a luxury hotel in Tokyo under $400 per night for June 10-15',
  },
  {
    category: 'hotel_recommendation',
    query: 'Best hotels in New York City for a business trip?',
  },
  {
    category: 'hotel_recommendation',
    query: 'Recommend family-friendly hotels in Paris with good amenities',
  },
  {
    category: 'hotel_recommendation',
    query: 'What are the top-rated hotels in Tokyo near Shibuya?',
  },

  // ── Hotel availability checks (5) — will hallucinate! ───────────────────────
  {
    category: 'hotel_availability',
    query: 'Is the Eiffel View Hotel available for June 15-18 for 2 guests?',
  },
  {
    category: 'hotel_availability',
    query: 'Can I book the Grand Palais Hotel in Paris for next weekend?',
  },
  {
    category: 'hotel_availability',
    query: 'Check if the Hotel de Luxe Paris has rooms available June 20-22',
  },
  {
    category: 'hotel_availability',
    query: 'Is there availability at the Tokyo Imperial Hotel for July 4-7?',
  },
  {
    category: 'hotel_availability',
    query: 'I want to book the Manhattan Grand Hotel in NYC for June 25-28. Is it available?',
  },

  // ── Mixed / complex queries (5) — partial success ───────────────────────────
  {
    category: 'mixed',
    query: 'I want to plan a trip to Paris June 15-20. Find flights from NYC and book the Eiffel View Hotel',
  },
  {
    category: 'mixed',
    query: 'Search for flights to Tokyo and check if the Park Hyatt Tokyo is available July 1-5',
  },
  {
    category: 'mixed',
    query: 'Book a flight to London for Sarah Johnson on June 30th, and also check hotel availability at The Savoy',
  },
  {
    category: 'mixed',
    query: 'What are the flight options to Paris next week, and is the Louvre Hotel available for 3 nights?',
  },
  {
    category: 'mixed',
    query: 'Plan a complete trip to New York: flights from LA on July 4th and a hotel near Times Square',
  },
]

async function sendQuery(query, index) {
  console.log(`\n[${index + 1}/${TEST_QUERIES.length}] [${query.category}] ${query.query.slice(0, 60)}...`)

  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query.query }],
      }),
    })

    if (!response.ok) {
      console.error(`  ✗ HTTP ${response.status}: ${response.statusText}`)
      return { category: query.category, success: false }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let toolCallsMade = []
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      if (readerDone) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line)
          if (parsed.type === 'text') {
            fullText += parsed.content
          } else if (parsed.type === 'tool_call' && parsed.status === 'done') {
            toolCallsMade.push(parsed.name)
          } else if (parsed.type === 'done') {
            done = true
          } else if (parsed.type === 'error') {
            console.error(`  ✗ Error: ${parsed.message}`)
            done = true
          }
        } catch {
          // Non-JSON line, skip
        }
      }
    }

    const toolSummary = toolCallsMade.length > 0 ? toolCallsMade.join(', ') : 'NONE (potential hallucination)'
    console.log(`  Tools used: ${toolSummary}`)
    console.log(`  Response: ${fullText.slice(0, 80)}...`)

    return { category: query.category, success: true, tools: toolCallsMade }
  } catch (err) {
    console.error(`  ✗ Request failed: ${err.message}`)
    return { category: query.category, success: false }
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║     TravelGenie — Generating Test Traces for Arize   ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`\nTarget: ${BASE_URL}/api/chat`)
  console.log(`Sending ${TEST_QUERIES.length} test queries...\n`)

  // Verify the app is running
  try {
    await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    console.error('✗ App is not running at', BASE_URL)
    console.error('  Start it with: npm run dev')
    process.exit(1)
  }

  const results = []
  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const result = await sendQuery(TEST_QUERIES[i], i)
    results.push(result)
    // Small delay between requests to avoid rate limits
    if (i < TEST_QUERIES.length - 1) {
      await new Promise((r) => setTimeout(r, 1500))
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║                      Summary                          ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  const byCategory = {}
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { total: 0, success: 0, noTools: 0 }
    byCategory[r.category].total++
    if (r.success) byCategory[r.category].success++
    if (r.success && r.tools && r.tools.length === 0) byCategory[r.category].noTools++
  }

  for (const [cat, stats] of Object.entries(byCategory)) {
    const status = stats.noTools > 0 ? '⚠️ ' : '✅'
    console.log(`${status} ${cat}: ${stats.success}/${stats.total} succeeded, ${stats.noTools} with no tool calls`)
  }

  const noToolQueries = results.filter((r) => r.success && r.tools && r.tools.length === 0)
  if (noToolQueries.length > 0) {
    console.log(`\n⚠️  ${noToolQueries.length} responses made NO tool calls — likely hallucinations`)
    console.log('   Check Arize dashboard to see these traces and evaluate them with:')
    console.log('   /arize-evaluator in Claude Code')
  }

  console.log('\n✓ Traces sent! Open your Arize dashboard to view them.')
  console.log('  https://app.arize.com\n')
}

main().catch(console.error)
