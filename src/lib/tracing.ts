import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { SEMRESATTRS_PROJECT_NAME } from '@arizeai/openinference-semantic-conventions'
import { trace } from '@opentelemetry/api'

let initialized = false

function initArize() {
  if (initialized) return
  initialized = true

  const projectName = process.env.ARIZE_MODEL_ID || 'travelgenie-assistant'

  if (!process.env.ARIZE_API_KEY || !process.env.ARIZE_SPACE_ID) {
    console.warn('[TravelGenie] ARIZE_API_KEY or ARIZE_SPACE_ID not set — traces will not be exported')
    return
  }

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: projectName,
      [SEMRESATTRS_PROJECT_NAME]: projectName,
    }),
    spanProcessors: [
      new SimpleSpanProcessor(
        new OTLPTraceExporter({
          url: 'https://otlp.arize.com/v1/traces',
          headers: {
            'space_id': process.env.ARIZE_SPACE_ID,
            'api_key': process.env.ARIZE_API_KEY,
          },
        })
      ),
    ],
  })

  provider.register()
  console.log(`[TravelGenie] Arize tracing initialized → project: ${projectName}`)
}

initArize()

export const tracer = trace.getTracer('travelgenie', '1.0.0')
