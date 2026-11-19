import { metrics } from "@opentelemetry/api";
import {
  CLIENT_TELEMETRY_BODY_LIMIT,
  CLIENT_TELEMETRY_PATH,
  clientTelemetryEventSchema,
  type ClientTelemetryEvent,
} from "@starter/shared/client-telemetry";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { emitStructuredLog } from "./telemetry-signals.js";

const clientEvents = metrics.getMeter("starter-api").createCounter("starter.client.event.count", {
  description: "Accepted anonymous client events by surface and event type.",
});

export function registerClientTelemetry(app: FastifyInstance): void {
  const windowMs = 60_000;
  const limit = 120;
  let windowEnds = 0;
  let starts = 0;
  let errors = 0;

  app.post(
    CLIENT_TELEMETRY_PATH,
    {
      logLevel: "warn",
      bodyLimit: CLIENT_TELEMETRY_BODY_LIMIT,
      schema: {
        tags: ["Telemetry"],
        summary: "Report an anonymous client session start or error",
        description:
          "Best-effort reporting from the web and Expo apps. Only enumerated events and bounded HTTP correlation fields are accepted. Session starts and errors each have a separate per-instance intake limit.",
        security: [],
        body: z.toJSONSchema(clientTelemetryEventSchema, { target: "draft-07" }),
        response: {
          204: { description: "Event accepted" },
          400: {
            description: "Invalid client event",
            type: "object",
            required: ["statusCode", "error", "message"],
            properties: {
              statusCode: { type: "integer" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          413: { description: "Request body exceeds 1024 bytes" },
          429: {
            description: "Intake limit reached",
            headers: {
              "Retry-After": {
                schema: { type: "integer" },
                description: "Seconds until the limit resets",
              },
            },
          },
        },
      },
      preValidation(request, reply, done) {
        if (!clientTelemetryEventSchema.safeParse(request.body).success) {
          void reply
            .code(400)
            .send({ statusCode: 400, error: "Bad Request", message: "Invalid client event" });
          return;
        }
        done();
      },
    },
    async (request, reply) => {
      const { surface, event, status, apiRequestId } = clientTelemetryEventSchema.parse(
        request.body,
      );
      const now = Date.now();
      if (now >= windowEnds) {
        windowEnds = now + windowMs;
        starts = 0;
        errors = 0;
      }
      const isSessionStart = event === "session_started";
      if ((isSessionStart ? starts : errors) >= limit) {
        return reply
          .header("Retry-After", Math.ceil((windowEnds - now) / 1000))
          .code(429)
          .send();
      }
      if (isSessionStart) starts++;
      else errors++;

      clientEvents.add(1, { surface, event });
      if (!isSessionStart) {
        emitStructuredLog("client.error", "error", {
          entryPoint: "client_telemetry",
          requestId: request.id,
          surface,
          kind: event,
          ...(status !== undefined ? { status } : {}),
          ...(apiRequestId !== undefined ? { apiRequestId } : {}),
        });
      }
      return reply.code(204).send();
    },
  );
}
