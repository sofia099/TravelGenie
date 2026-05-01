export async function register() {
  // Only run in the Node.js runtime (not Edge). NEXT_RUNTIME is undefined in dev, 'nodejs' in prod.
  if (process.env.NEXT_RUNTIME !== 'edge') {
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-proto')
    const { resourceFromAttributes } = await import('@opentelemetry/resources')
    const { SimpleSpanProcessor } = await import('@opentelemetry/sdk-trace-base')
    const { NodeTracerProvider } = await import('@opentelemetry/sdk-trace-node')
    const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions')
    const { SEMRESATTRS_PROJECT_NAME } = await import('@arizeai/openinference-semantic-conventions')

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
}
