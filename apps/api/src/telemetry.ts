import { privateSpan } from "./telemetry-privacy.js";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";

export async function startTelemetry(): Promise<(() => Promise<void>) | undefined> {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return undefined;

  const traceExporter = new OTLPTraceExporter();
  const sdk = new NodeSDK({
    autoDetectResources: false,
    serviceName: process.env.OTEL_SERVICE_NAME ?? "starter-api",
    traceExporter: {
      export: (spans, callback) => traceExporter.export(spans.map(privateSpan), callback),
      shutdown: () => traceExporter.shutdown(),
    },
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
        },
      }),
    ],
  });

  sdk.start();
  return () => sdk.shutdown();
}
