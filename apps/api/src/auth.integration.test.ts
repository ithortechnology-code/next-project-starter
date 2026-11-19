import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { sql } from "kysely";
import { readAuthConfig } from "./auth.js";
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
process.env.AUTH_TRUSTED_ORIGINS = "http://localhost:3000,exp://127.0.0.1:8081,projectstarter://";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.FILE_URL_SIGNING_SECRET = "auth-integration-test-file-signing-secret";
process.env.STORAGE_DRIVER = "filesystem";
process.env.FILE_STORAGE_DIRECTORY = ".data/auth-integration-test-files";
process.env.NODE_ENV = "test";

const { createApp, redactSensitiveRequestUrl } = await import("./app.js");
const database = createDatabase(databaseUrl);
const app = createApp();
const email = `auth-${randomUUID()}@example.test`;
const password = `test-${randomUUID()}-Aa1!`;
const name = "Auth Integration Test";
let activePassword = password;
const mailpitApiUrl =
  process.env.MAILPIT_API_URL ?? `http://127.0.0.1:${process.env.MAILPIT_UI_PORT ?? "8025"}`;

interface MailpitSummary {
  ID: string;
  Subject: string;
}

interface MailpitMessage extends MailpitSummary {
  HTML: string;
  Text: string;
}

async function findAuthEmail(subject: string): Promise<MailpitMessage> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(
      `${mailpitApiUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    assert.equal(response.status, 200, "Mailpit API must be available for auth tests");
    const result = (await response.json()) as { messages: MailpitSummary[] };
    const summary = result.messages.find((message) => message.Subject === subject);
    if (summary) {
      const messageResponse = await fetch(`${mailpitApiUrl}/api/v1/message/${summary.ID}`);
      assert.equal(messageResponse.status, 200);
      return (await messageResponse.json()) as MailpitMessage;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(`Mailpit did not receive the expected ${subject} message`);
}

async function deleteAuthEmails(): Promise<void> {
  const url = `${mailpitApiUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`;
  const response = await fetch(url, {
    method: "DELETE",
  });
  assert.equal(response.status, 200, "Mailpit must remove test auth messages during cleanup");
  const remaining = await fetch(url);
  assert.equal(remaining.status, 200);
  const result = (await remaining.json()) as { messages: MailpitSummary[] };
  assert.equal(result.messages.length, 0, "test auth messages must be removed");
}

before(async () => {
  await app.ready();
});

after(async () => {
  try {
    await app.close();
    await deleteAuthEmails();
    await sql`delete from "user" where "email" = ${email}`.execute(database.db);
  } finally {
    await database.close();
  }
});

test("the interactive reference uses the combined starter and auth contract", async () => {
  const response = await app.inject("/openapi.json");
  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.openapi, "3.1.1");
  assert.ok(document.paths["/health"].get);
  assert.ok(document.paths["/api/auth/sign-up/email"].post.requestBody.required);
  assert.deepEqual(document.paths["/api/auth/sign-in/email"].post.security, []);
  assert.deepEqual(document.paths["/api/auth/list-sessions"].get.security, [{ authSession: [] }]);
  assert.ok(document.paths["/api/auth/reset-password/{token}"].get.responses["302"]);
  assert.ok(document.paths["/api/auth/expo-authorization-proxy"].get);
  assert.equal(document.paths["/api/auth/*"], undefined);
  assert.ok(document.paths["/files/{fileId}"].put.requestBody.content["image/png"]);
  assert.deepEqual(document.paths["/files/{fileId}"].get.security, [{ signedFileUrl: [] }]);
  const ui = await app.inject("/docs/");
  assert.equal(ui.statusCode, 200);
  assert.match(ui.body, /swagger-ui/);
  assert.deepEqual((await app.inject("/docs/json")).json(), document);
  assert.equal((await app.inject("/api/auth/open-api/generate-schema")).statusCode, 404);
});

test("public registration requires verification before sign-in and sends a verification link", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    headers: { origin: "http://localhost:3000" },
    payload: { name, email, password, callbackURL: "http://localhost:3000/verify-email" },
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal((response.json() as { user: { emailVerified: boolean } }).user.emailVerified, false);
  assert.doesNotMatch(response.body, /token=/i);
  assert.doesNotMatch(response.body, new RegExp(password));
  assert.equal(response.headers["set-cookie"], undefined);

  const unverifiedSignIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, password },
  });
  assert.equal(unverifiedSignIn.statusCode, 403);
  assert.equal(unverifiedSignIn.cookies.length, 0);

  const message = await findAuthEmail("Verify your email address");
  assert.match(message.Text, /http:\/\/localhost:4000\/api\/auth\/verify-email\?token=/);
  assert.match(message.HTML, /href="http:\/\/localhost:4000\/api\/auth\/verify-email\?token=/);
  assert.doesNotMatch(message.Text + message.HTML, new RegExp(password));

  const verificationUrl = new URL(message.Text.match(/https?:\/\/\S+/)?.[0] ?? "");
  const verification = await app.inject({
    method: "GET",
    url: `${verificationUrl.pathname}${verificationUrl.search}`,
    headers: { origin: "http://localhost:3000" },
  });
  assert.ok(verification.statusCode >= 200 && verification.statusCode < 400, verification.body);
  const storedUser = await sql<{
    emailVerified: boolean;
  }>`select "emailVerified" from "user" where "email" = ${email}`.execute(database.db);
  assert.equal(storedUser.rows[0]?.emailVerified, true);
  const session = await app.inject({ method: "GET", url: "/api/auth/get-session" });
  assert.equal(session.body, "null");
});

test("verification resend sends a fresh link and consumed links cannot be reused", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/send-verification-email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, callbackURL: "http://localhost:3000/verify-email" },
  });
  assert.equal(response.statusCode, 200, response.body);
  const message = await findAuthEmail("Verify your email address");
  const verificationUrl = new URL(message.Text.match(/https?:\/\/\S+/)?.[0] ?? "");
  const consumed = await app.inject({
    method: "GET",
    url: `${verificationUrl.pathname}${verificationUrl.search}`,
    headers: { origin: "http://localhost:3000" },
  });
  assert.ok(consumed.statusCode >= 200 && consumed.statusCode < 400);
  const reused = await app.inject({
    method: "GET",
    url: `${verificationUrl.pathname}${verificationUrl.search}`,
    headers: { origin: "http://localhost:3000" },
  });
  assert.ok(reused.statusCode >= 200 && reused.statusCode < 400);
  assert.equal(reused.headers.location, "http://localhost:3000/verify-email");
  assert.equal((await app.inject({ method: "GET", url: "/api/auth/get-session" })).body, "null");
});

test("expired and malformed verification tokens cannot verify a new account", async () => {
  const pendingEmail = `pending-${randomUUID()}@example.test`;
  const registration = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    headers: { origin: "http://localhost:3000" },
    payload: { name, email: pendingEmail, password },
  });
  assert.equal(registration.statusCode, 200, registration.body);
  try {
    const message = await findAuthEmail("Verify your email address");
    const verificationUrl = new URL(message.Text.match(/https?:\/\/\S+/)?.[0] ?? "");
    const userId = (registration.json() as { user: { id: string } }).user.id;
    const { SignJWT } = await import("jose");
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = await new SignJWT({ email: pendingEmail, userId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now - 7200)
      .setExpirationTime(now - 3600)
      .sign(new TextEncoder().encode(process.env.BETTER_AUTH_SECRET));
    verificationUrl.searchParams.set("token", expiredToken);
    const expired = await app.inject({
      method: "GET",
      url: `${verificationUrl.pathname}${verificationUrl.search}`,
      headers: { origin: "http://localhost:3000" },
    });
    assert.match(expired.headers.location ?? "", /error=TOKEN_EXPIRED/i);
    const malformed = await app.inject({
      method: "GET",
      url: `/api/auth/verify-email?token=malformed-token&callbackURL=${encodeURIComponent("http://localhost:3000/verify-email")}`,
      headers: { origin: "http://localhost:3000" },
    });
    assert.match(malformed.headers.location ?? "", /error=INVALID_TOKEN/i);
    const user = await sql<{
      emailVerified: boolean;
    }>`select "emailVerified" from "user" where "email" = ${pendingEmail}`.execute(database.db);
    assert.equal(user.rows[0]?.emailVerified, false);
  } finally {
    await sql`delete from "user" where "email" = ${pendingEmail}`.execute(database.db);
    const cleanupUrl = `${mailpitApiUrl}/api/v1/search?query=${encodeURIComponent(`to:${pendingEmail}`)}`;
    await fetch(cleanupUrl, { method: "DELETE" });
  }
});

test("sessions use rolling seven-day expiry and expired sessions cannot be refreshed", async () => {
  const signIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, password: activePassword, rememberMe: true },
  });
  assert.equal(signIn.statusCode, 200, signIn.body);
  const signInBody = signIn.json() as { token: string };
  const cookies = signIn.cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
  const initialSession = await sql<{
    expiresAt: Date;
  }>`select "expiresAt" from "session" where "token" = ${signInBody.token}`.execute(database.db);
  const initialExpiry = Date.parse(String(initialSession.rows[0]?.expiresAt ?? 0));
  const now = Date.now();
  assert.ok(initialExpiry >= now + 6.9 * 24 * 60 * 60 * 1000);
  assert.ok(initialExpiry <= now + 7.1 * 24 * 60 * 60 * 1000);

  const refreshedExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  await sql`update "session" set "expiresAt" = ${refreshedExpiry} where "userId" = (select "id" from "user" where "email" = ${email})`.execute(
    database.db,
  );
  const refreshed = await app.inject({
    method: "GET",
    url: "/api/auth/get-session",
    headers: { cookie: cookies },
  });
  assert.equal(refreshed.statusCode, 200);
  const refreshedSession = refreshed.json() as { session: { expiresAt: string } };
  assert.ok(Date.parse(refreshedSession.session.expiresAt) > refreshedExpiry.getTime());
  assert.ok(
    Date.parse(refreshedSession.session.expiresAt) >= Date.now() + 6.9 * 24 * 60 * 60 * 1000,
  );

  await sql`update "session" set "expiresAt" = now() - interval '1 second' where "userId" = (select "id" from "user" where "email" = ${email})`.execute(
    database.db,
  );
  const expired = await app.inject({
    method: "GET",
    url: "/api/auth/get-session",
    headers: { cookie: cookies },
  });
  assert.equal(expired.body, "null");
});

test("password reset revokes active sessions and only the new password signs in", async () => {
  const signedIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, password: activePassword },
  });
  assert.equal(signedIn.statusCode, 200, signedIn.body);
  const cookies = signedIn.cookies.map(({ name, value }) => `${name}=${value}`).join("; ");

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/request-password-reset",
    headers: { origin: "http://localhost:3000" },
    payload: { email, redirectTo: "http://localhost:3000/reset-password" },
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.match(response.body, /If this email exists in our system/);
  assert.doesNotMatch(response.body, /token=/i);
  assert.doesNotMatch(response.body, new RegExp(password));
  assert.equal(response.headers["set-cookie"], undefined);
  const message = await findAuthEmail("Reset your password");
  assert.match(message.Text, /http:\/\/localhost:4000\/api\/auth\/reset-password\//);
  assert.match(message.HTML, /href="http:\/\/localhost:4000\/api\/auth\/reset-password\//);
  assert.doesNotMatch(message.Text + message.HTML, new RegExp(password));

  const resetUrl = new URL(message.Text.match(/https?:\/\/\S+/)?.[0] ?? "");
  const resetLanding = await app.inject({
    method: "GET",
    url: `${resetUrl.pathname}${resetUrl.search}`,
    headers: { origin: "http://localhost:3000" },
  });
  assert.equal(resetLanding.statusCode, 302, resetLanding.body);
  const resetToken = new URL(resetLanding.headers.location ?? "").searchParams.get("token");
  assert.ok(resetToken);
  const newPassword = `updated-${randomUUID()}-Bb2!`;
  const reset = await app.inject({
    method: "POST",
    url: "/api/auth/reset-password",
    headers: { origin: "http://localhost:3000" },
    payload: { token: resetToken, newPassword },
  });
  assert.equal(reset.statusCode, 200, reset.body);
  assert.doesNotMatch(reset.body, new RegExp(newPassword));

  const oldSession = await app.inject({
    method: "GET",
    url: "/api/auth/get-session",
    headers: { cookie: cookies },
  });
  assert.equal(oldSession.json(), null);
  const oldPasswordSignIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, password: activePassword },
  });
  assert.ok(oldPasswordSignIn.statusCode >= 400);
  const newPasswordSignIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, password: newPassword },
  });
  assert.equal(newPasswordSignIn.statusCode, 200, newPasswordSignIn.body);
  activePassword = newPassword;
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

test("request logs redact verification query tokens and reset path tokens", () => {
  assert.equal(
    redactSensitiveRequestUrl(
      "/api/auth/verify-email?token=verification-secret&callbackURL=%2Fhome",
    ),
    "/api/auth/verify-email?token=[REDACTED]&callbackURL=[REDACTED]",
  );
  assert.equal(
    redactSensitiveRequestUrl("/api/auth/reset-password/password-secret?callbackURL=%2Freset"),
    "/api/auth/reset-password/[REDACTED]?callbackURL=[REDACTED]",
  );
});

test("anonymous session lookup returns no authenticated user", async () => {
  const response = await app.inject({ method: "GET", url: "/api/auth/get-session" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json(), null);
});

test("duplicate registration returns a generic response without a session", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, password: activePassword, name },
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.doesNotMatch(response.body, /token=/i);
  assert.equal(response.headers["set-cookie"], undefined);
});

test("sign-in, session lookup, invalid credentials, and sign-out revoke the active session", async () => {
  const valid = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email, password: activePassword },
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
    payload: { email, password: `${activePassword}-wrong` },
  });
  assert.ok(invalid.statusCode >= 400);
  assert.equal(invalid.cookies.length, 0);

  const unknownEmail = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "http://localhost:3000" },
    payload: { email: `unknown-${randomUUID()}@example.test`, password: activePassword },
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
    payload: { email, password: activePassword },
  });
  assert.ok(untrustedSignIn.statusCode >= 400);
  assert.equal(untrustedSignIn.cookies.length, 0);

  const expoSignIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: "exp://127.0.0.1:8081" },
    payload: { email, password: activePassword },
  });
  assert.equal(expoSignIn.statusCode, 200, expoSignIn.body);

  const nativeSchemeSignIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { "expo-origin": "projectstarter://" },
    payload: { email, password: activePassword },
  });
  assert.equal(nativeSchemeSignIn.statusCode, 200, nativeSchemeSignIn.body);
});
