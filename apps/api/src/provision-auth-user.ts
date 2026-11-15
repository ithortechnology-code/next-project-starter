import { randomUUID } from "node:crypto";
import { withAuthRequest } from "./auth-observability.js";
import { emitStructuredLog } from "./telemetry-signals.js";
import { createAuth } from "./auth.js";
import { createDatabase } from "./database.js";

const requestId = randomUUID();
const entryPoint = "auth_provision_cli";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local auth account provisioning is disabled in production.");
  }
  if (process.env.AUTH_ENABLE_LOCAL_PROVISIONING !== "true") {
    throw new Error("Set AUTH_ENABLE_LOCAL_PROVISIONING=true in the ignored local .env to opt in.");
  }

  const email = process.env.AUTH_PROVISION_EMAIL?.trim();
  const password = process.env.AUTH_PROVISION_PASSWORD;
  const name = process.env.AUTH_PROVISION_NAME?.trim() || email;
  if (!email || !password || !name) {
    throw new Error(
      "Set AUTH_PROVISION_EMAIL, AUTH_PROVISION_PASSWORD, and AUTH_PROVISION_NAME in .env.",
    );
  }
  if (password.length < 8 || password.length > 128) {
    throw new Error("AUTH_PROVISION_PASSWORD must contain 8 to 128 characters.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error("DATABASE_URL is required to provision a local/test auth user.");
  const databaseHost = new URL(databaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(databaseHost)) {
    throw new Error("Local auth account provisioning only accepts a loopback DATABASE_URL.");
  }

  const { db, close } = createDatabase();
  try {
    const auth = createAuth(db, process.env, { allowSignUp: true, autoSignIn: false });
    await auth.api.signUpEmail({
      body: { email, password, name, callbackURL: process.env.WEB_ORIGIN },
    });
    emitStructuredLog("auth.provision.completed", "info", { requestId, entryPoint });
  } finally {
    await close();
  }
}

withAuthRequest(requestId, main, entryPoint).catch(() => {
  emitStructuredLog("auth.provision.failed", "error", {
    requestId,
    entryPoint,
    reason: "Check database, local provisioning opt-in, and auth settings.",
  });
  process.exitCode = 1;
});
