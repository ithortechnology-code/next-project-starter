import {
  CLIENT_TELEMETRY_BODY_LIMIT,
  CLIENT_TELEMETRY_PATH,
} from "@starter/shared/client-telemetry";

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return new Response(null, { status: 415 });
  if (!request.body) return new Response(null, { status: 400 });

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > CLIENT_TELEMETRY_BODY_LIMIT) {
        void reader.cancel().catch(() => undefined);
        return new Response(null, { status: 413 });
      }
      chunks.push(chunk.value);
    }

    const upstream = await fetch(
      new URL(CLIENT_TELEMETRY_PATH, process.env.API_URL ?? "http://localhost:4000"),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: Buffer.concat(chunks, size),
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      },
    );
    return upstream;
  } catch {
    return new Response(null, { status: 503 });
  } finally {
    reader.releaseLock();
  }
}
