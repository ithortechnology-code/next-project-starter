import { trace, SpanStatusCode } from "@opentelemetry/api";
import nodemailer from "nodemailer";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  from: string;
}

export type AuthEmailPurpose = "verification" | "password-reset";

export function readEmailConfig(env: NodeJS.ProcessEnv = process.env): EmailConfig {
  const production = env.NODE_ENV === "production";
  const configuredHost = env.SMTP_HOST?.trim();
  const configuredFrom = env.EMAIL_FROM?.trim();
  if (production && !configuredHost) {
    throw new Error("SMTP_HOST is required in production.");
  }
  if (production && !configuredFrom) {
    throw new Error("EMAIL_FROM is required in production.");
  }

  const host = configuredHost || "127.0.0.1";
  const port = Number(env.SMTP_PORT ?? "1025");
  const secureValue = env.SMTP_SECURE ?? "false";
  const username = env.SMTP_USERNAME?.trim();
  const password = env.SMTP_PASSWORD;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }
  if (secureValue !== "true" && secureValue !== "false") {
    throw new Error("SMTP_SECURE must be either true or false.");
  }
  if (Boolean(username) !== Boolean(password)) {
    throw new Error("SMTP_USERNAME and SMTP_PASSWORD must be set together.");
  }

  const from = configuredFrom || "no-reply@example.local";
  return {
    host,
    port,
    secure: secureValue === "true",
    ...(username && password ? { username, password } : {}),
    from,
  };
}

export function createEmailClient(env: NodeJS.ProcessEnv = process.env) {
  const config = readEmailConfig(env);
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.username && config.password
      ? { auth: { user: config.username, pass: config.password } }
      : {}),
  });

  return {
    send(message: EmailMessage) {
      const { from, ...content } = message;
      return transport.sendMail({ ...content, from: from ?? config.from });
    },
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export function createAuthEmailContent(purpose: AuthEmailPurpose, url: string) {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Auth email links must use HTTP or HTTPS.");
  }

  const verification = purpose === "verification";
  const action = verification ? "verify your email address" : "reset your password";
  const title = verification ? "Verify your email address" : "Reset your password";
  const escapedUrl = escapeHtml(url);
  return {
    subject: title,
    text: `Use this link to ${action}:\n${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<!doctype html><html lang="en"><body><main><h1>${title}</h1><p>Use the link below to ${action}.</p><p><a href="${escapedUrl}">${title}</a></p><p>If you did not request this, you can ignore this email.</p></main></body></html>`,
  };
}

export function createAuthEmailCallbacks(
  email: ReturnType<typeof createEmailClient>,
  onDeliveryFailure: (purpose: AuthEmailPurpose, seconds: number) => void = () => {},
  onDeliverySuccess: (purpose: AuthEmailPurpose, seconds: number) => void = () => {},
) {
  function send(purpose: AuthEmailPurpose, to: string, url: string): void {
    const content = createAuthEmailContent(purpose, url);
    const started = performance.now();
    void trace
      .getTracer("starter-auth")
      .startActiveSpan(
        "auth.email",
        { attributes: { "auth.email.purpose": purpose } },
        async (span) => {
          try {
            await email.send({ to, ...content });
            try {
              onDeliverySuccess(purpose, (performance.now() - started) / 1000);
            } catch {}
          } catch {
            span.setStatus({ code: SpanStatusCode.ERROR });
            try {
              onDeliveryFailure(purpose, (performance.now() - started) / 1000);
            } catch {}
          } finally {
            span.end();
          }
        },
      );
  }

  return {
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      send("verification", user.email, url);
    },
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      send("password-reset", user.email, url);
    },
  };
}
