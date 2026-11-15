import type { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
type Span = Parameters<OTLPTraceExporter["export"]>[0][number];
// Export only bounded operational attributes. URLs, SQL, headers, exception
// messages, process arguments and span events can contain auth credentials/PII.
const safeAttributes = new Set([
  "http.request.method",
  "http.method",
  "http.response.status_code",
  "http.status_code",
  "http.route",
  "db.system",
  "db.system.name",
  "db.operation.name",
  "rpc.system",
  "auth.email.purpose",
  "messaging.system",
  "messaging.destination.name",
  "job.entry_point",
  "service.name",
  "service.version",
  "telemetry.sdk.name",
  "telemetry.sdk.language",
  "telemetry.sdk.version",
]);
export function safeTelemetryAttributes(attributes: Span["attributes"]): Span["attributes"] {
  return Object.fromEntries(Object.entries(attributes).filter(([key]) => safeAttributes.has(key)));
}
export function privateSpan(span: Span): Span {
  const resource = Object.create(span.resource, {
    attributes: { value: safeTelemetryAttributes(span.resource.attributes) },
  });
  return {
    ...span,
    name:
      typeof span.attributes["http.route"] === "string"
        ? String(span.attributes["http.route"])
        : span.attributes["auth.email.purpose"]
          ? "auth.email"
          : span.attributes["messaging.system"]
            ? "queue.process"
            : "operation",
    spanContext: () => span.spanContext(),
    resource,
    attributes: safeTelemetryAttributes(span.attributes),
    events: [],
    links: [],
    status: { code: span.status.code },
  };
}
