import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { safeTelemetryAttributes } from "./telemetry-privacy.js";

test("trace attribute allowlist excludes credentials and account identifiers", () => {
  assert.deepEqual(
    safeTelemetryAttributes({
      "http.route": "/api/auth/*",
      "url.full": "SENTINEL",
      "db.statement": "SENTINEL",
      email: "SENTINEL",
      "http.request.method": "POST",
    }),
    { "http.route": "/api/auth/*", "http.request.method": "POST" },
  );
});

test("actual OTLP export and structured auth logs contain no sentinel secrets", async () => {
  const received: { path: string; body: Buffer }[] = [];
  const receiver = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    received.push({ path: request.url ?? "", body: Buffer.concat(chunks) });
    response.setHeader("content-type", "application/json");
    response.end("{}");
  });
  await new Promise<void>((resolve) => receiver.listen(0, "127.0.0.1", resolve));
  const address = receiver.address();
  if (!address || typeof address === "string") throw Error("Receiver unavailable");
  try {
    const code = `
      const {startTelemetry}=await import('./src/telemetry.ts'); const stop=await startTelemetry();
      const {trace,context}=await import('@opentelemetry/api');
      const {withAuthRequest,recordAuthOperation,recordAuthLibraryLog}=await import('./src/auth-observability.ts');
      const span=trace.getTracer('privacy-test').startSpan('SECRET_SENTINEL');
      span.setAttributes({'url.full':'SECRET_SENTINEL','db.statement':'SECRET_SENTINEL','http.route':'/api/auth/*'});
      span.recordException(new Error('SECRET_SENTINEL'));span.end();
      context.with(trace.setSpan(context.active(),span),()=>withAuthRequest('privacy-request',()=>{recordAuthOperation('sign_in','rejected',0.01);recordAuthLibraryLog('error');}));
      const {createAuthEmailCallbacks}=await import('./src/email.ts');
      withAuthRequest('privacy-email-request',()=>createAuthEmailCallbacks({send:async()=>{throw Error('SECRET_SENTINEL');}},()=>recordAuthOperation('email_verification','failure',0.01)).sendVerificationEmail({user:{email:'SECRET_SENTINEL'},url:'https://example.test/?token=SECRET_SENTINEL'}));
      await new Promise(resolve=>setImmediate(resolve));
      process.env.DATABASE_URL='';process.env.FILE_URL_SIGNING_SECRET='privacy-test-file-signing-secret-32-bytes';process.env.NODE_ENV='test';
      const {createApp}=await import('./src/app.ts');const app=createApp();
      await app.inject({url:'/unknown/SECRET_SENTINEL?token=SECRET_SENTINEL'});await app.close();
      await stop();
    `;
    const child = spawn(process.execPath, ["--import=tsx", "--input-type=module", "-e", code], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: {
        ...process.env,
        OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${address.port}`,
        OTEL_EXPORTER_OTLP_PROTOCOL: "http/json",
        OTEL_SERVICE_NAME: "starter-test",
      },
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    const exit = await new Promise<number | null>((resolve) => child.on("close", resolve));
    assert.equal(exit, 0, output);
    assert.doesNotMatch(output, /SECRET_SENTINEL/);
    assert.match(output, /"event":"auth.operation"/);
    assert.match(output, /"requestId":"privacy-request"/);
    assert.match(output, /"traceId":"[a-f0-9]{32}"/);
    assert.match(output, /"entryPoint":"auth_http"/);
    assert.match(output, /"operation":"email_verification","outcome":"failure"/);
    assert.ok(received.some((item) => item.path === "/v1/traces"));
    assert.ok(received.some((item) => item.path === "/v1/metrics"));
    assert.ok(received.some((item) => item.path === "/v1/logs"));
    for (const item of received)
      assert.equal(item.body.includes(Buffer.from("SECRET_SENTINEL")), false);
  } finally {
    await new Promise<void>((resolve, reject) =>
      receiver.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
