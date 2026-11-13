# ADR-0006: Use provider-neutral SMTP with Mailpit locally

## Status

Accepted; local mailer implemented

## Date

2026-11-14

## Context

Future products need email without forcing this template to select a paid provider. Developers also need safe local email previews that cannot reach real recipients.

## Decision

Send mail through environment-configured SMTP using Nodemailer. Run Mailpit in local and agent Compose environments to capture outgoing messages. Each product selects its own SMTP provider for staging and production.

## Alternatives considered

- **Provider-specific SDK:** rejected as a starter default because it binds projects to one vendor.
- **Real email service in local development:** rejected because developer actions could send mail to real recipients.

## Consequences

- SMTP configuration and credentials are environment-specific and never committed.
- Local messages are inspectable in Mailpit and are not delivered externally.
- Provider features beyond standard SMTP require product-specific additions.

See [the email guide](../email.md) for configuration and examples.
