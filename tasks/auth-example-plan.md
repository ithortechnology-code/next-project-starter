# Implementation Plan: Cross-Platform Better Auth Account Lifecycle Example

## Overview

Build a generic, complete email/password authentication example that teaches contributors how this starter carries a feature through API, email delivery, web and native clients, tests, and documentation. Better Auth runs in the API process and stores users and database-backed sessions in PostgreSQL. Verification and reset messages use the existing SMTP client and local Mailpit. Web and Expo remain independent clients of the API.

## Scope and constraints

- The supported lifecycle is registration, email verification and resend, sign-in, server-validated session, sign-out, forgot-password, and password reset.
- Use an opaque database-backed cookie session: 7-day expiry, renewed after a 1-day update age. Browser clients revalidate every 5 minutes and on focus; Expo clients revalidate while active and on resume. Sign-out and password reset revoke server sessions. Do not add JWT access/refresh tokens or stateless cookie caching to this first-party example.
- Social sign-in, MFA, organizations, roles, SSO, and account deletion remain out of scope.
- Keep Better Auth configuration in `apps/api`; PostgreSQL remains the source of truth. Add any required auth schema only through the ordered Kysely migration runner.
- Use the existing API email client and Mailpit profile. Production auth configuration must require explicit SMTP host/sender settings and never log passwords, cookies, or one-time tokens.
- Keep `packages/shared` for contracts genuinely shared by clients; web and Expo presentation remain app-local.
- Keep Expo SDK 58 and NativeWind 4.2.7. See [compatibility evidence](../docs/testing/nativewind-expo58.md); verify component colors, states, accessibility, and keyboard behavior during implementation.
- Auth stays selectable during setup. Prove the full recipe first, then scaffold it and test both selected and unselected paths.
- Use Impeccable as development tooling for the auth demo's responsive design tokens and comp-first web references. Keep those artifacts scoped to `docs/design`/the demo; do not add a root `PRODUCT.md` or `DESIGN.md` that could misstate a fork's product. A fork should create its own product/design record for its actual product.
- Record only observed failures with reproduction, root cause, fix, and a passing regression check.

## Architecture decisions

- Better Auth owns verification/reset tokens and session operations; Kysely migrations remain the only schema migration path.
- Registration requires verified email before Better Auth creates an authenticated session. Reset requests and registration feedback must not reveal account existence.
- Session renewal is a database expiry extension triggered by valid session reads after the update-age threshold. Client revalidation checks validity; it does not revive an expired or revoked session.
- The API integrates Better Auth with the existing SMTP client; local development reads messages from Mailpit.
- The web uses Better Auth's React client against `API_URL` and validates protected sessions on the server. Expo uses the official integration and secure storage, with safe email-link handoff.
- Configure trusted origins and credentialed CORS explicitly. Confirm any production browser/API proxy and cookie-domain arrangement before deployment.
- The auth recipe remains optional; the no-auth path must stay independently runnable and preserve user edits.

## Dependency graph

```text
Epic/design/test specs + mobile styling foundation
          │
Email delivery adapter (existing SMTP client + Mailpit)
          │
Better Auth lifecycle config + session policy
          │
Existing Kysely auth schema → Fastify handler + origins/CORS
          │
Isolated API lifecycle tests
          ├─────────────────────────┐
          │                         │
Responsive web lifecycle       Expo lifecycle
          │                         │
          └──── browser/native tests ┘
                       │
          Optional setup recipe + both-path checks
```

## Task list

### Phase 1: Plan, design, and mobile styling foundation

1. Write the auth Epic and reusable Epic/task templates.
2. Specify web and Expo lifecycle behavior, including session refresh and responsive/accessibility requirements.
3. Specify API, email, web, native, and setup tests plus failure diagnosis.
4. Complete the NativeWind Expo 58 compatibility spike; retain the recorded remaining component-state checks.
5. Establish the mobile styling foundation and check component colors, interaction states, accessibility, and keyboard behavior during UI work.

### Checkpoint: specification and mobile foundation

- Epic, design, test strategy, capability map, and task checklist agree on the complete email/password lifecycle.
- Expo SDK 58 remains pinned; iOS and Android compatibility evidence remains available.

### Phase 2: Email and Better Auth API foundation

6. Integrate verification and password-reset email delivery with the API's SMTP client and Mailpit; add safe templates and focused delivery checks.
7. Configure Better Auth for verified public registration, sign-in/out, reset, local/test provisioning, production config validation, and the 7-day/1-day rolling database session policy.
8. Keep the reviewed Better Auth tables/indexes in the ordered Kysely migration sequence; confirm the schema covers verification/reset tokens and sessions.
9. Keep the Better Auth Fastify handler mounted at `/api/auth` with credentialed CORS and explicit web/Expo trusted origins.
10. Extend isolated PostgreSQL API integration tests for registration, email verification, sign-in gating, password reset/session revocation, renewal/expiry, enumeration-safe responses, and origin/config failures.

### Checkpoint: API lifecycle

- A user can register, verify, sign in, persist/renew a valid session, sign out, and reset a password using captured email.
- Expired or revoked sessions and one-time tokens cannot be reused; reset revokes active sessions.
- Trusted origins work and untrusted origins cannot use credentialed auth routes.

### Phase 3: Web and Expo lifecycle

11. Build responsive web registration, verification/resend, sign-in, forgot/reset, server-validated authenticated, and sign-out views. Create desktop and mobile-web comps and document the resulting demo tokens within the auth design scope.
12. Build Expo equivalents using secure session storage, verification/reset deep-link handling, active/resume revalidation, and native keyboard/navigation behavior.
13. Add browser and native/client tests for the complete account lifecycle, rolling renewal, links, responsive/accessibility behavior, and failures.
14. Document local email inspection, provisioning, session policy, API/web/mobile URLs, test commands, and observed failure/fix evidence.

### Checkpoint: cross-platform lifecycle

- Web and Expo support every flow from the design spec; protected state is shown only after API confirmation.
- Browser works at 320 and 360–390 CSS pixels; iOS/Android secure storage, keyboards, links, and navigation are checked.
- Email and session failure states recover without account enumeration or stale authenticated UI.

### Phase 4: Make auth selectable during setup

15. Choose and document a maintainable source-of-truth model for the optional auth recipe.
16. Add setup selection and scaffold API, email, dependencies, environment, and migration only when selected.
17. Scaffold the web client and all lifecycle screens only when auth is selected.
18. Scaffold Expo auth dependencies and lifecycle screens only when selected.
19. Verify auth-selected and no-auth setup paths from clean copies, including reruns and edited-file preservation.
20. Update starter docs with recipe selection, email/Mailpit, account lifecycle, session policy, and all test commands.

### Final checkpoint: forkable example

- Auth-enabled and no-auth setups work from clean copies; the no-auth path has no stale auth dependencies, files, migrations, or generated state.
- A contributor can follow the Epic, task checklist, design, tests, and failure guide without relying on this conversation.
- Workspace lint, typecheck, build, API, browser, native, and setup checks pass.

## Verification strategy

- **Email:** Verify registration and reset messages using an isolated SMTP capture/Mailpit service; check link destinations, token handling, and generic public responses.
- **API:** Against isolated PostgreSQL, test registration, verified/unverified sign-in, session refresh/expiry, sign-out, reset and revocation, one-time tokens, untrusted origins, and invalid production configuration.
- **Web:** Browser checks cover all lifecycle routes, reload/protected-session checks, periodic/focus refresh, sign-out/reset invalidation, email/API outages, keyboard access, and 320/360–390 CSS-pixel overflow.
- **Expo:** Test lifecycle state transitions and failures, then verify session storage, active/resume refresh, email deep links, keyboard, and navigation on iOS and Android.
- **Setup:** Run both auth selections in disposable copies and assert dependencies, files, migrations, environment, rerun behavior, and test commands.
- **Regression diagnosis:** Record only real failures and passing regression checks; expected negative cases are not defects.

## Risks and mitigations

| Risk                                                              | Impact                                               | Mitigation                                                                                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| SMTP delivery or link origin is misconfigured                     | Users cannot verify accounts or reset passwords      | Validate production SMTP settings, use explicit public origins, and test locally with Mailpit.                          |
| Public messages reveal account existence                          | Email enumeration                                    | Use generic registration/reset/resend feedback and compare responses in API tests.                                      |
| Session refresh runs after expiry or delays revocation            | Stale access persists                                | Use database sessions without stateless cookie cache; refresh only valid sessions and test sign-out/reset invalidation. |
| Browser/API cookie policy differs in deployment                   | Sign-in fails or cookies are not sent                | Verify deployed origin/proxy arrangement before production launch.                                                      |
| Expo link/session behavior differs by platform                    | Verification/reset or persistence breaks on a device | Use supported secure storage/deep links and check iOS and Android separately.                                           |
| Optional setup leaves stale artifacts                             | Forks without auth become inconsistent               | Test both paths from clean copies and preserve user-owned files.                                                        |
| NativeWind stable docs target Expo 57 while this repo uses SDK 58 | UI can bundle but render incorrectly                 | Keep the recorded iOS/Android evidence and recheck component behavior during implementation.                            |

## Open questions for implementation time

- What domain/proxy arrangement will production web and API use? Do not finalize production cookie attributes before this is known.
- Which Expo automation framework works with the pinned SDK 58? Confirm against current Expo docs before adding test dependencies.
- Should setup selection be interactive, flag-based, or both? Keep an explicit non-interactive option for CI.

## Technical references

- [Better Auth Fastify integration](https://better-auth.com/docs/integrations/fastify)
- [Better Auth PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql)
- [Better Auth email/password](https://better-auth.com/docs/authentication/email-password)
- [Better Auth session management](https://better-auth.com/docs/concepts/session-management)
- [Better Auth client session options](https://better-auth.com/docs/concepts/client)
- [Better Auth Expo integration](https://better-auth.com/docs/integrations/expo)
- [Better Auth cookies](https://better-auth.com/docs/concepts/cookies)
- [NativeWind stable installation](https://www.nativewind.dev/docs/getting-started/installation)
- [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/)
- [Expo testing overview](https://docs.expo.dev/develop/unit-testing/)
