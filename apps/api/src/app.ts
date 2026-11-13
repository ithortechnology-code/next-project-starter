import cors from "@fastify/cors";
import Fastify from "fastify";
import pg from "pg";
import { healthResponseSchema, HEALTH_PATH } from "@starter/shared";

const { Pool } = pg;

export function createApp() {
  const app = Fastify({ logger: true });
  const databaseUrl = process.env.DATABASE_URL;
  const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : undefined;

  app.register(cors, { origin: process.env.WEB_ORIGIN?.split(",") ?? true });
  app.get(HEALTH_PATH, async (_request, reply) => {
    let database: "connected" | "unavailable" = "unavailable";
    if (pool) {
      try {
        await pool.query("SELECT 1");
        database = "connected";
      } catch (error) {
        app.log.warn({ err: error }, "Database health check failed");
      }
    }
    const body = healthResponseSchema.parse({ status: "ok", service: "api", database });
    return reply.code(database === "connected" || !pool ? 200 : 503).send(body);
  });
  app.addHook("onClose", async () => pool?.end());
  return app;
}
