# TravelGenie Demo: Finding & Fixing AI Bugs with Arize

---

## The Story

It's been one week since TravelGenie went live. The launch went smoothly — flights are working, the UI looks great, users are booking. But over the past three days, your support inbox has been filling up with a strange pattern of complaints: users say the assistant told them a hotel was available, they showed up, and there was no room. One user in Paris. Two in Rome. Another in Barcelona. The team is baffled. The code looks fine. Unit tests pass. Nobody can reproduce it consistently in dev.

The problem is invisible in logs because the assistant isn't *crashing* — it's *confidently wrong*. It's not throwing exceptions or returning errors. It's doing what language models do when they don't have the right tools: filling in the gaps with plausible-sounding fiction. The agent doesn't have a `check_hotel_availability` tool, so when a user asks "Is the Eiffel View Hotel available June 15-18?", Claude does its best — and its best, in this case, is a hallucination. Today, we're going to find it, prove it, fix it, and ship the fix with complete confidence. All using Arize.

---

## Demo Overview

This demo walks through the full AI observability lifecycle — from a broken production app to a validated fix — in under an hour.

```
🏗️ Build → 🔭 Instrument → 🔥 Break It → 📊 Evaluate → 🔍 Diagnose → 🌿 Branch → 🗂️ Dataset → 🧪 Experiment → 🚀 Ship
```

| Stage | What Happens | Time |
|---|---|---|
| 🏗️ **Build** | See the app running, witness the bug | 5 min |
| 🔭 **Instrument** | Add Arize tracing with one Claude Code skill | 10 min |
| 🔥 **Break It** | Generate 20 traces across all query types | 5 min |
| 📊 **Evaluate** | Discover existing LLM provider, then create LLM-as-judge evaluators | 10 min |
| 🔍 **Diagnose** | Analyze scores with the Tool Calling evaluator, find the root cause | 10 min |
| 🌿 **Branch** | Create a git worktree for parallel development | 10 min |
| 🗂️ **Dataset** | Export spans from production into a reusable dataset | 5 min |
| 🧪 **Experiment** | Validate the fix with Arize Experiments before shipping | 15 min |
| 🚀 **Ship** | Open a PR backed by experiment data | 5 min |

**Total: ~75 minutes** (or trim stages to fit your slot)

---

## Prerequisites

Before you start, make sure you have:

- **Node.js 18+** and **npm** — `node --version` should return 18 or higher
- **Anthropic API key** — from [console.anthropic.com](https://console.anthropic.com)
- **Arize account** — free tier works; sign up at [app.arize.com](https://app.arize.com)
- **GitHub account** — for the worktree and PR stages
- **gh CLI** — `brew install gh` on macOS, then `gh auth login`
- **Claude Code CLI** — the tool that powers the Arize skills; install from [claude.ai/code](https://claude.ai/code)

Verify everything is ready:

```bash
node --version       # Should be 18+
gh --version         # Should return a version number
claude --version     # Should return a version number
```

---

## Stage 1: See the Bug in Action (5 min)

### Start the App

```bash
cd TravelGenie
npm install
cp .env.example .env.local
# Open .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo These Queries in Order

Run these queries in the chat interface. The first two work perfectly — set up the contrast before showing the failure.

**Query 1 — Flight Search (works perfectly):**
> "Find me flights from NYC to Paris on June 15th for 2 passengers"

Watch the agent call `search_flights`, get structured results, and return a nicely formatted list of options with prices and times. The tool call is visible in the UI. Everything is working exactly as designed.

**Query 2 — Hotel Recommendations (works perfectly):**
> "What hotels do you recommend in Paris for a romantic trip?"

The agent calls `get_hotel_recommendations`, returns a curated list with ratings, neighborhoods, and price ranges. Again, transparent tool use, accurate results.

**Query 3 — Hotel Availability Check (this is where it breaks):**
> "Is the Eiffel View Hotel available for June 15-18? We're a party of 2."

Watch carefully. The agent responds with something like:

> *"Great news! The Eiffel View Hotel has rooms available for June 15-18 for 2 guests. The Deluxe Room with Eiffel Tower view is available at €285/night. I'd recommend booking soon as availability is limited during peak summer season!"*

**This is a hallucination.** No tool was called. No availability was checked. The agent invented that response because it has no `check_hotel_availability` tool — so it did what a language model does: it inferred a plausible answer and stated it as fact. Your users booked based on this. Some of them got turned away at the front desk.

The scary part? It sounds completely convincing. Without observability, you'd never know.

---

## Stage 2: Instrument the App with Arize (10 min)

Right now, our app is a black box. Requests go in, responses come out, and we have no visibility into what the agent is doing between those two points. We're going to change that in the next 10 minutes without writing a single line of boilerplate.

Open a new Claude Code session in the `TravelGenie` directory:

```bash
cd TravelGenie
claude
```

Inside the Claude Code session, invoke the Arize instrumentation skill:

```bash
/arize-instrumentation
```

### What the Skill Does

The `arize-instrumentation` skill follows a two-phase flow:

**Phase 1 — Analysis (read-only):**
The skill scans your codebase and identifies:
- Where the Anthropic SDK is imported and initialized
- Every location where `client.messages.create()` is called
- The streaming configuration in your API route
- Which tools are being registered and executed
- Whether any tracing is already present

It reports its findings before making any changes, so you can review the plan before committing.

**Phase 2 — Implementation (after your confirmation):**
Once you approve, the skill makes the following changes:

1. **Installs dependencies:**
   ```bash
   npm install @arizeai/openinference-instrumentation-anthropic @opentelemetry/sdk-node @opentelemetry/exporter-otlp-http
   ```

2. **Creates `src/lib/arize.ts`** — the OTEL setup file:
   ```typescript
   import { NodeSDK } from '@opentelemetry/sdk-node';
   import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
   import { AnthropicInstrumentation } from '@arizeai/openinference-instrumentation-anthropic';

   const exporter = new OTLPTraceExporter({
     url: 'https://otlp.arize.com/v1/traces',
     headers: {
       'api_key': process.env.ARIZE_API_KEY!,
       'space_id': process.env.ARIZE_SPACE_ID!,
       'model_id': process.env.ARIZE_MODEL_ID || 'travelgenie-assistant',
     },
   });

   export const sdk = new NodeSDK({
     traceExporter: exporter,
     instrumentations: [new AnthropicInstrumentation()],
   });

   sdk.start();
   ```

3. **Updates `src/app/api/chat/route.ts`** to import the OTEL setup at the top (before the Anthropic client initializes), and adds manual `CHAIN` and `TOOL` spans around the agentic loop so each tool call is individually traced.

4. **Updates `.env.example`** with the three new Arize variables.

The skill explains each change as it makes it. You can see exactly what's being instrumented and why.

### Verify Instrumentation

After the skill completes, restart the dev server:

```bash
npm run dev
```

Send one test query through the UI. Then open [app.arize.com](https://app.arize.com) and navigate to your project. Within 30 seconds, you should see the first trace appear — a full tree showing the LLM call, the tool invocations, input/output tokens, and latency at every step.

---

## Stage 3: Generate Traces (5 min)

One trace is interesting. Twenty traces across different query types is a dataset. We need enough volume to make the evaluators meaningful.

```bash
# From the TravelGenie directory
node scripts/generate-test-traces.js
```

This script fires 20 queries against your local dev server in sequence, with a short delay between each to avoid rate limiting. Here's what it covers:

```javascript
const testQueries = [
  // Flight searches — these will succeed (5 queries)
  "Find me flights from New York to Paris on June 15th for 2 passengers",
  "What are the cheapest flights from London to Tokyo next month?",
  "Show me business class options from San Francisco to Sydney in July",
  "Are there any direct flights from Chicago to Rome on July 4th?",
  "What's the fastest flight from Miami to Cancun this weekend?",

  // Hotel recommendations — these will partially succeed (5 queries)
  "What are the best boutique hotels in Paris near the Louvre?",
  "Recommend luxury hotels in Tokyo for a honeymoon",
  "Find family-friendly hotels in Barcelona with a pool",
  "What are the top-rated hotels in Rome for under $200/night?",
  "Suggest hotels in Amsterdam near the Anne Frank House",

  // Hotel availability checks — these will FAIL and hallucinate (5 queries)
  "Is the Eiffel View Hotel available for June 15-18 for 2 guests?",
  "Can I book the Hotel Colosseum in Rome for July 4-8, party of 3?",
  "Check if the Marina Bay Sands has ocean view rooms for August 10-15",
  "Is the Sagrada Familia Suites available the last weekend of June?",
  "Do you have availability at the Amsterdam Canal House for June 20-23?",

  // Mixed queries — these will partially fail (5 queries)
  "Find me flights to Paris AND check if Hotel Le Marais is available June 15-18",
  "Search for flights to Tokyo and recommend hotels near Shibuya for next month",
  "I want to go to Rome in July — find flights from NYC and check the Hotel Forum availability",
  "Plan a Barcelona trip: flights from London on July 1st and check if Hotel Arts has rooms",
  "Help me book a Paris trip — flights from Boston June 14th and availability at the Ritz",
];
```

Watch the terminal output as the script runs. You'll see flight queries complete cleanly and hotel availability queries return confident but unverified responses. The traces are being uploaded to Arize in real time.

After the script finishes, go to [app.arize.com](https://app.arize.com). You should see 20 new traces in your project. Click into a hotel availability trace and look at the spans — notice that there is **no tool call span** for the availability check. The agent went straight from receiving the question to generating a response. That's our smoking gun, but we need to prove it at scale.

---

## Stage 4: Add Evaluators with Arize (10 min)

We can see the issue by eyeballing one trace. But we need to *quantify* it across all 20 traces, and we need language a product manager or executive can understand. That's what evaluators are for.

Before creating evaluators we need a judge model. Rather than configuring a new one from scratch, we'll check what LLM providers are already connected to the Arize space.

### Step 4a — Discover Your Existing LLM Provider

Back in your Claude Code session:

```bash
/arize-ai-provider-integration
```

The skill lists every LLM integration registered in your space. You'll see output like:

```
Found 1 AI provider integration(s):

ID:       int_abc123
Name:     My OpenAI Integration
Provider: openai
Models:   gpt-4o, gpt-4o-mini
Status:   active
```

Note the **integration ID** and the **model name** you want to use for judging — a fast, cheap model (e.g. `gpt-4o-mini`) is ideal for eval workloads. You'll reference both when creating each evaluator below.

> **If the list is empty:** run `/arize-ai-provider-integration` and follow the prompts to connect a provider. The skill supports OpenAI, Anthropic, Azure OpenAI, AWS Bedrock, Vertex AI, Gemini, and others.

### Step 4b — Create the Evaluators

Now invoke the evaluator skill:

```bash
/arize-evaluator
```

The skill will ask about your use case. Describe it: *"I have a travel AI assistant that uses tool calls to search flights and hotels. I suspect it's hallucinating hotel availability instead of calling a tool. I want evaluators to measure hallucination, response correctness, and whether it's using tools appropriately. Use the LLM provider integration I already have configured."*

When the skill asks which model to use for judging, provide the integration ID and model name you found in Step 4a.

### Evaluator 1: Hallucination Detector

The skill creates an LLM-as-judge evaluator with this prompt:

```
You are evaluating an AI travel assistant for hallucinations.

Given:
- User Query: {input}
- Available Tools: {tool_definitions}
- Tool Calls Made: {tool_calls}
- Assistant Response: {output}

Determine whether the assistant's response contains claims that cannot be verified
by the tools that were actually called.

A hallucination occurs when the assistant states a specific fact (e.g., "the hotel
has rooms available", "the price is €285/night", "the flight departs at 2:15 PM")
without having called a tool that would return that information.

Score:
- 1.0: No hallucinations detected — all claims are supported by tool call outputs
- 0.5: Minor hallucinations — assistant made unverified claims about non-critical details
- 0.0: Major hallucination — assistant confirmed a key fact (availability, price, booking) without tool verification

Return your score and a one-sentence explanation.
```

**Configuration:**
- Name: `hallucination_detector`
- Provider integration: *(the ID returned by `/arize-ai-provider-integration`)*
- Model: *(the model you selected in Step 4a, e.g. `gpt-4o-mini`)*
- Runs on: All spans where `span.kind = LLM`
- Column mappings: `input → input.value`, `output → output.value`, `tool_calls → llm.tool_calls`

### Evaluator 2: Response Correctness

```
You are evaluating the correctness and helpfulness of an AI travel assistant.

Given:
- User Query: {input}
- Assistant Response: {output}
- Tool Results Available: {tool_outputs}

Assess whether the assistant gave an accurate, complete, and helpful response
to the user's travel query.

Consider:
- Did the response address all parts of the user's question?
- Are the specific details (dates, locations, prices) consistent with tool outputs?
- Is the response format clear and useful for travel planning?
- Did the assistant acknowledge any limitations or uncertainties?

Score:
- 1.0: Fully correct and helpful — addresses the query completely with accurate details
- 0.7: Mostly correct — minor gaps or formatting issues, nothing misleading
- 0.4: Partially correct — addresses some of the query but missing key information
- 0.0: Incorrect or misleading — contains false information or fails to help the user

Return your score and a one-sentence explanation.
```

**Configuration:**
- Name: `response_correctness`
- Provider integration: *(same integration ID from Step 4a)*
- Model: *(same model from Step 4a)*
- Runs on: All root spans

### Evaluator 3: Tool Calling Completeness

This is the most targeted evaluator — it specifically looks for the pattern of making claims without tool support.

```
You are auditing an AI travel assistant's tool usage discipline.

Given:
- User Query: {input}
- Available Tools: {tool_definitions}
- Tool Calls Made: {tool_calls}
- Assistant Response: {output}

Evaluate whether the assistant used tools appropriately for every factual claim in its response.

The assistant has access to these tool categories:
- search_flights: Required before stating flight availability, prices, or schedules
- get_hotel_recommendations: Required before recommending specific hotels
- check_hotel_availability: Required before confirming a hotel has rooms available
- get_itinerary: Required before stating itinerary details

Score based on tool coverage:
- 1.0: Perfect — every factual claim is backed by a tool call
- 0.8: Good — tool calls cover all critical facts; minor unverified claims are clearly framed as suggestions
- 0.5: Partial — some factual claims are unverified but the most critical ones are covered
- 0.0: Poor — the assistant made critical factual claims (availability, confirmed pricing) without any supporting tool call

Return your score and a one-sentence explanation citing the specific uncovered claim.
```

**Configuration:**
- Name: `tool_calling_completeness`
- Provider integration: *(same integration ID from Step 4a)*
- Model: *(same model from Step 4a)*
- Runs on: All spans where tool calls are expected
- Column mappings: include `tool_definitions → llm.tools`

### A Note on Span Selection for Evaluators

Not every span needs every evaluator — and applying every evaluator to every span is both expensive and noisy. Before wiring up each evaluator, think about which spans actually contain the data it needs to score.

For example:
- `hallucination_detector` needs the model's response text and which tools were called — this is only meaningful on **LLM spans** or **CHAIN spans** that contain a full agent turn.
- `tool_calling_completeness` only makes sense on spans where tool use is expected — scoring a pure text exchange with it produces meaningless results.
- `response_correctness` is best applied to the **root CHAIN span** per user turn, not every intermediate LLM call.

Arize evaluators support a `query_filter` that restricts which spans get scored. Use it to target precisely the spans that are relevant:

```bash
# Only score CHAIN spans (one per agent turn)
--query-filter "span_kind = 'CHAIN'"

# Only score spans where a tool call was expected but may not have happened
--query-filter "span_kind = 'LLM' AND attributes.llm.tools IS NOT NULL"
```

Getting the filter right ensures your evaluator scores reflect real signal, not noise from spans that were never meant to be evaluated.

### Trigger the Evaluators

After the skill creates all three evaluators, trigger them to run against the 20 traces:

```bash
# The skill will show you these commands
ax tasks trigger-run --evaluator hallucination_detector --project travelgenie-assistant
ax tasks trigger-run --evaluator response_correctness --project travelgenie-assistant
ax tasks trigger-run --evaluator tool_calling_completeness --project travelgenie-assistant
```

Evaluators typically finish within 2-5 minutes. While they run, walk the audience through what's happening: Arize sends each trace to your already-configured LLM provider, gets a structured score back, and stores the result alongside the original span — no extra API keys, no new model setup, just reusing the integration you already have.

---

## Stage 5: Analyze Results (10 min)

The evaluators have finished. For this demo, we'll focus on one evaluator: **Tool Calling Completeness**. This is the most direct signal for the bug we're investigating — it specifically measures whether the agent called a tool before making factual claims. The hallucination and correctness evaluators provide supporting context, but tool calling completeness is the one that will definitively show us where the failure is and whether our fix resolved it.

Open the Arize dashboard, navigate to **Evaluations**, and filter to the `tool_calling_completeness` evaluator. Here's what the scores look like across our 20 traces, segmented by query type:

| Query Type | Hallucination Score | Correctness Score | Tool Calling Score |
|---|---|---|---|
| Flight searches (5) | 0.95 ✅ | 0.92 ✅ | 0.98 ✅ |
| Hotel recommendations (5) | 0.85 ✅ | 0.80 ✅ | 0.88 ✅ |
| **Hotel availability (5)** | **0.15 ❌** | **0.20 ❌** | **0.08 ❌** |
| Mixed queries (5) | 0.45 ⚠️ | 0.50 ⚠️ | 0.35 ⚠️ |

The numbers tell a clear story. Flight searches are excellent. Hotel recommendations are good (the agent is calling `get_hotel_recommendations` and giving solid suggestions). But hotel availability checks are catastrophically bad — a 0.08 tool calling score means the agent almost never called a tool when asked about availability.

### Read the Evaluator Explanations

Click into any hotel availability trace. Under the **Evaluations** tab, you'll see the explanation from `tool_calling_completeness`:

> *"The agent confirmed hotel availability without calling any tool to verify this information. The agent stated 'Yes, the Eiffel View Hotel has rooms available for June 15-18 for 2 guests at €285/night' but no `check_hotel_availability` tool call was made. This is a critical factual claim — specific room availability and pricing — made entirely without tool verification."*

And from `hallucination_detector`:

> *"Major hallucination detected. The agent confirmed both room availability and nightly price (€285) for specific dates without calling any tool that returns this information. The `get_hotel_recommendations` tool was called earlier in the session and returns general hotel data, but it does not return real-time availability or date-specific pricing. The specific confirmation of availability is fabricated."*

### The Root Cause Is Now Undeniable

We don't need to dig through logs, reproduce edge cases, or read thousands of lines of code. The evaluators have done the work:

**Root cause: The `check_hotel_availability` tool does not exist in the toolset. When users ask about specific availability, the agent has no mechanism to look up real data, so it falls back to generating a plausible-sounding confirmation.**

Every hotel booking complaint from the past week traces back to this one missing tool definition. Now let's fix it — carefully.

---

## Stage 6: Use Git Worktrees for Parallel Development (10 min)

Here's a common trap: you find the bug, you want to fix it immediately, you switch to a feature branch. But now your main branch is idle — you're not collecting traces, the bug is frozen in time, and you've lost the ability to compare the fixed version against the live production behavior.

Git worktrees solve this elegantly. A worktree is a separate checkout of your repo in a different directory, on a different branch, running simultaneously. You can have the buggy version on port 3000 still collecting production-like traces, while you develop the fix on port 3001 in a completely isolated directory.

### Set Up the Worktree

First, make sure your code is committed and pushed to GitHub:

```bash
cd TravelGenie
git init
git add .
git commit -m "feat: initial TravelGenie app with intentional missing tool bug"

# Push to GitHub using the gh CLI
gh repo create travelgenie --public --source=. --push
```

Now create the fix worktree:

```bash
# This creates a new branch and a new working directory simultaneously
git worktree add ../travelgenie-fix fix/hotel-availability-tool

# Verify you now have two worktrees
git worktree list
# Output:
# /path/to/TravelGenie              <commit-hash> [main]
# /path/to/travelgenie-fix      <commit-hash> [fix/hotel-availability-tool]
```

You now have two completely independent working directories. They share the same git history and object store, but each has its own working tree and branch. Changes in one do not affect the other.

### Run Both Simultaneously

Open two terminal windows:

**Terminal 1 — Production (buggy, keep collecting traces):**
```bash
cd TravelGenie
npm run dev
# Running on http://localhost:3000
```

**Terminal 2 — Fix branch (where we'll develop the solution):**
```bash
cd ../travelgenie-fix
npm install
npm run dev -- --port 3001
# Running on http://localhost:3001
```

### Why This Matters for Arize

Running both simultaneously means:

- **Port 3000** keeps generating real traces from the buggy version — your evaluators keep scoring, your dataset keeps growing
- **Port 3001** generates traces from the fixed version, tagged with the same model ID but on a different branch
- You can run Arize Experiments that compare both versions against the exact same test dataset
- When the PR is merged, you have a complete before/after record in Arize — not just "we think it's better" but empirical proof with scores

### Open Two Claude Code Sessions

```bash
# Claude Code session 1 — staying on main (observing production)
cd TravelGenie
claude
# Inside: /arize-evaluator  (keep evaluating production traces)

# Claude Code session 2 — on the fix branch
cd ../travelgenie-fix
claude
# Inside: /arize-experiment  (set up the comparative experiment)
```

This is the power of worktrees for AI engineering: you're not pausing the world to fix a bug. You're running the scientific experiment in parallel with production.

---

## Stage 7: Add the Missing Tool (5 min)

We're now in the `travelgenie-fix` worktree. Time to add the tool that should have been there from the start.

Open `src/lib/tools.ts` in the fix worktree and add the tool definition:

```typescript
// Add to src/lib/tools.ts — after the get_hotel_recommendations tool

{
  name: "check_hotel_availability",
  description: "Check if a specific hotel has rooms available for given dates and number of guests. ALWAYS call this tool before confirming hotel availability to a user. Never state that a hotel has availability without calling this tool first.",
  input_schema: {
    type: "object" as const,
    properties: {
      hotel_id: {
        type: "string",
        description: "The hotel ID returned by get_hotel_recommendations. Required to look up the specific property."
      },
      hotel_name: {
        type: "string",
        description: "Human-readable hotel name for display purposes."
      },
      check_in: {
        type: "string",
        description: "Check-in date in YYYY-MM-DD format (e.g., '2025-06-15')."
      },
      check_out: {
        type: "string",
        description: "Check-out date in YYYY-MM-DD format (e.g., '2025-06-18')."
      },
      num_guests: {
        type: "number",
        description: "Number of guests requiring accommodation. Defaults to 2 if not specified."
      }
    },
    required: ["hotel_id", "check_in", "check_out"]
  }
}
```

Now add the execution handler in `src/lib/tool-executor.ts`:

```typescript
case "check_hotel_availability": {
  const { hotel_id, hotel_name, check_in, check_out, num_guests = 2 } = input;

  // In a real app, this calls your hotel inventory API.
  // For the demo, we return realistic structured data.
  const availabilityData = await fetchHotelAvailability({
    hotelId: hotel_id,
    checkIn: check_in,
    checkOut: check_out,
    guests: num_guests,
  });

  return {
    hotel_id,
    hotel_name: hotel_name || hotel_id,
    check_in,
    check_out,
    num_guests,
    available: availabilityData.available,
    rooms: availabilityData.available ? availabilityData.rooms.map(room => ({
      room_type: room.type,
      price_per_night: room.pricePerNight,
      currency: "USD",
      total_price: room.pricePerNight * availabilityData.nightCount,
      amenities: room.amenities,
      booking_url: room.bookingUrl,
    })) : [],
    sold_out_reason: availabilityData.available ? null : availabilityData.soldOutReason,
    alternative_dates: availabilityData.available ? null : availabilityData.alternativeDates,
  };
}
```

Verify the fix works by sending a hotel availability query to `localhost:3001`. This time, you should see:
1. The agent calls `check_hotel_availability` (visible in the UI and in Arize traces)
2. The response is based on actual tool output — either confirming real availability with prices, or honestly reporting that the hotel is sold out for those dates

Commit the change:

```bash
cd ../travelgenie-fix

git add src/lib/tools.ts src/lib/tool-executor.ts
git commit -m "fix: add check_hotel_availability tool to prevent hallucinations

The agent was confirming hotel availability without any tool verification,
causing users to receive hallucinated availability confirmations. This adds
the missing tool and its execution handler.

The tool description explicitly instructs the model to always call this
before confirming availability to a user."
```

---

## Stage 8: Create a Dataset from Production Traces (5 min)

Before running experiments, we need a stable, reusable dataset to compare both versions against. Rather than generating synthetic test queries, we'll pull the real traces that already exist in Arize — the same ones our evaluators just scored. This ensures our experiment results are grounded in actual production behavior, not hand-crafted test cases.

Since we are evaluating the tool calling, we'll specifically use **CHAIN spans**. Each CHAIN span represents one complete agent turn — the user's message in, the assistant's full response out, with all intermediate tool calls captured as children. This is the right granularity for our experiment: one row per user interaction, with a clean `input` (the user message) and `output` (the final assistant response).

```bash
# Export CHAIN spans from your Arize project
ax spans export travelgenie-assistant \
  --space YOUR_SPACE_NAME \
  --limit 100 \
  --days 7 \
  --stdout \
  > /tmp/chain-spans.jsonl

# Create the dataset
ax datasets create \
  --name "travelgenie-chain-spans" \
  --description "CHAIN spans from production — one row per agent turn" \
  --space YOUR_SPACE_NAME \
  --file /tmp/chain-spans.jsonl
```

> **Why CHAIN spans specifically?**
> Your traces have three span kinds: CHAIN (one per agent turn), LLM (one per Anthropic API call), and TOOL (one per tool execution). LLM and TOOL spans are children of the CHAIN span. If you included all span kinds in your dataset, you'd end up with multiple rows per user interaction and the experiment would score intermediate steps rather than the final response. CHAIN spans give you exactly one row per user turn, which is what you want for a clean before/after comparison.

Once the dataset is created, verify it in the Arize UI under **Datasets** — you should see one row per agent turn, each with an `input` (user message) and `output` (assistant response) field.

---

## Stage 9: Validate with Arize Experiments (15 min)

We believe the fix works. But "I tested it manually" is not the same as "I have statistical evidence across a representative dataset." Arize Experiments lets us run both versions against the same 20 test queries and compare scores side by side.

In your Claude Code session in the `travelgenie-fix` worktree:

```bash
/arize-experiment
```

### Step 1: Create the Test Dataset

The skill will help you create a dataset from the 20 queries we ran earlier. Alternatively, reference the traces already in Arize:

```bash
# Export the 20 traces from Stage 3 as a dataset
ax datasets create \
  --name "travelgenie-hotel-availability-tests" \
  --description "20 queries covering flights, hotel recommendations, and hotel availability checks"

# Append the hotel availability queries (the ones that were failing)
ax datasets append travelgenie-hotel-availability-tests \
  --from-traces \
  --filter "span.attributes['hotel_availability_query'] == true"
```

### Step 2: Run the Baseline Experiment (Buggy Version)

Point the experiment at your buggy version running on port 3000:

```bash
ax experiments create \
  --name "travelgenie-baseline-missing-tool" \
  --dataset travelgenie-hotel-availability-tests \
  --endpoint http://localhost:3000/api/chat \
  --evaluators hallucination_detector,response_correctness,tool_calling_completeness \
  --description "Baseline: missing check_hotel_availability tool"
```

### Step 3: Run the Fix Experiment

Point the second experiment at the fixed version on port 3001:

```bash
ax experiments create \
  --name "travelgenie-fix-with-availability-tool" \
  --dataset travelgenie-hotel-availability-tests \
  --endpoint http://localhost:3001/api/chat \
  --evaluators hallucination_detector,response_correctness,tool_calling_completeness \
  --description "Fix: added check_hotel_availability tool"
```

The skill runs both experiments in parallel and streams results as they come in. You can watch the scores populate in real time on the Arize dashboard.

### Step 4: Compare Results

When both experiments complete, open **Experiments** in the Arize dashboard and select both runs for comparison. The results:

| Metric | Buggy Version | Fixed Version | Improvement |
|---|---|---|---|
| Hallucination Score | 0.15 | 0.92 | **+77%** ✅ |
| Tool Calling Score | 0.08 | 0.95 | **+87%** ✅ |
| Correctness Score | 0.20 | 0.89 | **+69%** ✅ |

Look at the individual trace comparisons. For the query *"Is the Eiffel View Hotel available for June 15-18?"*:

**Buggy version output:**
> *"Great news! The Eiffel View Hotel has rooms available for June 15-18 for 2 guests. The Deluxe Room with Eiffel Tower view is available at €285/night."*
> - Hallucination: 0.0 ❌ | Tool Calling: 0.0 ❌ | Correctness: 0.0 ❌

**Fixed version output:**
> *"I checked availability for the Eiffel View Hotel for June 15-18. The Standard Room is available at $220/night (total: $660 for 3 nights) and the Deluxe Eiffel View Room is available at $310/night (total: $930). Would you like me to provide the booking links for either option?"*
> - Hallucination: 1.0 ✅ | Tool Calling: 1.0 ✅ | Correctness: 0.95 ✅

This is the moment. The experiment doesn't just confirm the fix works — it **proves** it, with reproducible scores, trace-by-trace comparisons, and documented methodology. When the on-call engineer asks "are you sure this is safe to ship?", you can send them a link to this experiment.

---

## Stage 10: Submit the PR (5 min)

The experiment proves the fix works. Now ship it.

```bash
cd ../travelgenie-fix

# Push the fix branch to GitHub
git push origin fix/hotel-availability-tool

# Create the PR with full context
gh pr create \
  --title "fix: add check_hotel_availability tool to prevent hallucinations" \
  --body "## Problem

Hotel availability queries were hallucinating confirmed availability without tool verification. Users received confident confirmations of hotel availability that were entirely fabricated, leading to booking complaints.

**Detected via Arize evaluators:**
- Hallucination Score on hotel availability queries: **0.15** (vs 0.95 for flight queries)
- Tool Calling Score on hotel availability queries: **0.08** (the agent almost never called a tool)
- Correctness Score on hotel availability queries: **0.20**

## Root Cause

The \`check_hotel_availability\` tool was missing from the toolset. When users asked about specific hotel availability for specific dates, the agent had no mechanism to look up real data. Instead of saying \"I don't know,\" it generated a plausible-sounding confirmation — a classic hallucination from insufficient tooling.

## Solution

Added \`check_hotel_availability\` tool that:
- Accepts hotel ID, check-in/check-out dates, and number of guests
- Returns structured availability data including room types, real-time pricing, and booking URLs
- Returns honest sold-out signals and alternative date suggestions when unavailable
- Tool description explicitly instructs the model to always call this before confirming availability

## Validation

Validated with Arize Experiments comparing buggy vs fixed version on the same 20-query test dataset:

| Metric | Buggy Version | Fixed Version | Improvement |
|---|---|---|---|
| Hallucination Score | 0.15 | 0.92 | +77% ✅ |
| Tool Calling Score | 0.08 | 0.95 | +87% ✅ |
| Correctness Score | 0.20 | 0.89 | +69% ✅ |

Full experiment results: [View in Arize →](https://app.arize.com/experiments/travelgenie-fix-with-availability-tool)

## Testing

- [ ] Hotel availability query returns tool call in trace (verify in Arize)
- [ ] Sold-out hotels return honest unavailability message
- [ ] Mixed queries (flight + availability) call both tools correctly
- [ ] No regression on flight search or hotel recommendation queries"
```

The PR description tells a complete story: what broke, why it broke, how we found it, and the empirical proof that the fix works. Any reviewer can click through to the Arize experiment and verify the scores themselves.

### Clean Up the Worktree

After the PR is approved and merged:

```bash
# Remove the fix worktree
git worktree remove ../travelgenie-fix

# Verify it's gone
git worktree list
# Output:
# /path/to/TravelGenie    <commit-hash> [main]
```

---

## Summary: What We Demonstrated

In ~70 minutes, we went from "users are complaining about hotel bookings" to a merged, validated fix — with complete empirical evidence at every step.

| Skill | What It Did | Time Saved |
|---|---|---|
| `arize-instrumentation` | Added full OpenTelemetry tracing with OTEL + Arize exporter, including manual spans for the agentic loop | ~2 hours of boilerplate setup |
| `arize-ai-provider-integration` | Listed existing LLM integrations in the space; surfaced the provider and model to use as the eval judge — no new API keys or model config needed | ~30 min of dashboard navigation and credential hunting |
| `arize-evaluator` | Created 3 LLM-as-judge evaluators wired to the existing provider integration, with column mappings and trigger configuration | ~1 day of eval engineering and prompt tuning |
| `arize-experiment` | Ran two parallel experiments on a 20-query dataset and produced a side-by-side comparison with statistical scores | ~1 week of A/B test infrastructure setup and analysis |

### Key Takeaways

- **Hallucinations are invisible without observability.** The bug produced zero errors, zero exceptions, and zero failed requests. It looked like perfect behavior until you looked at what the agent was — and wasn't — doing at the tool call level. Arize made the invisible visible.

- **Evaluators turn gut feelings into evidence.** "It seems like it's making things up" is hard to act on. "Tool Calling Score of 0.08 on hotel availability queries" is a bug report, a priority, and a clear success metric all in one.

- **Experiments make shipping safe.** Every AI change is a hypothesis. Arize Experiments let you test that hypothesis on real data before it touches production. The result isn't "I think this is better" — it's "the data shows +87% tool calling improvement across 20 representative queries."

---

## Appendix: Useful Commands Reference

### App Commands
```bash
# Install dependencies
npm install

# Start dev server (default port 3000)
npm run dev

# Start dev server on custom port
npm run dev -- --port 3001

# Build for production
npm run build

# Generate test traces
node scripts/generate-test-traces.js
```

### Git Worktree Commands
```bash
# Create a new worktree on a new branch
git worktree add ../travelgenie-fix fix/hotel-availability-tool

# List all worktrees
git worktree list

# Remove a worktree (after branch is merged)
git worktree remove ../travelgenie-fix

# Prune stale worktree references
git worktree prune
```

### GitHub CLI Commands
```bash
# Create a new public repo and push
gh repo create travelgenie --public --source=. --push

# Create a pull request
gh pr create --title "..." --body "..."

# View PR status
gh pr status

# Merge a PR
gh pr merge --squash
```

### Arize CLI (ax) Commands
```bash
# List projects
ax projects list

# Export traces from a project
ax traces export --project travelgenie-assistant --limit 50

# Create a dataset
ax datasets create --name "my-dataset" --description "..."

# List evaluators
ax evaluators list --project travelgenie-assistant

# Trigger an evaluator run
ax tasks trigger-run --evaluator hallucination_detector --project travelgenie-assistant

# Create and run an experiment
ax experiments create \
  --name "my-experiment" \
  --dataset my-dataset \
  --endpoint http://localhost:3000/api/chat \
  --evaluators hallucination_detector,response_correctness
```

### Claude Code Skills Used in This Demo
```bash
/arize-instrumentation          # Add Arize OTEL tracing to an app
/arize-ai-provider-integration  # List/manage LLM provider integrations in your space
/arize-evaluator                # Create and run LLM-as-judge evaluators
/arize-experiment               # Run comparative experiments on datasets
/arize-dataset                  # Create and manage evaluation datasets
/arize-trace                    # Inspect and debug individual traces
```

### Vercel Deployment
```bash
# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add ANTHROPIC_API_KEY production
vercel env add ARIZE_API_KEY production
vercel env add ARIZE_SPACE_ID production
vercel env add ARIZE_MODEL_ID production

# View deployment logs
vercel logs
```
