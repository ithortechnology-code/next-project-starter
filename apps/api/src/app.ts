import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { healthResponseSchema, HEALTH_PATH } from "@starter/shared";
import { z } from "zod";
import { checkDatabaseConnection, createDatabase } from "./database.js";
import { createAuth } from "./auth.js";
import { createJobQueue, enqueueExampleJob, EXAMPLE_JOB } from "./jobs.js";
import { createConfiguredStorage, type FileStorage } from "@starter/storage";
import { metrics } from "@opentelemetry/api";
import {
  createFileToken,
  matchesImageContentType,
  PROFILE_IMAGE_CONTENT_TYPES,
  PROFILE_IMAGE_MAX_BYTES,
  verifyFileToken,
  type ProfileImageContentType,
} from "./signed-files.js";
import { emitStructuredLog } from "./telemetry-signals.js";

const apiMeter = metrics.getMeter("starter-api");
const requestCount = apiMeter.createCounter("starter.http.server.request.count", {
  description: "Completed API requests by method, route, and status class.",
});
const requestDuration = apiMeter.createHistogram("starter.http.server.request.duration", {
  description: "API request duration in seconds by method, route, and status class.",
  unit: "s",
});
const storageOperationCount = apiMeter.createCounter("starter.file_storage.operation.count", {
  description: "Profile-image storage operation outcomes by driver and operation.",
});
const storageOperationDuration = apiMeter.createHistogram(
  "starter.file_storage.operation.duration",
  {
    description: "Profile-image storage operation duration in seconds.",
    unit: "s",
  },
);

async function measureStorageOperation<T>(
  operation: "put" | "get",
  callback: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  let outcome: "success" | "failure" = "success";
  try {
    return await callback();
  } catch (error) {
    outcome = "failure";
    throw error;
  } finally {
    const attributes = {
      driver: process.env.STORAGE_DRIVER ?? "filesystem",
      operation,
      outcome,
    };
    storageOperationCount.add(1, attributes);
    storageOperationDuration.record((performance.now() - startedAt) / 1000, attributes);
  }
}

declare module "fastify" {
  interface FastifyInstance {
    storage: FileStorage;
    auth: ReturnType<typeof createAuth> | null;
  }
}

const healthJsonSchema = z.toJSONSchema(healthResponseSchema, { target: "openapi-3.0" });

export function createApp() {
  const app = Fastify({
    logger: {
      serializers: {
        req(request) {
          const url = request.url ?? "";
          return {
            method: request.method,
            url: url.replace(/([?&]token=)[^&]+/g, "$1[REDACTED]"),
            hostname: request.hostname,
            remoteAddress: request.ip,
            ...(request.socket.remotePort ? { remotePort: request.socket.remotePort } : {}),
          };
        },
      },
    },
  });
  const database = process.env.DATABASE_URL ? createDatabase() : undefined;
  if (process.env.NODE_ENV === "production" && !database) {
    throw new Error(
      "DATABASE_URL is required to start the authentication-enabled API in production.",
    );
  }
  const auth = database ? createAuth(database.db) : null;
  const boss = process.env.DATABASE_URL ? createJobQueue() : undefined;
  const storage = createConfiguredStorage();
  app.decorate("storage", storage);
  app.decorate("auth", auth);

  const errorsLogged = new WeakSet<FastifyRequest>();
  app.addHook("onError", (request, reply, error, done) => {
    const statusCode = reply.statusCode;
    const errorStatusCode = (error as { statusCode?: number }).statusCode ?? 0;
    if (statusCode >= 500 || errorStatusCode >= 500) {
      errorsLogged.add(request);
      emitStructuredLog("http.request.failed", "error", {
        requestId: request.id,
        method: request.method,
        route: request.routeOptions.url ?? "unmatched",
        statusClass: `${Math.floor(statusCode / 100)}xx`,
        errorType: error.name,
        ...(typeof (error as { code?: unknown }).code === "string"
          ? { errorCode: (error as { code: string }).code }
          : {}),
      });
    }
    done();
  });
  app.addHook("onResponse", (request, reply, done) => {
    const route = request.routeOptions.url ?? "unmatched";
    const statusCode = reply.statusCode;
    const statusClass = `${Math.floor(statusCode / 100)}xx`;
    const attributes = {
      "http.request.method": request.method,
      "http.route": route,
      "http.response.status_class": statusClass,
    };
    requestCount.add(1, attributes);
    requestDuration.record(reply.elapsedTime / 1000, attributes);

    if (statusCode >= 500 && !errorsLogged.has(request)) {
      emitStructuredLog("http.request.failed", "error", {
        requestId: request.id,
        method: request.method,
        route,
        statusClass,
      });
    } else if (reply.elapsedTime >= 1000) {
      emitStructuredLog("http.request.slow", "warn", {
        requestId: request.id,
        method: request.method,
        route,
        statusClass,
        durationMs: Math.round(reply.elapsedTime),
      });
    }
    done();
  });

  app.addContentTypeParser(
    /^image\/(jpeg|png|webp)(?:\s*;.*)?$/i,
    { parseAs: "buffer", bodyLimit: PROFILE_IMAGE_MAX_BYTES },
    (_request, body, done) => done(null, body),
  );

  app.register(cors, { origin: process.env.WEB_ORIGIN?.split(",") ?? true });
  app.register(swagger, {
    openapi: {
      info: { title: process.env.API_TITLE ?? "Project Starter API", version: "0.1.0" },
      servers: [{ url: process.env.API_PUBLIC_URL ?? "http://localhost:4000" }],
    },
  });

  app.register(async function registerRoutes(routes) {
    routes.get(
      HEALTH_PATH,
      {
        schema: {
          tags: ["system"],
          response: { 200: healthJsonSchema, 503: healthJsonSchema },
        },
      },
      async (_request, reply) => {
        let connected = !database;
        if (database) {
          try {
            await checkDatabaseConnection(database.db);
            connected = true;
          } catch (error) {
            app.log.warn({ err: error }, "Database health check failed");
          }
        }
        const body = healthResponseSchema.parse({
          status: "ok",
          service: "api",
          database: connected ? "connected" : "unavailable",
        });
        return reply.code(connected ? 200 : 503).send(body);
      },
    );

    if (
      process.env.NODE_ENV !== "production" ||
      process.env.ENABLE_EXAMPLE_JOB_ENDPOINT === "true"
    ) {
      routes.post(
        "/jobs/example",
        {
          schema: {
            tags: ["jobs"],
            body: {
              type: "object",
              additionalProperties: false,
              required: ["idempotencyKey"],
              properties: { idempotencyKey: { type: "string", minLength: 1, maxLength: 200 } },
            },
            response: {
              202: {
                type: "object",
                required: ["queued"],
                properties: { queued: { type: "boolean" } },
              },
              503: {
                type: "object",
                required: ["message"],
                properties: { message: { type: "string" } },
              },
            },
          },
        },
        async (request, reply: FastifyReply) => {
          const body = request.body as { idempotencyKey: string };
          if (!boss) return reply.code(503).send({ message: "Job queue is unavailable" });
          await enqueueExampleJob(boss, body.idempotencyKey);
          return reply.code(202).send({ queued: true });
        },
      );
    }

    if (
      process.env.NODE_ENV !== "production" ||
      process.env.ENABLE_EXAMPLE_FILE_ENDPOINTS === "true"
    ) {
      const signingSecret = process.env.FILE_URL_SIGNING_SECRET ?? "";
      if (Buffer.byteLength(signingSecret) < 32) {
        throw new Error("FILE_URL_SIGNING_SECRET must contain at least 32 bytes.");
      }
      const apiBaseUrl = (
        process.env.API_PUBLIC_URL ??
        `http://localhost:${process.env.API_PORT ?? process.env.PORT ?? 4000}`
      ).replace(/\/$/, "");
      const expiresAt = () => Math.floor(Date.now() / 1000) + 10 * 60;
      const signedUrl = (
        fileId: string,
        operation: "upload" | "download",
        contentType?: ProfileImageContentType,
      ) => {
        const expiry = expiresAt();
        const token = createFileToken(
          { fileId, operation, expiresAt: expiry, ...(contentType ? { contentType } : {}) },
          signingSecret,
        );
        return {
          url: `${apiBaseUrl}/files/${fileId}?token=${encodeURIComponent(token)}`,
          expiresAt: new Date(expiry * 1000).toISOString(),
        };
      };

      routes.post(
        "/files/upload-url",
        {
          schema: {
            tags: ["files"],
            body: {
              type: "object",
              additionalProperties: false,
              required: ["contentType"],
              properties: { contentType: { type: "string", enum: PROFILE_IMAGE_CONTENT_TYPES } },
            },
            response: {
              201: {
                type: "object",
                required: ["fileId", "uploadUrl", "downloadUrl", "expiresAt", "maxBytes"],
                properties: {
                  fileId: { type: "string", format: "uuid" },
                  uploadUrl: { type: "string", format: "uri" },
                  downloadUrl: { type: "string", format: "uri" },
                  expiresAt: { type: "string", format: "date-time" },
                  maxBytes: { type: "integer" },
                },
              },
            },
          },
        },
        async (request, reply) => {
          const { contentType } = request.body as { contentType: ProfileImageContentType };
          const fileId = randomUUID();
          const upload = signedUrl(fileId, "upload", contentType);
          const download = signedUrl(fileId, "download");
          return reply.code(201).send({
            fileId,
            uploadUrl: upload.url,
            downloadUrl: download.url,
            expiresAt: upload.expiresAt,
            maxBytes: PROFILE_IMAGE_MAX_BYTES,
          });
        },
      );

      routes.post(
        "/files/:fileId/download-url",
        {
          schema: {
            tags: ["files"],
            params: {
              type: "object",
              required: ["fileId"],
              properties: { fileId: { type: "string", format: "uuid" } },
            },
            response: {
              200: {
                type: "object",
                required: ["downloadUrl", "expiresAt"],
                properties: {
                  downloadUrl: { type: "string", format: "uri" },
                  expiresAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        async (request, reply) => {
          const { fileId } = request.params as { fileId: string };
          const download = signedUrl(fileId, "download");
          return reply.send({ downloadUrl: download.url, expiresAt: download.expiresAt });
        },
      );

      routes.put(
        "/files/:fileId",
        {
          schema: {
            tags: ["files"],
            params: {
              type: "object",
              required: ["fileId"],
              properties: { fileId: { type: "string", format: "uuid" } },
            },
            querystring: {
              type: "object",
              required: ["token"],
              properties: { token: { type: "string", minLength: 40, maxLength: 2000 } },
            },
            response: {
              200: {
                type: "object",
                required: ["stored"],
                properties: { stored: { type: "boolean" } },
              },
              403: {
                type: "object",
                required: ["message"],
                properties: { message: { type: "string" } },
              },
              415: {
                type: "object",
                required: ["message"],
                properties: { message: { type: "string" } },
              },
            },
          },
        },
        async (request, reply) => {
          const { fileId } = request.params as { fileId: string };
          const { token } = request.query as { token: string };
          const claims = verifyFileToken(token, fileId, "upload", signingSecret);
          if (!claims?.contentType)
            return reply.code(403).send({ message: "Upload link is invalid or expired." });
          const contentType = request.headers["content-type"]?.split(";")[0] as
            ProfileImageContentType | undefined;
          const body = request.body;
          if (
            !contentType ||
            contentType !== claims.contentType ||
            !PROFILE_IMAGE_CONTENT_TYPES.includes(contentType) ||
            !Buffer.isBuffer(body) ||
            body.length > PROFILE_IMAGE_MAX_BYTES ||
            !matchesImageContentType(body, contentType)
          ) {
            return reply
              .code(415)
              .send({ message: "Upload must be a supported image under 5 MiB." });
          }
          try {
            await measureStorageOperation("put", () =>
              storage.put(`profile-pictures/${fileId}`, { body, contentType }),
            );
          } catch (error) {
            emitStructuredLog("profile_image.storage_failed", "error", {
              requestId: request.id,
              fileId,
              contentType,
              storageDriver: process.env.STORAGE_DRIVER ?? "filesystem",
              errorType: error instanceof Error ? error.name : "UnknownError",
            });
            throw error;
          }
          emitStructuredLog("profile_image.uploaded", "info", {
            requestId: request.id,
            fileId,
            contentType,
            sizeBytes: body.length,
            storageDriver: process.env.STORAGE_DRIVER ?? "filesystem",
          });
          return reply.send({ stored: true });
        },
      );

      routes.get(
        "/files/:fileId",
        {
          schema: {
            tags: ["files"],
            params: {
              type: "object",
              required: ["fileId"],
              properties: { fileId: { type: "string", format: "uuid" } },
            },
            querystring: {
              type: "object",
              required: ["token"],
              properties: { token: { type: "string", minLength: 40, maxLength: 2000 } },
            },
            response: {
              200: {
                description: "Image file bytes",
                type: "string",
                format: "binary",
              },
              403: {
                type: "object",
                required: ["message"],
                properties: { message: { type: "string" } },
              },
              404: {
                type: "object",
                required: ["message"],
                properties: { message: { type: "string" } },
              },
            },
          },
        },
        async (request, reply) => {
          const { fileId } = request.params as { fileId: string };
          const { token } = request.query as { token: string };
          if (!verifyFileToken(token, fileId, "download", signingSecret)) {
            return reply.code(403).send({ message: "Download link is invalid or expired." });
          }
          const file = await measureStorageOperation("get", () =>
            storage.get(`profile-pictures/${fileId}`),
          );
          if (!file) return reply.code(404).send({ message: "File not found." });
          return reply
            .header("X-Content-Type-Options", "nosniff")
            .header("Referrer-Policy", "no-referrer")
            .header("Cache-Control", "private, max-age=60")
            .type(file.contentType ?? "application/octet-stream")
            .send(file.body);
        },
      );
    }

    routes.get("/openapi.json", { schema: { hide: true } }, async (_request, reply) =>
      reply.send(app.swagger()),
    );
  });
  app.addHook("onReady", async () => {
    if (boss) {
      await boss.start();
      await boss.createQueue(EXAMPLE_JOB);
    }
  });
  app.addHook("onClose", async () => {
    await boss?.stop({ graceful: true, timeout: 10_000 });
    await database?.close();
    await storage.close?.();
  });
  return app;
}
