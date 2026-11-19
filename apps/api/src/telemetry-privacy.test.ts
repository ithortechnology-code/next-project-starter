import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { gunzipSync } from "node:zlib";
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
  const received: { path: string; body: Buffer; encoding: string | undefined }[] = [];
  const receiver = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const encoding = request.headers["content-encoding"];
    const body = Buffer.concat(chunks);
    received.push({
      path: request.url ?? "",
      encoding,
      body: encoding === "gzip" ? gunzipSync(body) : body,
    });
    response.setHeader("content-type", "application/json");
    response.end("{}");
  });
  await new Promise<void>((resolve) => receiver.listen(0, "127.0.0.1", resolve));
  const address = receiver.address();
  if (!address || typeof address === "string") throw Error("Receiver unavailable");
  try {
    const code = `
      for (const name of Object.keys(process.env)) {
        if (name.startsWith('OTEL_EXPORTER_OTLP_') && name.endsWith('_COMPRESSION')) delete process.env[name];
      }
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
      app.addHook('onRequest', async (request, reply) => {
        if (request.headers['x-test-health-failure']) return reply.code(503).send();
      });
      const base=await app.listen({host:'127.0.0.1',port:0});
      const send=(path, options)=>fetch(base+path,options);
      await send('/health?token=SECRET_SENTINEL');
      await send('/health',{headers:{'x-test-health-failure':'1'}});
      await send('/unknown/SECRET_SENTINEL?token=SECRET_SENTINEL');
      await send('/api/telemetry/client',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({surface:'web',event:'js_error'}),
      });
      await app.close();
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
    for (const item of received) {
      assert.equal(item.encoding, "gzip");
      assert.doesNotMatch(item.body.toString(), /SECRET_SENTINEL/);
    }
    const signals = (path: string) =>
      received.filter((item) => item.path === path).map((item) => JSON.parse(item.body.toString()));
    const metrics = signals("/v1/metrics").flatMap((data) =>
      data.resourceMetrics.flatMap((resource: any) =>
        resource.scopeMetrics.flatMap((scope: any) => scope.metrics),
      ),
    );
    assert.ok(metrics.some((metric) => metric.name === "starter.client.event.count"));
    assert.ok(metrics.some((metric) => metric.name === "starter.http.server.request.duration"));
    assert.ok(
      !metrics.some((metric) => /^http\.server\.|^nodejs\.eventloop\.delay\./.test(metric.name)),
    );
    const requestMetric = metrics.find(
      (metric) => metric.name === "starter.http.server.request.count",
    );
    const healthPoints = requestMetric.sum.dataPoints.filter((point: any) =>
      point.attributes.some(
        (attr: any) => attr.key === "http.route" && attr.value.stringValue === "/health",
      ),
    );
    assert.equal(healthPoints.length, 1);
    assert.ok(healthPoints[0].attributes.some((attr: any) => attr.value.stringValue === "5xx"));
    const httpSpans = signals("/v1/traces").flatMap((data) =>
      data.resourceSpans.flatMap((resource: any) =>
        resource.scopeSpans
          .filter((scope: any) => scope.scope.name === "@opentelemetry/instrumentation-http")
          .flatMap((scope: any) => scope.spans),
      ),
    );
    assert.equal(httpSpans.length, 1);
    assert.ok(
      httpSpans[0].attributes.some(
        (attr: any) =>
          ["http.status_code", "http.response.status_code"].includes(attr.key) &&
          Number(attr.value.intValue) === 404,
      ),
    );
    const logs = JSON.stringify(signals("/v1/logs"));
    assert.match(logs, /http.request.failed/);
    assert.match(logs, /client.error/);
    assert.doesNotMatch(output, /"route":"\/health"[^\n]+"msg":"incoming request"/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      receiver.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
