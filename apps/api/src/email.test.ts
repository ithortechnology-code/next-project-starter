import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthEmailCallbacks, createAuthEmailContent, readEmailConfig } from "./email.js";

test("local email configuration defaults to the Mailpit SMTP endpoint", () => {
  assert.deepEqual(readEmailConfig({ NODE_ENV: "development" }), {
    host: "127.0.0.1",
    port: 1025,
    secure: false,
    from: "no-reply@example.local",
  });
});

test("production email configuration requires an explicit SMTP host and sender", () => {
  assert.throws(() => readEmailConfig({ NODE_ENV: "production" }), /SMTP_HOST is required/);
  assert.throws(
    () => readEmailConfig({ NODE_ENV: "production", SMTP_HOST: "smtp.example.test" }),
    /EMAIL_FROM is required/,
  );
  assert.deepEqual(
    readEmailConfig({
      NODE_ENV: "production",
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
      EMAIL_FROM: "accounts@example.test",
    }),
    {
      host: "smtp.example.test",
      port: 465,
      secure: true,
      from: "accounts@example.test",
    },
  );
});

test("email configuration rejects invalid ports, TLS flags, and incomplete credentials", () => {
  assert.throws(() => readEmailConfig({ SMTP_PORT: "0" }), /SMTP_PORT/);
  assert.throws(() => readEmailConfig({ SMTP_SECURE: "yes" }), /SMTP_SECURE/);
  assert.throws(() => readEmailConfig({ SMTP_USERNAME: "mailer" }), /must be set together/);
});

test("auth email content includes safe text and HTML links", () => {
  const content = createAuthEmailContent(
    "verification",
    "https://api.example.test/verify?token=abc&callbackURL=%2Fhome",
  );

  assert.equal(content.subject, "Verify your email address");
  assert.match(content.text, /https:\/\/api\.example\.test\/verify\?token=abc&callbackURL=/);
  assert.match(
    content.html,
    /href="https:\/\/api\.example\.test\/verify\?token=abc&amp;callbackURL=/,
  );
  assert.match(content.html, /If you did not request this/);
  assert.throws(() => createAuthEmailContent("password-reset", "javascript:alert(1)"));
});

test("auth email delivery failures report only the message purpose", async () => {
  let reportFailure: ((purpose: "verification" | "password-reset") => void) | undefined;
  const failure = new Promise<string>((resolve) => {
    reportFailure = resolve;
  });
  const callbacks = createAuthEmailCallbacks(
    {
      send: async () => {
        throw new Error("contains private SMTP address and body");
      },
    },
    (purpose) => reportFailure?.(purpose),
  );

  callbacks.sendResetPassword({
    user: { email: "person@example.test" },
    url: "https://api.example.test/reset",
  });

  assert.equal(await failure, "password-reset");
});
