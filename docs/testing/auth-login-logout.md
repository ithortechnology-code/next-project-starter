# Sign-in and sign-out test strategy

## Purpose

This strategy covers the generic Better Auth sign-in example across the API, web, Expo, and optional setup paths. It verifies server-owned session state, recoverable failures, responsive/accessibility behavior, and the boundaries of the sign-in-only scope.

Expected negative cases (such as invalid credentials) are successful test outcomes when the application responds correctly. A development failure is an unexpected mismatch between actual and expected behavior; only observed failures belong in the later [failure and operation guide](auth-login-logout.md#recording-a-real-failure).

## Test data and isolation

- Use an isolated PostgreSQL database for each local run and CI job. Apply migrations through the repository migration runner.
- Provision a unique local/test user for each run through the documented non-public provisioning path. Generate test credentials at runtime or from the test environment; never commit a reusable password or use a developer's shared database volume.
- Clean up users, sessions, and temporary setup copies after each suite. A failed cleanup must not affect another test run.
- Keep secrets in the test process environment. Assert that passwords, cookies, tokens, and secret values do not appear in captured logs, snapshots, URLs, or failure messages.
- Use configured trusted origins for success cases and a separate untrusted origin for rejection cases. Do not enable wildcard origin reflection to make tests pass.
- Stub network failures at the client boundary for deterministic UI tests. Keep at least one API integration run against the real isolated PostgreSQL service.

## Acceptance case matrix

### API integration

| ID | Case | Expected result |
| --- | --- | --- |
| API-01 | Provision a local/test account | Account can be read by the auth system; password is not returned or logged; public signup remains unavailable. |
| API-02 | Request a session without credentials | API reports no authenticated session and creates none. |
| API-03 | Sign in with valid credentials from a trusted origin | API accepts the request, returns the supported session response/cookie headers, and a subsequent session request identifies the same public user. |
| API-04 | Sign in with an unknown email and with a wrong password | Both cases fail without creating a session and use non-enumerating public feedback. |
| API-05 | Sign out, then request the session with the same client state | Server invalidates the session; subsequent lookup is anonymous. |
| API-06 | Send credentialed preflight/auth requests from configured and untrusted origins | Configured origins receive the required CORS headers; untrusted origins are rejected and never receive reflected credential permission. |
| API-07 | Start production configuration without a required auth secret or with invalid auth configuration | Startup fails with an actionable message that identifies the missing/invalid setting without revealing any secret. |
| API-08 | Exercise account creation paths in production mode | Public sign-up/provisioning is not available; local/test provisioning cannot create a shared production account. |

### Web browser

| ID | Case | Expected result |
| --- | --- | --- |
| WEB-01 | Open the sign-in view with no session | Form is available after session status is known; fields have visible labels and the password is not exposed. |
| WEB-02 | Open the authenticated route directly without a session, then sign in successfully | Route sends the visitor to sign-in, accepts a same-origin return path, and shows authenticated content only after API confirmation. External return URLs are ignored. |
| WEB-03 | Sign in successfully, reload, and open the route in a new tab | The server session is checked again and the authenticated view remains available while the session is valid. |
| WEB-04 | Submit invalid credentials | A generic, non-enumerating error is announced; email remains available for correction; no authenticated content appears. |
| WEB-05 | Make the auth API unavailable during session check and sign-in | Visitor sees a recoverable service error and retry action; the UI never claims an authenticated state. |
| WEB-06 | Expire the session while the authenticated view is open | Next server check clears stale client state and returns to sign-in with a useful session-ended message. |
| WEB-07 | Sign out, then use Back, Forward, refresh, and the authenticated URL | API session is invalidated; old protected content is not restored or treated as authorized. |
| WEB-08 | Exercise sign-in at 320, 360, 390, 768, 1024, and 1440 CSS-pixel widths | Primary content and action remain reachable; no document-level horizontal overflow occurs; long feedback wraps. |
| WEB-09 | Navigate with keyboard, open the mobile keyboard, zoom, and resize text | Focus order and indicators are visible; focused fields, feedback, and submit action can be reached; zoom is not disabled. |

Use browser automation for route, form, session, and viewport cases. Add a keyboard-only/manual pass for the final rendered screen and review accessible names, associations, and live feedback with the browser accessibility tree or equivalent tooling.

### Expo client and native UI

| ID | Case | Expected result |
| --- | --- | --- |
| NATIVE-01 | Launch with no session, then sign in with valid credentials | Loading and signed-out states are distinct; successful sign-in moves to the authenticated view only after the API confirms it. |
| NATIVE-02 | Relaunch the app with a valid persisted session | Supported secure storage restores the client session and the API confirms it before the authenticated view appears. |
| NATIVE-03 | Submit invalid credentials or simulate an unavailable API | Native feedback is announced and recoverable; no stale authenticated content appears. |
| NATIVE-04 | Sign out, then navigate Back or resume the app | Server session and local session state are cleared; authenticated navigation cannot be reopened. |
| NATIVE-05 | Use iOS and Android keyboards, autofill, screen readers, safe areas, and shorter screens | Focus/submit behavior works on both platforms; the focused field, feedback, and next action remain reachable; controls use native accessibility semantics. |
| NATIVE-06 | Connect a physical device using its configured API origin | Requests reach the API without assuming that `localhost` on the device points to the developer's computer. |
| NATIVE-07 | Render the real auth components on iOS and Android | Layout, spacing, colors, pressed/disabled states, accessibility, and keyboard/focus behavior work in the runtime; bundling alone is not considered a pass. |

Use automated client/UI checks for deterministic state transitions and errors. Keep a manual device checklist for secure-storage persistence and platform behavior that the chosen automation runtime cannot prove.

### Setup selection

| ID | Case | Expected result |
| --- | --- | --- |
| SETUP-01 | Scaffold with auth selected in a clean copy | Auth API/web/Expo files, dependencies, environment keys, and migration are present and selected apps build/typecheck. |
| SETUP-02 | Scaffold without auth in a clean copy | Baseline apps remain runnable with no auth-only dependency, file, migration, or generated state. |
| SETUP-03 | Rerun both selections after editing an unrelated file and one scaffolded file | Setup reports conflicts or preserves user edits; it does not overwrite unrelated work or silently replace edited files. |
| SETUP-04 | Run setup with missing prerequisites and with both interactive and non-interactive choices | Output identifies the next action, selection is explicit and consistent, and no secret value is printed. |

Run each setup case from a fresh disposable copy so an earlier run cannot hide stale files or lockfile entries. The disabled-auth copy must be checked for absence, not just successful startup.

## Epic acceptance coverage

| Epic acceptance criterion | Coverage |
| --- | --- |
| Contributors can follow the supporting documents | Review that the Epic, design specification, this strategy, implementation checklist, and eventual operation guide link to one another and agree on scope. |
| API lifecycle, invalid credentials, and origin behavior are checked | API-01 through API-08 |
| Web and Expo sign in, persist session, validate identity, sign out, and recover from failures | WEB-01 through WEB-07; NATIVE-01 through NATIVE-06 |
| Web narrow layout, keyboard, and overflow work | WEB-08 and WEB-09, including a manual rendered-screen pass |
| Native keyboard, secure persistence, navigation, and API URL work | NATIVE-02, NATIVE-04 through NATIVE-07 |
| Auth-selected and auth-omitted setup work from clean copies | SETUP-01 through SETUP-04 |
| Workspace quality gates and focused checks pass | CI runs lint, typecheck, build, API, browser, native/client, and both setup-mode suites with isolated services and no external credentials. |
| Failure/fix guide uses observed evidence | Record only a real failure that occurred during development and passed a regression check; see the format below. |

## Recording a real failure

Add a short entry only when an unexpected implementation or tooling failure was observed and fixed. Include:

1. **Reproduction:** exact command or user action, relevant app/runtime versions, and the minimal setup needed.
2. **Symptom:** what actually happened and what should have happened.
3. **Root cause:** the verified cause, with relevant source/config location.
4. **Fix:** the change that resolves it.
5. **Regression check:** the focused test or manual check and its passing result.

Redact credentials, session identifiers, and personal data. Do not retain intentionally broken code or describe expected negative cases (invalid credentials, anonymous session, or controlled API outage) as defects. If no useful unexpected failure occurred, say that there is no observed failure example yet; do not invent one.

## Run commands and evidence

Add the exact API, browser, native/client, and setup commands here when those suites are implemented. Until then, do not document commands that are not present in the repository. At each milestone record the command, pass/fail result, database isolation used, and any platform/runtime limits. Store device-only checks in the manual checklist and redact credentials from artifacts.

### API integration

The API auth suite requires a disposable PostgreSQL database. CI creates its own `starter_auth_test` database in an ephemeral PostgreSQL 18 service. For a local run, create a separate database whose name includes `test`, then run:

```sh
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/starter_auth_test" npm run db:migrate --workspace=@starter/api
AUTH_TEST_DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/starter_auth_test" npm run test:auth --workspace=@starter/api
```

The test suite rejects a database name without a test marker. It creates a unique test user and removes that user and its sessions when finished. It covers production auth configuration validation, disabled public sign-up, anonymous and authenticated sessions, valid and invalid credentials, sign-out invalidation, trusted and untrusted origins, and Expo's configured origin.

Observed verification: `npm run test:auth --workspace=@starter/api` passed 5 tests against a dedicated local `starter_auth_test` database after applying both repository migrations. The web browser, native runtime, and setup-selection commands will be added when their corresponding suites exist.
