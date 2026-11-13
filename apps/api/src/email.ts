import nodemailer from "nodemailer";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export function createEmailClient(config: NodeJS.ProcessEnv = process.env) {
  const host = config.SMTP_HOST ?? "127.0.0.1";
  const port = Number(config.SMTP_PORT ?? "1025");
  const secure = config.SMTP_SECURE === "true";
  const username = config.SMTP_USERNAME;
  const password = config.SMTP_PASSWORD;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }
  if (Boolean(username) !== Boolean(password)) {
    throw new Error("SMTP_USERNAME and SMTP_PASSWORD must be set together.");
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(username && password ? { auth: { user: username, pass: password } } : {}),
  });
  const defaultFrom = config.EMAIL_FROM ?? "no-reply@example.local";

  return {
    send(message: EmailMessage) {
      const { from, ...content } = message;
      return transport.sendMail({ ...content, from: from ?? defaultFrom });
    },
  };
}
