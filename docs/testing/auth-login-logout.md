# Sign-in and sign-out test strategy

## Purpose

This strategy covers the generic Better Auth email/password account lifecycle across the API, email delivery, web, Expo, and optional setup paths. It verifies server-owned account/session state, email verification and reset, automatic session renewal, recoverable failures, and responsive/accessibility behavior.

Expected negative cases (such as invalid credentials) are successful test outcomes when the application responds correctly. A development failure is an unexpected mismatch between actual and expected behavior; only observed failures belong in the later [failure and operation guide](auth-login-logout.md#recording-a-real-failure).

## Test data and isolation

- Use an isolated PostgreSQL database for each local run and CI job. Apply migrations through the repository migration runner.
- Provision a unique local/test user for each run through the documented non-public provisioning path. Generate test credentials at runtime or from the test environment; never commit a reusable password or use a developer's shared database volume.
- Clean up users, sessions, and temporary setup copies after each suite. A failed cleanup must not affect another test run.
- Keep secrets in the test process environment. Assert that passwords, cookies, tokens, and secret values do not appear in captured logs, snapshots, URLs, or failure messages.
- Use configured trusted origins for success cases and a separate untrusted origin for rejection cases. Do not enable wildcard origin reflection to make tests pass.
- Stub network failures at the client boundary for deterministic UI tests. Keep at least one API integration run against the real isolated PostgreSQL service.

## Acceptance case matrix

Current API integration coverage includes public registration with a verification gate, verification resend and link consumption/reuse, expired and malformed verification tokens, rolling session expiry/renewal, expired-session rejection, reset email and session revocation, duplicate-registration privacy, sign-in/out revocation, trusted-origin CORS, and safe request logging. The broader matrix below remains the target for later web and Expo tasks.

### API integration

| ID     | Case                                                                            | Expected result                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API-01 | Register a new email/password account                                           | API creates an unverified account, sends a verification message, does not create an authenticated session, and does not expose password or account-existence details. |
| API-02 | Verify with a valid, expired, reused, or malformed token                        | A valid token verifies once; invalid, expired, and reused tokens cannot verify or create a session.                                                                   |
| API-03 | Sign in before and after email verification                                     | Unverified account receives no session; verified credentials create a session with supported cookie headers.                                                          |
| API-04 | Request a session anonymously, authenticate, then request it again              | Anonymous request has no user; authenticated request returns the same public identity and a valid session expiry.                                                     |
| API-05 | Cross the session update-age threshold while session is still valid             | Session lookup extends the database expiry and refreshes the cookie; expired/revoked sessions stay anonymous.                                                         |
| API-06 | Sign in with an unknown email and wrong password                                | Both fail without a session and return the same public message/status.                                                                                                |
| API-07 | Sign out with active session state                                              | Server invalidates the session; subsequent lookup with the same cookie is anonymous.                                                                                  |
| API-08 | Request reset for known and unknown email addresses                             | Both return equivalent public responses; only the registered account receives a reset email.                                                                          |
| API-09 | Complete a reset with valid, expired, or reused token                           | A valid token updates the password once and revokes all sessions; invalid tokens cannot change the password.                                                          |
| API-10 | Send credentialed requests from trusted and untrusted origins                   | Trusted origins receive required CORS headers; untrusted preflight/auth requests are rejected without credential permission.                                          |
| API-11 | Start production configuration without required secrets or with invalid origins | Startup fails with an actionable message and never reveals a secret.                                                                                                  |
| API-12 | Exercise local/test provisioning and public registration                        | Public registration works only through verification; local provisioning remains explicit, test-only, and unavailable in production.                                   |

### Web browser

| ID     | Case                                                                      | Expected result                                                                                                                             |
| ------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| WEB-01 | Register a new account and request verification resend                    | Form validates and announces progress; confirmation is generic; no authenticated view appears before verification.                          |
| WEB-02 | Follow a valid, expired, or reused verification link                      | Success/invalid/expired state is clear; token is removed from the visible URL after processing; sign-in/resend action is reachable.         |
| WEB-03 | Sign in before verification, then after verification                      | Unverified users are denied a session; verified users reach the protected view only after API confirmation.                                 |
| WEB-04 | Request password reset for known and unknown email                        | Both show the same confirmation and do not reveal whether the account exists.                                                               |
| WEB-05 | Complete password reset from a valid, expired, or reused link             | Valid link changes password and revokes sessions; invalid links offer a fresh request path.                                                 |
| WEB-06 | Open protected route directly, reload, or open a new tab                  | Server checks the session; signed-out visitors go to sign-in with a safe same-origin return path; API failure is not mistaken for sign-out. |
| WEB-07 | Keep a valid session active through the update-age threshold              | Browser revalidates at the configured interval and on focus; API extends only a still-valid session.                                        |
| WEB-08 | Expire/revoke the session, sign out, then use Back/Forward/refresh        | Protected content is not restored; user returns to signed-out state with useful feedback.                                                   |
| WEB-09 | Make the API/email service unavailable during account flows               | User sees a recoverable error and retry path; UI never claims an email or session succeeded when it did not.                                |
| WEB-10 | Exercise all forms at 320, 360, 390, 768, 1024, and 1440 CSS-pixel widths | Primary content/action remain reachable; no document-level overflow; long feedback wraps.                                                   |
| WEB-11 | Navigate with keyboard, open mobile keyboard, zoom, and resize text       | Focus order and indicators are visible; fields, feedback, and next action remain reachable; zoom is not disabled.                           |

Use browser automation for route, form, session, and viewport cases. Add a keyboard-only/manual pass for the final rendered screen and review accessible names, associations, and live feedback with the browser accessibility tree or equivalent tooling.

### Expo client and native UI (iOS quick-check target)

| ID        | Case                                                                                        | Expected result                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| NATIVE-01 | Register, verify, sign in, reset password, and sign out                                     | Each state transitions only after API confirmation; unverified accounts receive no authenticated session.                    |
| NATIVE-02 | Reopen app with a persisted active, expired, or revoked session                             | Secure storage restores the client state; API revalidation confirms validity before protected UI appears.                    |
| NATIVE-03 | Keep the app active through update-age and resume after backgrounding                       | Client revalidates at the configured interval and on resume; valid session expiry extends, expired/revoked session clears.   |
| NATIVE-04 | Submit invalid credentials, invalid/reused links, or simulate unavailable API/email service | Native feedback is announced and recoverable; no stale authenticated content appears.                                        |
| NATIVE-05 | Sign out or complete password reset, then navigate Back/resume                              | Server revokes sessions and local session/navigation state is cleared.                                                       |
| NATIVE-06 | Open verification/reset email links on iOS                                                  | Supported deep link or web fallback reaches the correct flow; tokens are not logged or persisted in plain text.              |
| NATIVE-07 | Use iOS keyboard, autofill, screen reader semantics, safe areas, and shorter screens        | Fields, feedback, and next actions remain reachable; controls use native accessibility semantics.                            |
| NATIVE-08 | Connect an iOS simulator/device using its configured API origin                             | Requests reach the API without assuming that `localhost` points to a physical phone's own loopback.                          |
| NATIVE-09 | Render real auth components on iOS                                                          | Layout, colors, pressed/disabled states, accessibility, and keyboard behavior work in runtime; bundling alone is not a pass. |

Use automated client/UI checks for deterministic state transitions and errors. Keep a manual iOS checklist for secure-storage persistence and platform behavior that the chosen automation runtime cannot prove. Android remains supported and should continue to export, but Android runtime review is optional and does not block routine auth tasks unless the change is Android-specific or Android verification is explicitly requested.

### Setup selection

| ID       | Case                                                                                       | Expected result                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| SETUP-01 | Scaffold with auth selected in a clean copy                                                | Auth API/web/Expo files, dependencies, environment keys, and migration are present and selected apps build/typecheck.   |
| SETUP-02 | Scaffold without auth in a clean copy                                                      | Baseline apps remain runnable with no auth-only dependency, file, migration, or generated state.                        |
| SETUP-03 | Rerun both selections after editing an unrelated file and one scaffolded file              | Setup reports conflicts or preserves user edits; it does not overwrite unrelated work or silently replace edited files. |
| SETUP-04 | Run setup with missing prerequisites and with both interactive and non-interactive choices | Output identifies the next action, selection is explicit and consistent, and no secret value is printed.                |

Run each setup case from a fresh disposable copy so an earlier run cannot hide stale files or lockfile entries. The disabled-auth copy must be checked for absence, not just successful startup.

## Epic acceptance coverage

| Epic acceptance criterion                                                                            | Coverage                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contributors can follow the supporting documents                                                     | Review that the Epic, design specification, this strategy, implementation checklist, and eventual operation guide link to one another and agree on scope. |
| API lifecycle, invalid credentials, session renewal, email delivery, and origin behavior are checked | API-01 through API-12                                                                                                                                     |
| Web and Expo complete account lifecycle, session renewal, protected state, and recovery are checked  | WEB-01 through WEB-09; NATIVE-01 through NATIVE-08                                                                                                        |
| Web narrow layout, keyboard, and overflow work                                                       | WEB-10 and WEB-11, including a manual rendered-screen pass                                                                                                |
| Native keyboard, secure persistence, deep links, navigation, and API URL work on iOS                 | NATIVE-02 through NATIVE-09                                                                                                                               |
| Auth-selected and auth-omitted setup work from clean copies                                          | SETUP-01 through SETUP-04                                                                                                                                 |
| Workspace quality gates and focused checks pass                                                      | CI runs lint, typecheck, build, API, browser, native/client, and both setup-mode suites with isolated services and no external credentials.               |
| Failure/fix guide uses observed evidence                                                             | Record only a real failure that occurred during development and passed a regression check; see the format below.                                          |

## Recording a real failure

Add a short entry only when an unexpected implementation or tooling failure was observed and fixed. Include:

1. **Reproduction:** exact command or user action, relevant app/runtime versions, and the minimal setup needed.
2. **Symptom:** what actually happened and what should have happened.
3. **Root cause:** the verified cause, with relevant source/config location.
4. **Fix:** the change that resolves it.
5. **Regression check:** the focused test or manual check and its passing result.

Redact credentials, session identifiers, and personal data. Do not retain intentionally broken code or describe expected negative cases (invalid credentials, anonymous session, or controlled API outage) as defects. If no useful unexpected failure occurred, say that there is no observed failure example yet; do not invent one.

## Run commands and evidence

Add commands as the corresponding suites are implemented. At each milestone record the command, pass/fail result, database isolation used, and any platform/runtime limits. Store device-only checks in the manual checklist and redact credentials from artifacts.

### Web implementation check (Task 11)

Run from the repository root:

```sh
npm run lint --workspace=@starter/web
npm run typecheck --workspace=@starter/web
npm run typecheck --workspace=@starter/shared
npm run build --workspace=@starter/web
```

The web auth pages are `/sign-up`, `/sign-in`, `/verify-email`, `/forgot-password`, `/reset-password`, and `/app`. The auth client is served through `/api/auth/*`, which proxies to `API_URL`. Check anonymous session lookup with `curl -i http://localhost:3000/api/auth/get-session`; it should return HTTP 200 with `null`. With no session, `/app` redirects to `/sign-in?next=%2Fapp`. The public lifecycle routes return HTTP 200.

For responsive review, use Safari Develop → Enter Responsive Design Mode and inspect `/sign-up` at 320×844 and 390×844 CSS pixels. The form remains a single column and its controls fit the viewport width. Browser automation for complete email, session renewal, expiry, and keyboard journeys is tracked separately in Task 13; do not treat the manual layout check as coverage of those journeys.

### Email unit tests

Run the focused mail configuration and template tests:

```sh
npm run test:email --workspace=@starter/api
```

These tests cover Mailpit defaults, required production SMTP settings, invalid configuration, safe text/HTML links, and privacy-safe delivery failure reporting. They do not require PostgreSQL or SMTP.

### API integration

The API auth suite requires a disposable PostgreSQL database and the Mailpit email profile. CI creates its own `starter_auth_test` database and Mailpit service. For a local run, create a separate database whose name includes `test`, start Mailpit, then run:

```sh
COMPOSE_PROFILES=email docker compose up -d --wait mailpit
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/starter_auth_test" npm run db:migrate --workspace=@starter/api
AUTH_TEST_DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/starter_auth_test" npm run test:auth --workspace=@starter/api
```

The suite rejects database names without a test marker, creates a unique test user, and removes its user and captured email messages when finished. Current integration coverage includes SMTP delivery of verification and reset links through Mailpit, generic reset responses, token redaction in request logs, production auth configuration validation, sign-in/out, session lookup, and trusted/untrusted origins. It passes 11 tests against the isolated local `starter_auth_test` database. Web/native client behavior and setup-selection remain future coverage.

Web browser lifecycle and setup-selection suites remain future work.

### Expo implementation check (Task 12)

Run from the repository root:

```sh
npm run lint --workspace=@starter/mobile
npm run typecheck --workspace=@starter/mobile
npm run build --workspace=@starter/mobile
```

The Expo export must report both Android and iOS bundles. For the default native quick-check, set `EXPO_PUBLIC_API_URL` to an origin reachable from iOS, then run `npm run ios --workspace=@starter/mobile`. The iOS Simulator can reach the host's localhost API; physical iOS devices need the computer's LAN address. A native development build is needed to test the configured `projectstarter://` scheme; Expo Go does not register it for this project. Exercise the native lifecycle, links, secure persistence, and session checks on iOS before marking Task 12 complete. Android runtime review is an optional follow-up; keep Android export passing, and run an Android emulator/device check when a change is Android-specific or explicit Android verification is requested.

### Browser lifecycle automation (Task 13)

Install Chromium with `npx playwright install chromium`. With PostgreSQL and Mailpit running and migrations applied to a disposable database whose name contains `test`, run:

```sh
AUTH_TEST_DATABASE_URL="postgresql://<user>:<password>@localhost:<port>/starter_auth_test" npm run test:auth --workspace=@starter/web
```

Playwright owns API port 4100 and web port 3100, refuses to reuse existing servers, and uses `.next-auth-test` to avoid the normal Next.js development lock. It exercises desktop Chromium and Chromium emulating mobile web. This emulation does not claim native iOS or Safari coverage. The lifecycle test registers a unique account, verifies its Mailpit email, signs in, reloads, resets its password, checks session revocation, signs in again, and signs out. Cleanup removes its account and captured messages. Other tests cover anonymous route protection, keyboard focus, overflow, validation, invalid credentials, failed client requests, and invalid reset links. Traces and screenshots are disabled to avoid saving credentials and email tokens in artifacts. The browser lifecycle test also ages only its own database session to verify rolling renewal, then expires it and verifies the protected-route redirect. Email-service rejection is simulated at the browser boundary; actual SMTP delivery and failures belong to the API/email suites.

### Observed failure: reset link invalidated during development

**Reproduce:** Open a reset email link in Next.js development mode with React Strict Mode, then try to enter a replacement password. Before the fix, the form disappeared and reported an unavailable link.

**Root cause:** The effect captured the token and removed it from browser history. Strict Mode invoked the effect again; the second invocation read the cleaned URL and overwrote the captured state with an empty token.

**Fix:** Guard initial token capture with a component ref. Keep the token only in component memory and remove it from the address bar.

**Regression:** `apps/web/tests/auth.spec.ts` covers both an invalid reset token and a real reset email through completion in development mode, on desktop and mobile web. Expected invalid credentials and expired tokens remain negative cases, not implementation defects.

### Native state automation and device checklist (Task 13)

Run `npm run test:auth --workspace=@starter/mobile`. The `jest-expo/ios` suite renders the real app and mocks API, link, and platform boundaries. It covers anonymous validation, sign-in rejection and confirmation, persisted-session lookup, sign-out, foreground revalidation after API failure or expiry, and cold verification/reset links. It does not prove Keychain persistence or real email-client handoff. CI's quality job runs this suite; the isolated auth integration job runs desktop/mobile-web browser tests. The remote CI run passed for reference commit `aea9aaa` on 2026-11-18; this does not verify account delivery through the live staging SMTP configuration.

Retain these device checks on iOS; Android runtime remains optional:

- [x] Native build renders sign-in/sign-up actions and validation (Task 12 simulator evidence).
- [x] Verify email callback opens the native app and reset callback displays the reset form (Task 12).
- [x] Sign in, terminate, and relaunch; the API-confirmed session persists (Task 12).
- [x] Tap Sign out on the simulator/device, relaunch, and confirm protected state remains cleared. Verified on the iOS 26.5 simulator on 2026-11-15; a second sign-in/sign-out run visibly displayed “You have signed out.”
- [ ] Check keyboard return navigation, autofill, screen-reader order, and pressed/disabled controls on the device.
- [x] Complete a native reset from an actual email URL opened through Safari and verify the old password is rejected and the new one works. Password-reset revocation is covered by the API integration suite.
- [ ] Repeat handoff from an installed external mail client; Safari handoff is verified, mail-client-specific behavior is not.

These unchecked device checks are not implied by passing mocked component tests.

**Additional iOS evidence (2026-11-15):** Registered a disposable local account, opened its actual Mailpit verification link in simulator Safari, accepted the system app handoff, and observed verified state. Signed in through the native form and signed out through its visible action. Requested reset through the native form and opened the actual reset email URL in Safari; accepting the system handoff displayed the native replacement-password form. The user completed native reset submission; the simulator displayed “Your password has been updated. Sign in with your new password.” A subsequent API check rejected the old password (401), accepted the new password, and signed out the verification session. No passwords were included in the evidence output. This verifies the browser-to-app handoff, not an installed mail client. VoiceOver/autofill/keyboard and mail-client-specific checks remain unverified. At the time of this iOS evidence, remote CI had not run; the reference CI and staging deployment were subsequently verified on 2026-11-18.

**Keyboard follow-up:** Inspection found that fields advertised Next without moving focus. The native form now forwards refs and advances name → email → password → confirmation where applicable; Done submits. Seven iOS component tests pass, including keyboard submission validation and password-visibility accessibility labels. The simulator accessibility tree exposes labeled fields and actions in form order. A full VoiceOver/autofill pass and reliable physical keyboard focus verification remain unchecked; component tests do not claim these runtime results.

### Setup recipe tests

Run `node --test scripts/tests/auth-recipe.test.mjs` for disposable-copy selection, rerun, and tamper checks. Run `AUTH_TEST_DATABASE_URL="postgresql://<user>:<password>@localhost:<port>/starter_auth_test" node scripts/verify-auth-recipes.mjs` from the reference checkout for clean install, isolated migrations, workspace gates, and auth/browser/native suites. This requires local PostgreSQL, Mailpit, and installed Playwright Chromium. See the [recipe workflow](../auth-recipe.md) for prerequisites and no-auth commands. Reference CI and basic staging deployment smoke checks passed; staging account flows and production remain separate verification steps.

### Final local observability checks

Run `npm run test:telemetry --workspace=@starter/api` for real OTLP log/metric/trace export and sentinel-secret regression tests. See the [observability guide](../auth-observability.md) and [failure runbook](../runbooks/auth-failures.md). Current focused totals are API auth 11, email 5, telemetry 2, native component 10, browser 12, and recipe selection/rerun 3. Clean no-auth and auth-selected verifier runs also pass installation, fresh migrations, workspace gates, and both Expo exports. These are local results; CI passed for reference commit `aea9aaa`. Staging trace inspection and extended device checks remain unverified.
