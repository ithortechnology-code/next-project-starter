import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { sql } from "kysely";
import { createAuth, readAuthConfig } from "./auth.js";
import { createDatabase } from "./database.js";

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("AUTH_TEST_DATABASE_URL must point to a disposable PostgreSQL database.");
}
const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
if (!/(^|[_-])test($|[_-])/.test(databaseName)) {
  throw new Error("AUTH_TEST_DATABASE_URL database name must clearly identify a test database.");
}

process.env.DATABASE_URL = databaseUrl;
process.env.BETTER_AUTH_SECRET = "auth-integration-test-secret-32-bytes-minimum";
process.env.BETTER_AUTH_URL = "http://localhost:4000";
process.env.AUTH_TRUSTED_ORIGINS = "http://localhost:3000,exp://127.0.0.1:8081";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.FILE_URL_SIGNING_SECRET = "auth-integration-test-file-signing-secret";
process.env.STORAGE_DRIVER = "filesystem";
process.env.FILE_STORAGE_DIRECTORY = ".data/auth-integration-test-files";
process.env.NODE_ENV = "test";

const { createApp } = await import("./app.js");
const database = createDatabase(databaseUrl);
const app = createApp();
const email = `auth-${randomUUID()}@example.test`;
const password = `test-${randomUUID()}-Aa1!`;
const name = "Auth Integration Test";

before(async () => {
  await app.ready();
  const provisioner = createAuth(database.db, process.env, {
    allowSignUp: true,
    autoSignIn: false,
  });
  await provisioner.api.signUpEmail({ body: { email, password, name } });
});

after(async () => {
  try {
    await app.close();
    await sql`delete from "user" where "email" = ${email}`.execute(database.db);
  } finally {
    await database.close();
  }
});

test("auth config rejects missing secrets and wildcard origins in production", () => {
  assert.throws(
    () => readAuthConfig({ NODE_ENV: "production", BETTER_AUTH_URL: "https://api.example.test" }),
    /BETTER_AUTH_SECRET/,
  );
  assert.throws(
    () =>
      readAuthConfig({
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "auth-integration-test-secret-32-bytes-minimum",
        BETTER_AUTH_URL: "https://api.example.test",
        AUTH_TRUSTED_ORIGINS: "https://*.example.test",
      }),
    /wildcards are not allowed/,
  );
});

test("anonymous session lookup returns no authenticated user", async () => {
  const response = await app.inject({ method: "GET", url: "/api/auth/get-session" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json(), null);
});

test("public sign-up remains disabled", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email: `public-${randomUUID()}@example.test`, password, name },
  });
  assert.ok(response.statusCode >= 400);
});

test("sign-in, session lookup, invalid credentials, and sign-out work through Fastify", async () => {
  const valid = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, password },
  });
  assert.equal(valid.statusCode, 200, valid.body);
  assert.match(valid.headers["set-cookie"]?.toString() ?? "", /better-auth\.session_token=/);
  const cookies = valid.cookies
    .map(({ name: cookieName, value }) => `${cookieName}=${value}`)
    .join("; ");

  const authenticated = await app.inject({
    method: "GET",
    url: "/api/auth/get-session",
    headers: { cookie: cookies, origin: "http://localhost:3000" },
  });
  assert.equal(authenticated.statusCode, 200);
  assert.equal(authenticated.json().user.email, email);

  const invalid = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, password: `${password}-wrong` },
  });
  assert.ok(invalid.statusCode >= 400);
  assert.equal(invalid.cookies.length, 0);

  const unknownEmail = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email: `unknown-${randomUUID()}@example.test`, password },
  });
  assert.equal(unknownEmail.statusCode, invalid.statusCode);
  assert.equal(unknownEmail.json().message, invalid.json().message);
  assert.equal(unknownEmail.cookies.length, 0);

  const signOut = await app.inject({
    method: "POST",
    url: "/api/auth/sign-out",
    headers: { cookie: cookies, origin: "http://localhost:3000" },
    payload: {},
  });
  assert.equal(signOut.statusCode, 200, signOut.body);
  const afterSignOut = await app.inject({
    method: "GET",
    url: "/api/auth/get-session",
    headers: { cookie: cookies },
  });
  assert.equal(afterSignOut.json(), null);
});

test("credentialed CORS permits configured origins and rejects untrusted origins", async () => {
  const trusted = await app.inject({
    method: "OPTIONS",
    url: "/api/auth/sign-in/email",
    headers: {
      origin: "http://localhost:3000",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });
  assert.equal(trusted.statusCode, 204);
  assert.equal(trusted.headers["access-control-allow-origin"], "http://localhost:3000");
  assert.equal(trusted.headers["access-control-allow-credentials"], "true");

  const untrusted = await app.inject({
    method: "OPTIONS",
    url: "/api/auth/sign-in/email",
    headers: {
      origin: "https://untrusted.example.test",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });
  assert.equal(untrusted.statusCode, 404);
  assert.equal(untrusted.headers["access-control-allow-origin"], undefined);

  const untrustedSignIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "https://untrusted.example.test" },
    payload: { email, password },
  });
  assert.ok(untrustedSignIn.statusCode >= 400);
  assert.equal(untrustedSignIn.cookies.length, 0);

  const expoSignIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "exp://127.0.0.1:8081" },
    payload: { email, password },
  });
  assert.equal(expoSignIn.statusCode, 200, expoSignIn.body);
});
