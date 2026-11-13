import { startTelemetry } from "./telemetry.js";

const shutdownTelemetry = await startTelemetry();
const { createApp } = await import("./app.js");
const app = createApp();
const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await app.close();
    } finally {
      await shutdownTelemetry?.();
    }
  };

  const handleShutdown = () => {
    void shutdown().catch((error) => {
      app.log.error(error, "Graceful shutdown failed");
      process.exitCode = 1;
    });
  };

  process.once("SIGTERM", handleShutdown);
  process.once("SIGINT", handleShutdown);
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
