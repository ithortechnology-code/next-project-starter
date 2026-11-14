import { authSessionResponseSchema, type AuthSessionResponse } from "@starter/shared";
import { headers } from "next/headers";

export type ServerSessionResult =
  | { kind: "authenticated"; session: AuthSessionResponse }
  | { kind: "anonymous" }
  | { kind: "unavailable" };

export async function getServerSession(): Promise<ServerSessionResult> {
  try {
    const requestHeaders = await headers();
    const cookie = requestHeaders.get("cookie");
    const response = await fetch(
      new URL("/api/auth/get-session", process.env.API_URL ?? "http://localhost:4000"),
      {
        ...(cookie ? { headers: { cookie } } : {}),
        cache: "no-store",
      },
    );

    if (!response.ok) return { kind: "unavailable" };
    const payload: unknown = await response.json();
    if (payload === null) return { kind: "anonymous" };

    const parsed = authSessionResponseSchema.safeParse(payload);
    if (!parsed.success) return { kind: "unavailable" };
    return { kind: "authenticated", session: parsed.data };
  } catch {
    return { kind: "unavailable" };
  }
}

export function safeReturnPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return "/app";
  }

  try {
    const parsed = new URL(candidate, "https://starter.invalid");
    if (parsed.origin !== "https://starter.invalid") return "/app";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/app";
  }
}
