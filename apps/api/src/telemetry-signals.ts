import { logs, SeverityNumber } from "@opentelemetry/api";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { serviceName: process.env.OTEL_SERVICE_NAME ?? "starter-api" },
});

type EventSeverity = "info" | "warn" | "error";
type EventAttributes = Record<string, string | number | boolean>;

export function emitStructuredLog(
  eventName: string,
  severity: EventSeverity,
  attributes: EventAttributes,
): void {
  logger[severity]({ event: eventName, ...attributes }, eventName);
  logs.getLogger("starter-api").emit({
    severityNumber:
      severity === "error"
        ? SeverityNumber.ERROR
        : severity === "warn"
          ? SeverityNumber.WARN
          : SeverityNumber.INFO,
    severityText: severity.toUpperCase(),
    body: eventName,
    attributes: { event: eventName, ...attributes },
  });
}
