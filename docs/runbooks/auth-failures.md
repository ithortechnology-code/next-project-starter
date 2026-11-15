# Auth and email failures

**Means:** An increase in `starter.auth.operation.count` with `outcome=failure` means an auth operation or email delivery failed. A rise in `rejected` sign-ins alone can mean invalid credentials or abuse, not an outage.

**First check:** Filter `auth.operation` logs by operation/outcome, then follow `requestId` and `traceId` through API logs and traces. Check `/health` and local PostgreSQL availability for session failures. For `email_verification`/`email_password-reset`, check Mailpit/SMTP connectivity, TLS and sender configuration. Never paste passwords, cookies, email links, or connection strings into logs or incident reports.

**Recovery:** Restore the dependency and retry a disposable account flow. Registration/recovery `accepted` responses deliberately preserve account privacy and do not prove delivery; look for `delivered` or `failure` email events. Review latency histograms by bounded operation/outcome for p95/p99 changes.

**Escalation:** In a fork, assign the owning API/email operator before deployment. Page destinations and thresholds require that fork's SLO and hosting configuration. CI, staging failure injection, production alert delivery and staging trace-UI review are deferred; no alerts are created or claimed tested by this local example.
