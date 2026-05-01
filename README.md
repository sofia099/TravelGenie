# TravelGenie - AI Travel Assistant

TravelGenie is an AI-powered travel assistant built with Next.js and Anthropic Claude. It helps users search for flights, browse hotel recommendations, and plan their trips through a conversational interface. The assistant uses structured tool calls to fetch real travel data — flights, hotels, itineraries — and responds with rich, personalized recommendations.

This app is designed as a demo for showcasing **Arize AI observability**. It ships with an intentional bug: the `check_hotel_availability` tool is missing, causing the agent to hallucinate confirmed hotel availability when users ask about specific dates. The demo walkthrough in `DEMO_SCRIPT.md` shows how to detect, diagnose, and fix this bug using Arize.

---

## Tech Stack

- **Next.js 14** (App Router) — server components, API routes, streaming responses
- **Anthropic Claude claude-haiku-4-5** with tool use — the AI backbone, using structured function calling for travel queries
- **Tailwind CSS** — clean, responsive UI that looks good on stage
- **Arize Phoenix** for observability — added during the demo using the `arize-instrumentation` Claude Code skill; provides full OpenTelemetry tracing of every LLM call, tool invocation, and agent step

---

## Quick Start

```bash
cd TravelGenie
npm install
cp .env.example .env.local
# Fill in your API keys (see Environment Variables section below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and try asking:

- "Find me flights from NYC to Paris on June 15th"
- "What hotels do you recommend in Paris?"
- "Is the Eiffel View Hotel available for June 15-18?" ← this one will misbehave

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in each value:

| Variable | Description | Where to Get It |
|---|---|---|
| `ANTHROPIC_API_KEY` | Authenticates requests to the Claude API | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `ARIZE_API_KEY` | Authenticates the OpenTelemetry exporter to Arize | [app.arize.com](https://app.arize.com) → Settings → API Keys |
| `ARIZE_SPACE_ID` | Identifies which Arize space receives your traces | [app.arize.com](https://app.arize.com) → Settings → Copy Space ID |
| `ARIZE_MODEL_ID` | Human-readable identifier for this model in the Arize UI | Set to `travelgenie-assistant` (or any name you prefer) |

### `ANTHROPIC_API_KEY`

Your Anthropic API key. Required for all Claude API calls. Get it from [console.anthropic.com](https://console.anthropic.com) under **API Keys**. Starts with `sk-ant-`.

### `ARIZE_API_KEY`

Your Arize platform API key. Used by the OpenInference/OTEL exporter to authenticate trace uploads. Find it at [app.arize.com](https://app.arize.com) under **Settings > API Keys**. This is added automatically when you run the `arize-instrumentation` Claude Code skill.

### `ARIZE_SPACE_ID`

Your Arize space identifier. Traces are scoped to a space, so this ensures your TravelGenie traces appear in the right project. Find it in your Arize dashboard URL or under **Settings > Space**.

### `ARIZE_MODEL_ID`

A string identifier used to tag traces with the model/application name in Arize. Defaults to `travelgenie-assistant`. You can change this to distinguish between environments (e.g., `travelgenie-dev`, `travelgenie-prod`).

---

## Deploying to Vercel

TravelGenie deploys cleanly to Vercel with zero configuration changes. The API routes work out of the box as Vercel serverless functions.

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow the prompts — accept defaults for everything)
vercel

# For production deployment:
vercel --prod
```

After deploying, set your environment variables in the Vercel dashboard:

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings > Environment Variables**
3. Add each variable:
   - `ANTHROPIC_API_KEY`
   - `ARIZE_API_KEY`
   - `ARIZE_SPACE_ID`
   - `ARIZE_MODEL_ID`
4. Set the environment scope to **Production** (and **Preview** if you want traces from preview deploys)
5. Redeploy for the variables to take effect: `vercel --prod`

> **Tip:** You can also set environment variables via the CLI:
> ```bash
> vercel env add ANTHROPIC_API_KEY production
> vercel env add ARIZE_API_KEY production
> vercel env add ARIZE_SPACE_ID production
> vercel env add ARIZE_MODEL_ID production
> ```

---

## Pushing to GitHub

```bash
# Initialize git repo
git init
git add .
git commit -m "feat: initial TravelGenie app with intentional missing tool bug"

# Create repo on GitHub using the gh CLI (recommended)
gh repo create travelgenie --public --source=. --push

# Or manually via the GitHub web interface:
git remote add origin https://github.com/YOUR_USERNAME/travelgenie.git
git branch -M main
git push -u origin main
```

Once pushed, you can use git worktrees to work on the bug fix in a separate directory without switching branches — this is demonstrated in the demo script.

---

## Project Structure

```
TravelGenie/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts        # Main API route: streams Claude responses
│   │   ├── layout.tsx
│   │   └── page.tsx                # Chat UI
│   └── lib/
│       ├── tools.ts                # Tool definitions for Claude (BUG: missing check_hotel_availability)
│       ├── tool-executor.ts        # Tool execution handlers
│       └── arize.ts                # Arize/OTEL instrumentation (added during demo)
├── scripts/
│   └── generate-test-traces.js     # Script to generate 20 diverse test traces
├── .env.example                    # Template for environment variables
├── DEMO_SCRIPT.md                  # Step-by-step demo walkthrough
└── README.md                       # You are here
```

---

## Known Issues

> Hotel availability checks may be unreliable. We're investigating this with Arize... 👀

Specifically: when a user asks whether a specific hotel has rooms available for given dates, the assistant may confidently confirm availability without actually checking. This is a known gap in the toolset that is demonstrated and resolved in the `DEMO_SCRIPT.md` walkthrough.

---

## License

MIT — use freely for demos, workshops, and learning.
