import { defineConfig, devices } from "@playwright/test";

const database = process.env.AUTH_TEST_DATABASE_URL;
if (!database || !/(^|[_-])test($|[_-])/.test(new URL(database).pathname.slice(1))) {
  throw new Error("AUTH_TEST_DATABASE_URL must identify a disposable test database");
}

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: { baseURL: "http://localhost:3100", trace: "off", screenshot: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-web", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: [
    {
      command: "npm run dev --workspace=@starter/api",
      cwd: "../..",
      url: "http://localhost:4100/health",
      env: {
        DATABASE_URL: database,
        PORT: "4100",
        API_PORT: "4100",
        BETTER_AUTH_URL: "http://localhost:4100",
        BETTER_AUTH_SECRET: "browser-test-only-secret-minimum-32-bytes",
        AUTH_TRUSTED_ORIGINS: "http://localhost:3100,projectstarter://",
        WEB_ORIGIN: "http://localhost:3100",
        OTEL_EXPORTER_OTLP_ENDPOINT: "",
      },
    },
    {
      command: "npm run dev",
      url: "http://localhost:3100/sign-in",
      env: {
        NEXT_TEST_DIST_DIR: ".next-auth-test",
        WEB_PORT: "3100",
        API_URL: "http://localhost:4100",
      },
    },
  ],
});
