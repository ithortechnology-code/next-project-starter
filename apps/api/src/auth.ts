import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import type { Kysely } from "kysely";
import type { Database } from "./database.js";
import { createAuthEmailCallbacks, createEmailClient, type AuthEmailPurpose } from "./email.js";

export interface AuthConfig {
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
}

export interface AuthOptions {
  allowSignUp?: boolean;
  autoSignIn?: boolean;
  onEmailDeliveryFailure?: (purpose: AuthEmailPurpose) => void;
}

export function readAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const production = env.NODE_ENV === "production";
  const secret = env.BETTER_AUTH_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET must contain at least 32 bytes. Generate one with `node -e \"console.log(require('node:crypto').randomBytes(32).toString('base64'))\"`.",
    );
  }

  const configuredBaseURL =
    env.BETTER_AUTH_URL?.trim() || (production ? undefined : env.API_PUBLIC_URL?.trim());
  if (!configuredBaseURL) {
    throw new Error("BETTER_AUTH_URL is required and must be the public API origin.");
  }

  let baseURL: string;
  try {
    const url = new URL(configuredBaseURL);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash
    ) {
      throw new Error();
    }
    baseURL = url.origin;
  } catch {
    throw new Error(
      "BETTER_AUTH_URL must be an HTTP(S) origin without credentials, path, query, or fragment.",
    );
  }

  const originsValue =
    env.AUTH_TRUSTED_ORIGINS?.trim() || (production ? undefined : (env.WEB_ORIGIN ?? baseURL));
  const trustedOrigins = originsValue
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!trustedOrigins?.length) {
    throw new Error("AUTH_TRUSTED_ORIGINS must list the allowed web and native app origins.");
  }

  for (const origin of trustedOrigins) {
    if (origin.includes("*")) {
      throw new Error("AUTH_TRUSTED_ORIGINS must use explicit origins; wildcards are not allowed.");
    }
    try {
      const url = new URL(origin);
      if (["blob:", "data:", "file:", "javascript:"].includes(url.protocol)) throw new Error();
      if (url.protocol === "http:" || url.protocol === "https:") {
        if (url.origin !== origin.replace(/\/$/, "")) throw new Error();
      } else if (!origin.startsWith(`${url.protocol}//`)) {
        throw new Error();
      }
    } catch {
      throw new Error(`Invalid auth trusted origin: ${origin}`);
    }
  }

  return { secret, baseURL, trustedOrigins };
}

export function createAuth(
  db: Kysely<Database>,
  env: NodeJS.ProcessEnv = process.env,
  options: AuthOptions = {},
) {
  const config = readAuthConfig(env);
  const authEmail = createAuthEmailCallbacks(
    createEmailClient(env),
    options.onEmailDeliveryFailure,
  );
  return betterAuth({
    appName: "Project Starter",
    baseURL: config.baseURL,
    basePath: "/api/auth",
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: { db: db as Kysely<any>, type: "postgres", casing: "camel" },
    emailAndPassword: {
      enabled: true,
      disableSignUp: options.allowSignUp === false,
      autoSignIn: options.autoSignIn ?? false,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: authEmail.sendResetPassword,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: authEmail.sendVerificationEmail,
    },
    plugins: [expo()],
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      cookieCache: { enabled: false },
    },
    telemetry: { enabled: false },
  });
}

export function readAuthTrustedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  return readAuthConfig(env).trustedOrigins;
}
