# Email

The API uses SMTP settings rather than a provider SDK. Each product selects its provider and supplies the provider's SMTP host, port, TLS mode, credentials, and sender address through environment variables.

## Local development

`./scripts/setup.sh` starts Mailpit with the other local Docker services. The API's default SMTP configuration connects to `127.0.0.1:1025`; open `http://localhost:8025` to view captured messages. The SMTP and UI ports bind only to localhost and each agent worktree receives separate ports.

Use the API mailer like this:

```ts
import { createEmailClient } from "./email.js";

const email = createEmailClient();
await email.send({
  to: "developer@example.com",
  subject: "Local email preview",
  text: "This message is captured by Mailpit.",
});
```

Better Auth uses this SMTP client for verification and password-reset messages. The API builds text and HTML messages around Better Auth's absolute, one-time links. SMTP logging is disabled; delivery failures are logged with only the message purpose, without the recipient, link, or SMTP error details. The auth endpoint does not wait for SMTP delivery, so delivery failures do not change its public response.

## Staging and production

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `EMAIL_FROM` in the environment's server-side `.env`. The API requires explicit `SMTP_HOST` and `EMAIL_FROM` values in production. Keep the two environment configurations and credentials separate. Mailpit is not included in the VPS Compose stack; email is sent through the provider selected by that product.

Use `SMTP_SECURE=true` when the provider expects implicit TLS (commonly port 465). For submission ports such as 587, use `SMTP_SECURE=false` so the client can use STARTTLS when the server advertises it. See [Nodemailer's SMTP transport options](https://nodemailer.com/smtp).
