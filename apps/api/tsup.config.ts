import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/worker.ts", "src/migrate.ts", "src/migrations/*.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  noExternal: ["@starter/shared", "@starter/storage"],
});
