/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@opentelemetry/sdk-trace-node',
      '@opentelemetry/exporter-trace-otlp-proto',
    ],
  },
}

module.exports = nextConfig
