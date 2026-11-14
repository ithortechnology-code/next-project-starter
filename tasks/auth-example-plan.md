# Implementation Plan: Cross-Platform Better Auth Example

## Overview

Build a small, generic authentication example that teaches contributors how this starter carries a feature from an Epic and design through implementation, automated tests, and documented failure diagnosis. Better Auth runs as a TypeScript library in the project's API and stores auth data in the existing PostgreSQL service. The first user-visible flow is email/password sign-in, a protected signed-in view, and sign-out in both the Next.js web app and Expo app. The existing web/mobile apps remain independent clients of the API.

## Scope and constraints

- Keep the current Expo SDK 58 and React Native 0.88 versions. **Do not downgrade Expo.** Verify NativeWind against this pinned stack first; if it is incompatible, evaluate other actively maintained utility-style options compatible with Expo 58. Adopt one only after a minimal iOS/Android bundle and runtime check passes. Otherwise retain React Native styling and document the decision.
- Auth is an in-app package/framework integration, not a hosted auth service.
- This first flow includes sign-in, session persistence, a protected signed-in view, and sign-out. It does not include sign-up, email verification, password reset, social providers, organizations, or role management.
- Since there is no sign-up UI in this slice, provide an explicit local/test account provisioning path. Never commit demo passwords or seed a reusable production account.
- Keep Better Auth server configuration in the API. Use `packages/shared` only for contracts genuinely shared by apps; keep UI components and platform-specific behavior local to web and Expo.
- Add Better Auth's required schema to the existing Kysely migration history. Do not introduce an independent auth migration path.
- Preserve the current intent to make auth selectable during setup. First prove the complete recipe, then scaffold it through setup and verify both selected and unselected setup paths.
- Document failures observed during implementation with the failing test or command, symptom, root cause, fix, and regression check. Do not leave intentionally broken code or CI tests behind.

## Architecture decisions to validate

- Better Auth server instance and Fastify handler live in `apps/api`; PostgreSQL remains the source of truth for users and sessions.
- Web uses Better Auth's React client against the API. Expo uses the official Expo integration and secure local session storage.
- Configure trusted origins and credentialed CORS explicitly for local web and Expo development. Test cookie/session behavior in supported mobile browsers and on native clients. Confirm the production web/API origin strategy before production deployment; unrelated domains can cause browser cookie restrictions.
- Generate the Better Auth PostgreSQL schema, review it, then bring it into a versioned Kysely migration so existing deploy migration ordering remains authoritative.
- Keep one auth design and behavior contract while allowing separate responsive web and native screens.
- Auth dependencies and files are included only when the contributor selects the auth recipe during setup. The exact scaffold representation (copyable recipe sources versus generated package/files) must be chosen after the working recipe exists and both setup modes can be tested safely.

## Dependency graph

```text
Expo 58 styling compatibility check
          │
          ├── Native styling decision and mobile UI foundation
          │
Auth Epic + reusable templates + cross-platform design/test specs
          │
PostgreSQL auth schema → Better Auth API config → Fastify handler/session tests
          │                                      │
          ├──────────────────────────────────────┤
          │                                      │
Web auth client + sign-in/out UI      Expo auth client + sign-in/out UI
          │                                      │
          └──────────── Browser/device tests ────┘
                               │
                 Optional setup scaffold + both-path checks
```

## Task List

### Phase 1: Plan, design, and verify mobile styling

1. Write the authentication Epic and reusable Epic/task templates.
2. Write the web and Expo sign-in/sign-out flow and responsive design specification.
3. Write the cross-platform test strategy and acceptance case matrix.
4. Run a NativeWind compatibility spike on Expo SDK 58 / React Native 0.88. If it fails, evaluate alternatives against the same small probe; do not change Expo versions.
5. Adopt the passing styling option and establish the mobile styling foundation, or record that React Native StyleSheet remains the chosen option if no candidate passes.

### Checkpoint: design and mobile foundation

- Epic, reusable templates, design spec, and test cases are usable by a contributor without relying on this conversation.
- Expo SDK 58 remains pinned; the mobile styling decision has evidence from iOS and Android bundling and a runtime check.

### Phase 2: Better Auth API foundation

6. Add Better Auth server configuration, secrets/origins configuration, and a safe local/test user provisioning path.
7. Add the reviewed Better Auth schema as a new ordered Kysely migration.
8. Mount the Better Auth Fastify handler and configure credentialed CORS/trusted origins.
9. Add API integration tests for account provisioning, valid/invalid sign-in, session lookup, sign-out, and rejected/untrusted requests.

### Checkpoint: API authentication

- A local account can sign in and out through the API; sessions persist and are invalidated correctly.
- Missing production secrets and invalid database/configuration fail safely; no credentials appear in source, logs, or test artifacts.

### Phase 3: Cross-platform sign-in and sign-out

10. Build the responsive web sign-in, authenticated view, and sign-out flow using the established Tailwind/shadcn foundation.
11. Build the Expo sign-in, authenticated view, and sign-out flow using the selected mobile styling approach and secure session storage.
12. Add web browser tests and native client/UI tests plus a repeatable iOS/Android manual verification checklist.
13. Record implementation failure/fix examples and how to run each test path locally.

### Checkpoint: cross-platform flow

- Web and native clients sign in, retain a session across app/page reload, show the authenticated identity, and sign out.
- Invalid credentials, unavailable API, expired session, and failed requests produce recoverable UI states.
- Narrow web layouts satisfy `docs/design-guidelines.md`; mobile keyboard, input focus, and navigation remain usable.

### Phase 4: Make auth selectable during setup

14. Choose and document a maintainable source-of-truth model for the optional auth recipe.
15. Add setup selection and scaffold the API/auth database pieces only when auth is selected.
16. Scaffold the web auth dependencies and sign-in flow only when auth is selected.
17. Scaffold the Expo auth dependencies and sign-in flow only when auth is selected.
18. Verify setup with auth enabled and disabled from clean checkouts; confirm the disabled path has no auth-only dependencies, files, migration, or stale generated state.
19. Update the README/local development guide with selection, account provisioning, web/mobile URLs, test commands, and the auth example's production-readiness boundary.

### Checkpoint: ready as a forkable example

- Both setup modes work from a clean checkout and preserve existing local configuration.
- A contributor can follow the Epic, task checklist, design, tests, and failure/fix walkthrough to understand the repository workflow.
- Workspace lint, typecheck, build, API tests, web browser tests, and mobile checks pass.

## Verification strategy

- **Native styling compatibility:** Read official compatibility guidance for the exact pinned versions; build/export both platforms; run a minimal utility-class screen on iOS and Android and verify representative layout, color, spacing, and state styles. A successful Metro bundle alone is not enough.
- **API:** Test auth handler and session behavior against an isolated PostgreSQL database with migrations applied. Include valid/invalid credentials, no session, session persistence, sign-out invalidation, rejected origin, and missing secret/database configuration.
- **Web:** Use browser automation for sign-in success/failure, reload persistence, protected-view redirect, sign-out, API-unavailable messaging, keyboard reachability, and 320/360–390 CSS-pixel overflow checks.
- **Expo:** Test client state transitions and auth request failures with automated UI/client tests; verify sign-in, persisted session, and sign-out on iOS and Android. Use a development build or supported Expo runtime for device checks as required by native dependencies.
- **Setup:** Run the setup command in clean copies for both auth selections and assert dependencies, files, migrations, environment keys, and test commands match the selected mode.
- **Regression diagnosis:** For each encountered implementation failure worth teaching, retain the reproducer and passing regression check; distinguish expected negative test cases from actual development failures.

## Risks and mitigations

| Risk                                                                     | Impact                                                                                   | Mitigation                                                                                                                                 |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| NativeWind stable docs cover Expo 57, while this repo pins Expo 58       | Mobile styling integration may fail or compile while rendering incorrectly               | Keep Expo 58; test NativeWind and other candidates with an isolated probe on both platforms before adoption.                               |
| Web/API origins and cookies differ across local, staging, and production | Sign-in can work in one browser and fail in another, especially with third-party cookies | Explicitly test credentialed CORS and origins locally; decide production origin/reverse-proxy strategy before enabling auth in deployment. |
| Auth schema tooling could create a second migration history              | Fresh setup and deploys may diverge                                                      | Review generated SQL and commit it as the next migration in the existing Kysely runner.                                                    |
| Sign-in-only UI has no account creation flow                             | Contributors cannot try it without a user                                                | Provide explicit local/test account provisioning and document it; do not seed shared credentials.                                          |
| Optional setup can leave stale files or lockfile entries                 | Forks without auth may be inconsistent                                                   | Test both paths from clean copies and make selection idempotent; avoid deleting user-owned files.                                          |
| Native secure storage behavior differs by platform                       | Session persistence or logout could diverge                                              | Use the official Better Auth Expo integration and SecureStore guidance; test iOS and Android independently.                                |

## Open questions for implementation time

- Which NativeWind-compatible alternative, if any, passes Expo 58 checks? Keep this evidence-based; never downgrade Expo to satisfy a styling library.
- Should the optional setup choice be an interactive prompt, an explicit `--with-auth` flag, or both? Preserve a non-interactive option for CI and automation.
- What domain/proxy arrangement will web and API use in each deployment environment? Do not finalize production cookie settings until this is known.
- Which Expo automation framework works cleanly with the pinned SDK 58? Confirm against current Expo documentation before adding a test stack.

## Technical references

- [Better Auth Fastify integration](https://better-auth.com/docs/integrations/fastify) — Fastify handler, trusted origins, credentialed CORS, and session retrieval.
- [Better Auth PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql) — PostgreSQL support through Kysely.
- [Better Auth CLI](https://better-auth.com/docs/concepts/cli) — schema generation and checks; generated Kysely SQL must be reviewed and integrated into this repository's Kysely migration runner.
- [Better Auth Expo integration](https://better-auth.com/docs/integrations/expo) — Expo plugin, client, SecureStore, trusted origins, and session behavior.
- [Better Auth cookies](https://better-auth.com/docs/concepts/cookies) — cookie behavior and cross-domain browser limitations.
- [NativeWind stable installation](https://www.nativewind.dev/docs/getting-started/installation) — stable v4 guidance currently documents Expo SDK 57; SDK 58 compatibility must be verified locally.
- [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/) — pinned SDK and React Native version compatibility.
- [Expo testing overview](https://docs.expo.dev/develop/unit-testing/) — Expo-supported testing options; confirm current SDK 58 support during implementation.
