# Epic: Cross-platform email/password account lifecycle example

## Goal

Give contributors a working, generic example of how this starter carries authentication from specification through API, email delivery, web and native clients, tests, and documentation. Visitors can create an account, verify their email, sign in, use a server-validated session, sign out, and recover access through a password-reset email.

This remains a template example. It demonstrates integration patterns without adding product-specific account features.

## Users and value

- **Starter contributors** can follow a complete account lifecycle and adapt it to a fork.
- **Developers evaluating the starter** can exercise registration, email verification, sign-in/out, and password recovery across the independent web and Expo clients.

## Scope

- Better Auth runs in the API process and persists account and session state in PostgreSQL.
- Email/password registration requires email verification before the user is treated as authenticated.
- Web and Expo use Better Auth's database-backed opaque cookie sessions, with a 7-day expiry renewed after 1 day of active use. Clients revalidate every 5 minutes while active and on browser focus/app resume; the API refreshes the server session only while it remains valid.
- Sign-out and password reset revoke server-side sessions. This example does not add JWT access/refresh tokens or Better Auth's stateless cookie cache.
- Verification messages and password-reset messages use the existing SMTP configuration. Local development captures them in Mailpit.
- Web and Expo support registration, verification status and resend, sign-in, server-validated session persistence, sign-out, forgot-password, and password reset.
- Public feedback does not reveal whether an email address is registered. Passwords, verification tokens, reset tokens, and session cookies are never logged.
- Local/test account provisioning remains an explicit utility for isolated tests and setup; it does not create a shared production password.
- Auth remains an optional setup recipe; the no-auth setup path must stay clean and independently runnable.
- API, email, web, native, responsive, security/configuration, and setup-selection behavior is documented and checked.

## Non-goals

- Social sign-in, MFA, organizations, roles, SSO, and account deletion.
- A production-ready identity policy for every fork. Each deployment must configure its own origins, secrets, email provider, and operational controls.
- Shared web/native presentation components or a new shared UI package.
- Product-specific screens, branding, or domain behavior.

## Constraints and principles

- Keep Better Auth configuration on the server in `apps/api`; PostgreSQL remains the source of truth for users and sessions.
- Keep email delivery behind the existing API email client and local Mailpit configuration; do not add cloud credentials to source or workflows.
- Add required auth tables to the existing ordered Kysely migration sequence.
- Use `packages/shared` only for contracts genuinely shared by the API and clients. Keep web and Expo presentation and platform behavior local.
- Use credentialed CORS and explicit trusted origins. Do not reflect arbitrary origins or enable development wildcards in production.
- Keep credentials out of source, logs, committed fixtures, and reusable production seeds. Fail production startup clearly when required configuration is missing or invalid.
- Keep Expo SDK 58 pinned. The NativeWind 4 foundation and compatibility evidence are tracked in the [implementation plan](../../tasks/auth-example-plan.md) and [Expo 58 report](../testing/nativewind-expo58.md); finish component color, interaction-state, accessibility, and keyboard checks with the native UI.
- Follow [project design guidelines](../design-guidelines.md) for web and native behavior. The separate design specification owns screen-level interaction and responsive behavior.

## Risks and responses

| Risk                                                                       | Response                                                                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Email verification or reset messages can fail or be delayed.               | Provide safe retry/resend behavior, local Mailpit instructions, and test delivery with a captured SMTP transport. |
| Registration or reset responses can reveal account existence.              | Use generic public feedback and test both existing and unknown addresses.                                         |
| Verification/reset tokens can be replayed or exposed.                      | Use Better Auth's expiring one-time flows, keep tokens out of logs, and test expired/reused links.                |
| Browser cookie rules can differ across local and deployed web/API origins. | Test configured local origins and document production origin/proxy decisions as deployment-specific.              |
| Native clients need supported session persistence and device networking.   | Use the supported Expo integration and secure storage; check simulator and physical-device URL behavior.          |
| Optional setup could leave stale files or dependencies.                    | Verify both setup paths from clean copies, including reruns and user-edited files.                                |

## Acceptance criteria

- [ ] A contributor can follow the linked design and test documents without relying on conversation context.
- [ ] API tests cover registration, verification, verified and unverified sign-in, rolling session refresh and expiry, sign-out invalidation, reset request/completion and session revocation, expired/reused tokens, safe feedback, and rejected origins against isolated PostgreSQL.
- [ ] Verification and reset messages are delivered through configured SMTP; local development can inspect them in Mailpit.
- [ ] Web and Expo support the complete lifecycle and only show authenticated state after server confirmation; expected failures have recoverable feedback.
- [ ] Web works at 320 CSS pixels and 360–390 CSS pixels without page-level horizontal overflow; keyboard and browser navigation remain usable.
- [ ] Native keyboard, secure session persistence, deep links, navigation, and API URL behavior are checked on supported iOS and Android paths.
- [ ] Auth-selected and auth-omitted setup paths work from clean copies; the omitted path has no auth-only dependency, file, migration, or generated state.
- [ ] Workspace lint, typecheck, build, and the focused API, browser, native, and setup checks pass.
- [ ] Any failure/fix walkthrough records an observed failure, reproduction, root cause, fix, and passing regression check; expected negative cases are not described as defects.

## Supporting documents

- [Cross-platform design specification](../design/auth-login-logout.md)
- [Cross-platform test strategy](../testing/auth-login-logout.md)
- [Capability map](auth-lifecycle-capability-map.md)
- [Implementation plan and dependency order](../../tasks/auth-example-plan.md)
- [Task checklist](../../tasks/auth-example-todo.md)

## Completion

This Epic is complete when all acceptance criteria above are met and the implementation plan's final checkpoint is satisfied. Deployment-specific production origin, secret, and email-provider choices remain the responsibility of each fork.

## Native session implementation

Expo uses the official Better Auth Expo integration with an opaque session cookie persisted through `expo-secure-store`. PostgreSQL owns session validity and revocation. The client checks the session at launch, on foreground resume, and every five minutes while active; the server applies seven-day expiry and one-day rolling renewal. This implementation does not issue JWT access/refresh token pairs. See [native session details](../design/auth-login-logout.md) and Task 12 in the [task checklist](../../tasks/auth-example-todo.md).

## Auth observability follow-up

Existing HTTP rate/error/duration metrics, OpenTelemetry tracing, request IDs, and token-redacted request logs provide infrastructure coverage. Auth lifecycle outcome events and funnel coverage are not complete; the dedicated observability task in the checklist tracks this gap. Do not interpret registration or reset HTTP 200 responses as proof that an account was created or email delivered: these responses intentionally preserve account privacy.
