import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { metrics, trace } from "@opentelemetry/api";
import { emitStructuredLog } from "./telemetry-signals.js";

const context = new AsyncLocalStorage<{ requestId: string; entryPoint: string }>();
const meter = metrics.getMeter("starter-auth");
const outcomes = meter.createCounter("starter.auth.operation.count");
const duration = meter.createHistogram("starter.auth.operation.duration", { unit: "s" });
const operations: Record<string, string> = {
  "/sign-up/email": "registration",
  "/sign-in/email": "sign_in",
  "/sign-out": "sign_out",
  "/verify-email": "verification",
  "/send-verification-email": "verification_resend",
  "/request-password-reset": "recovery",
  "/reset-password": "reset",
  "/get-session": "session_check",
};
export function authOperation(url: string): string | undefined {
  const path = new URL(url, "http://local.invalid").pathname.replace(/^\/api\/auth/, "");
  return operations[path] ?? (path.startsWith("/reset-password/") ? "recovery_link" : undefined);
}
export function withAuthRequest<T>(requestId: string, run: () => T, entryPoint = "auth_http"): T {
  return context.run({ requestId, entryPoint }, run);
}
export function recordAuthOperation(operation: string, outcome: string, seconds: number) {
  outcomes.add(1, { operation, outcome });
  duration.record(seconds, { operation, outcome });
  // Polling success is a metric, not an info log for every request.
  if (operation === "session_check" && outcome !== "failure") return;
  const active = trace.getActiveSpan()?.spanContext();
  emitStructuredLog("auth.operation", outcome === "failure" ? "error" : "info", {
    ...(context.getStore() ?? { requestId: randomUUID(), entryPoint: "auth_background" }),
    ...(active ? { traceId: active.traceId } : {}),
    operation,
    outcome,
  });
}
export function recordAuthLibraryLog(level: string) {
  if (level !== "error") return;
  // Library messages/args can contain credentials, URLs or account identifiers.
  emitStructuredLog("auth.library_diagnostic", level, {
    ...(context.getStore() ?? { requestId: randomUUID(), entryPoint: "auth_startup" }),
  });
}
