import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import Fastify, { type FastifyReply } from "fastify";
import { healthResponseSchema, HEALTH_PATH } from "@starter/shared";
import { z } from "zod";
import { checkDatabaseConnection, createDatabase } from "./database.js";
import { createJobQueue, enqueueExampleJob, EXAMPLE_JOB } from "./jobs.js";
import { createConfiguredStorage, type FileStorage } from "@starter/storage";

declare module "fastify" {
  interface FastifyInstance {
    storage: FileStorage;
  }
}

const healthJsonSchema = z.toJSONSchema(healthResponseSchema, { target: "openapi-3.0" });

export function createApp() {
  const app = Fastify({ logger: true });
  const database = process.env.DATABASE_URL ? createDatabase() : undefined;
  const boss = process.env.DATABASE_URL ? createJobQueue() : undefined;
  const storage = createConfiguredStorage();
  app.decorate("storage", storage);

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
