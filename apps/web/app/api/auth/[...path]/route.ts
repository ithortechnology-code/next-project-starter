const forwardedRequestHeaders = [
  "accept",
  "content-type",
  "cookie",
  "origin",
  "user-agent",
] as const;

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

async function proxyAuthRequest(request: Request): Promise<Response> {
  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, apiUrl);
  const headers = new Headers();

  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const method = request.method.toUpperCase();
  const upstream = await fetch(upstreamUrl, {
    method,
    headers,
    ...(method === "GET" || method === "HEAD" ? {} : { body: await request.arrayBuffer() }),
    cache: "no-store",
    redirect: "manual",
  });
  const responseHeaders = new Headers();

  upstream.headers.forEach((value, name) => {
    if (name !== "set-cookie" && !hopByHopHeaders.has(name)) responseHeaders.append(name, value);
  });

  const getSetCookie = (upstream.headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;
  for (const cookie of getSetCookie?.call(upstream.headers) ?? []) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyAuthRequest;
export const POST = proxyAuthRequest;
export const PUT = proxyAuthRequest;
export const PATCH = proxyAuthRequest;
export const DELETE = proxyAuthRequest;
export const OPTIONS = proxyAuthRequest;
