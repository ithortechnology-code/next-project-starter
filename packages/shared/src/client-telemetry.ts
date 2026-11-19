import { z } from "zod";

export const CLIENT_TELEMETRY_PATH = "/api/telemetry/client";
export const CLIENT_TELEMETRY_BODY_LIMIT = 1024;
export const clientTelemetryEventSchema = z.strictObject({
  surface: z.enum(["web", "expo"]),
  event: z.enum([
    "session_started",
    "js_error",
    "unhandled_rejection",
    "render_error",
    "network_error",
    "api_error",
  ]),
  status: z.number().int().min(500).max(599).optional(),
  apiRequestId: z
    .string()
    .regex(/^(req-[a-z0-9]{1,12}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i)
    .optional(),
});

export type ClientTelemetryEvent = z.infer<typeof clientTelemetryEventSchema>;
type EventDetails = Omit<ClientTelemetryEvent, "surface">;

export function createClientTelemetry(endpoint: string, surface: ClientTelemetryEvent["surface"]) {
  const lastSent = new Map<EventDetails["event"], number>();

  function report(details: EventDetails): void {
    const now = Date.now();
    const previous = lastSent.get(details.event);
    if (previous !== undefined && now - previous < 60_000) return;
    lastSent.set(details.event, now);
    void fetch(endpoint, {
      method: "POST",
      credentials: "omit",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ surface, ...details }),
      ...(surface === "web" ? { keepalive: true } : {}),
    }).catch(() => undefined);
  }

  const trackedFetch: typeof fetch = async (input, init) => {
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError") && !init?.signal?.aborted) {
        report({ event: "network_error" });
      }
      throw error;
    }
    if (response.status >= 500 && response.status <= 599) {
      const requestId = clientTelemetryEventSchema.shape.apiRequestId.safeParse(
        response.headers.get("x-request-id") ?? undefined,
      );
      report({
        event: "api_error",
        status: response.status,
        apiRequestId: requestId.success ? requestId.data : undefined,
      });
    }
    return response;
  };

  return { report, trackedFetch };
}
