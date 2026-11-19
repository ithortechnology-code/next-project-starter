import { HEALTH_PATH } from "@starter/shared";
import { CLIENT_TELEMETRY_PATH } from "@starter/shared/client-telemetry";
import { privateSpan } from "./telemetry-privacy.js";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { AggregationType, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";

const droppedMetrics = [
  "http.server.duration",
  "http.server.request.duration",
  "nodejs.eventloop.delay.*",
  "v8js.memory.heap.space.*",
  "v8js.resource.active",
];

export async function startTelemetry(): Promise<(() => Promise<void>) | undefined> {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return undefined;

  process.env.OTEL_EXPORTER_OTLP_COMPRESSION ??= "gzip";
  const traceExporter = new OTLPTraceExporter();
  const sdk = new NodeSDK({
    autoDetectResources: false,
    serviceName: process.env.OTEL_SERVICE_NAME ?? "starter-api",
    traceExporter: {
      export: (spans, callback) => traceExporter.export(spans.map(privateSpan), callback),
      shutdown: () => traceExporter.shutdown(),
    },
    views: droppedMetrics.map((instrumentName) => ({
      instrumentName,
      aggregation: { type: AggregationType.DROP },
    })),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
      }),
    ],
    logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-http": {
          redactedQueryParamsServer: ["token"],
          ignoreIncomingRequestHook: (request) => {
            const path = request.url?.split("?", 1)[0];
            return path === HEALTH_PATH || path === CLIENT_TELEMETRY_PATH;
          },
        },
        "@opentelemetry/instrumentation-pg": { requireParentSpan: true },
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-net": { enabled: false },
      }),
    ],
  });

  sdk.start();
  return () => sdk.shutdown();
}
