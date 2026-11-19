import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./app.js";

test("client telemetry accepts bounded anonymous events and documents intake", async () => {
  process.env.DATABASE_URL = "";
  process.env.NODE_ENV = "test";
  process.env.FILE_URL_SIGNING_SECRET = "local-test-file-signing-secret-minimum-32";
  const app = createApp();
  try {
    const payload = { surface: "web", event: "session_started" };
    const report = (body: unknown) =>
      app.inject({
        method: "POST",
        url: "/api/telemetry/client",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(body),
      });
    assert.equal((await report(payload)).statusCode, 204);
    assert.equal((await report({ ...payload, message: "PRIVATE_SENTINEL" })).statusCode, 400);
    assert.equal((await report({ ...payload, surface: "unknown" })).statusCode, 400);
    assert.equal((await report({ ...payload, message: "x".repeat(1100) })).statusCode, 413);
    const docs = (await app.inject("/docs/json")).json();
    const operation = docs.paths["/api/telemetry/client"].post;
    assert.deepEqual(operation.security, []);
    assert.ok(operation.requestBody.required);
    assert.ok(operation.responses["429"]);
    for (let i = 0; i < 119; i++) assert.equal((await report(payload)).statusCode, 204);
    const limited = await report(payload);
    assert.equal(limited.statusCode, 429);
    assert.ok(Number(limited.headers["retry-after"]) > 0);
  } finally {
    await app.close();
  }
});
