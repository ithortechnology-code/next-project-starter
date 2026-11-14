# Task Checklist: Cross-Platform Better Auth Example

This checklist is tracked separately from `tasks/todo.md`, which retains the existing starter infrastructure follow-ups.

## Phase 1: Plan, design, and verify mobile styling

### Task 1: Write the authentication Epic and reusable planning templates

**Description:** Document why the account-lifecycle example exists, its boundaries, and a reusable format contributors can use for future Epics and implementation tasks.

**Acceptance criteria:**

- [x] Epic states goals, non-goals, risks, acceptance checks, and links to the design and test documents.
- [x] Reusable Epic and task templates include ownership-neutral descriptions, acceptance criteria, verification, dependencies, and scope.
- [x] Epic is scoped to the complete generic email/password lifecycle across the API, web, and Expo clients.

**Verification:** Review the templates against one auth task and confirm a contributor can fill them without project-specific assumptions.

**Dependencies:** None.

**Files likely touched:** `docs/epics/auth-login-logout.md`, `docs/epics/auth-lifecycle-capability-map.md`, `docs/templates/epic.md`, `docs/templates/task.md`.

**Estimated scope:** Medium.

### Task 2: Specify web and Expo account lifecycle and session behavior

**Description:** Define registration, email verification, sign-in/out, password recovery/reset, and automatic rolling-session behavior while keeping API expectations consistent across platforms.

**Acceptance criteria:**

- [x] Covers registration, verification/resend, sign-in, forgot/reset password, session checking/renewal, API failure, authenticated, and signed-out states.
- [x] Web specification covers responsive narrow layouts, keyboard reachability, browser reload, safe redirects, expiry, and revalidation.
- [x] Expo specification covers native keyboard behavior, secure session persistence, link handling, revalidation, and platform navigation.

**Verification:** Review against `docs/design-guidelines.md` and Expo conventions; confirm registration, verification, and reset are included, while social sign-in and account deletion remain out of scope.

**Dependencies:** Task 1.

**Files likely touched:** `docs/design/auth-login-logout.md`.

**Estimated scope:** Small.

### Task 3: Specify test cases and failure diagnosis

**Description:** Create an API/email/web/native test matrix for the full lifecycle and a repeatable format for recording actual failures, root causes, fixes, and regression checks.

**Acceptance criteria:**

- [x] Includes API, SMTP/email, web, native, setup-selection, session renewal/expiry, security/configuration, and responsive interaction cases.
- [x] Separates expected negative cases (such as invalid credentials) from development failures that require diagnosis.
- [x] Defines what a useful failure/fix walkthrough records without requiring intentionally broken code to remain in the repository.

**Verification:** Map every Epic acceptance criterion to at least one automated or manual check.

**Dependencies:** Tasks 1 and 2.

**Files likely touched:** `docs/testing/auth-login-logout.md`.

**Estimated scope:** Small.

### Task 4: Check utility styling compatibility on Expo 58

**Description:** NativeWind 4.2.7 is selected after successful iOS/Android bundling and basic layout/spacing runtime checks on Expo 58. See [evidence](../docs/testing/nativewind-expo58.md). Complete the broader component-state checks during UI work.

**Acceptance criteria:**

- [x] Expo remains on SDK 58 throughout the spike.
- [x] NativeWind v4.2.7 was checked against its official installation guidance; the guidance documents SDK 57 support, and the local SDK 58 evidence is recorded separately.
- [ ] The installation was performed only in an isolated, reversible spike; the existing commit history shows a reversible change but does not establish that the install was isolated.
- [ ] iOS and Android both bundle and render a probe covering layout, spacing, color, and state styles; a bundle-only pass does not count as compatibility.

**Verification:** Record exact versions, commands, device/runtime results, and known issues in the task notes or design decision. NativeWind is selected; retain the remaining color and interaction-state checks as explicit follow-up.

**Dependencies:** None.

**Files likely touched:** `apps/mobile/package.json`, Expo styling config, probe screen, and `package-lock.json`.

**Estimated scope:** Medium.

### Task 5: Establish the mobile styling foundation

**Description:** Use the installed NativeWind 4 foundation and complete component-level behavior checks as the auth UI is implemented.

**Acceptance criteria:**

- [x] Expo SDK 58 remains pinned.
- [ ] Expo's dependency compatibility check completes reliably against package metadata; the recorded offline check warned that its validation was unreliable.
- [x] Styling configuration is documented and mobile components remain platform-local.
- [x] Existing iOS and Android exports continue to work; the compatibility note records a successful export for both platforms.
- [ ] During auth UI implementation, verify component colors, pressed and disabled states, accessibility behavior, and keyboard/focus behavior on iOS and Android.

**Verification:** Run mobile lint, typecheck, iOS/Android export, and the runtime probe on both platforms.

**Dependencies:** Task 4.

**Files likely touched:** `apps/mobile/**`, `package.json`, `package-lock.json`, `docs/design-guidelines.md`.

**Estimated scope:** Medium.

## Checkpoint: Design and mobile foundation

- [ ] Tasks 1–5 complete with Expo SDK 58 unchanged.
- [ ] Contributor-facing Epic, design, and test documents agree on the complete email/password lifecycle and rolling-session policy.
- [ ] Mobile styling decision is backed by iOS and Android evidence.

## Phase 2: Better Auth API foundation

### Task 6: Integrate email delivery for verification and password reset

**Description:** Connect Better Auth's verification and password-reset callbacks to the API's existing SMTP client. Provide generic, safe message templates and make local delivery inspectable through Mailpit.

**Acceptance criteria:**

- [x] Verification and reset emails use configured absolute links and concise text/HTML content.
- [x] Link tokens, passwords, cookies, and SMTP credentials do not appear in logs or public responses.
- [x] Local setup delivers to Mailpit; production requires explicit `SMTP_HOST` and `EMAIL_FROM` configuration.

**Verification:** `npm run test:email --workspace=@starter/api` passes 5 unit tests. `npm run test:auth --workspace=@starter/api` passes 8 integration tests against the isolated `starter_auth_test` database and Mailpit, verifying both message types, absolute links, generic responses, and request-log token redaction. API lint, typecheck, build, Prettier, and `git diff --check` pass.

**Dependencies:** Tasks 1 and 3.

**Files likely touched:** `.env.example`, `apps/api/src/email.ts`, `apps/api/src/auth.ts`, `apps/api/src/app.ts`, API email/auth tests, `.github/workflows/ci.yml`, `docs/email.md`, and `docs/local-dev.md`.

**Estimated scope:** Medium.

### Task 7: Configure Better Auth lifecycle, rolling sessions, and local provisioning

**Description:** Configure Better Auth for verified public registration, sign-in/out, password reset, PostgreSQL-backed session renewal, production configuration, and explicit local/test provisioning.

**Acceptance criteria:**

- [x] Better Auth is pinned to a stable compatible version and runs in the API process, not as a hosted service.
- [x] Public registration requires email verification before an authenticated session is created; password reset revokes existing sessions.
- [x] Database sessions expire after 7 days and renew after a 1-day update age while still valid; expired sessions cannot be renewed. Web and Expo revalidation is implemented in Tasks 12 and 13.
- [x] Local/test account provisioning is explicit and never creates a shared production password.
- [x] Production startup fails clearly for missing required secrets or invalid auth configuration.

**Verification:** `npm run test:auth --workspace=@starter/api` passes 9 PostgreSQL-backed integration tests against the isolated `starter_auth_test` database and Mailpit, covering public registration and verification gating, seven-day expiry, one-day renewal behavior, expired-session rejection, reset revocation, generic duplicate registration, production configuration, and sign-in/out. Local provisioning remains loopback-only and explicit. API lint, typecheck, build, Prettier, and `git diff --check` pass.

**Dependencies:** Tasks 1, 3, and 6.

**Files likely touched:** `apps/api/package.json`, `apps/api/src/auth.ts`, auth config/environment docs.

**Estimated scope:** Medium.

### Task 8: Add Better Auth tables to the Kysely migration sequence

**Description:** Generate and review the auth schema, then incorporate its SQL into one ordered project migration.

**Acceptance criteria:**

- [x] Migration creates the tables and indexes required by the configured Better Auth features.
- [x] Fresh database setup and the existing migration runner apply it in order.
- [x] Runtime/setup does not depend on a separate Better Auth migration command.

**Verification:** Generated and reviewed Better Auth 1.7.24's PostgreSQL/Kysely schema. The Task 10 isolated PostgreSQL suite applied both migrations successfully; API typecheck, lint, build, and auth schema use passed.

**Dependencies:** Task 7.

**Files likely touched:** `apps/api/src/migrations/<new_auth_migration>.ts`, `apps/api/src/database.ts` if generated database typing needs updates.

**Estimated scope:** Small.

### Task 9: Mount auth routes and configure trusted origins/CORS

**Description:** Connect Better Auth to the existing Fastify API and configure browser/native request origins and credential handling explicitly.

**Acceptance criteria:**

- [x] Better Auth catch-all handler is mounted at the chosen `/api/auth` path and its response headers/cookies are preserved.
- [x] Credentialed CORS allows configured web development origins and rejects untrusted origins; production does not use wildcard origin reflection.
- [x] Expo deep-link/development origins are narrowly documented and development wildcards are never enabled in production.

**Verification:** API lint, typecheck, and build pass. A real PostgreSQL-backed Fastify inject check confirmed trusted-origin preflight headers, untrusted-origin rejection, and anonymous session lookup through `/api/auth/get-session`. Native origin handling is documented; physical Expo runtime verification remains for Task 12.

**Dependencies:** Tasks 7 and 8.

**Files likely touched:** `apps/api/src/app.ts`, `apps/api/src/auth.ts`, `.env.example`, `docs/local-dev.md`.

**Estimated scope:** Medium.

### Task 10: Extend API lifecycle integration tests

**Description:** Extend the existing isolated PostgreSQL suite to cover registration, email verification, session renewal, password reset, and revocation in addition to sign-in/out.

**Acceptance criteria:**

- [x] Covers registration, verification/resend, verified and unverified sign-in, valid/expired/reused tokens, reset request/completion, session renewal/expiry, and reset/sign-out revocation.
- [x] Covers untrusted origins, missing/invalid production configuration, invalid credentials, and anonymous/authenticated sessions.
- [x] Tests clean up users/sessions and do not rely on shared credentials or the developer's database volume.

**Verification:** `npm run test:auth --workspace=@starter/api` passes 11 PostgreSQL-backed integration tests against the dedicated `starter_auth_test` database and Mailpit. Coverage includes registration/verification/resend, malformed and expired tokens, idempotent link reuse, verified/unverified sign-in, reset and sign-out revocation, rolling expiry, rejected origins, config failures, and privacy-safe responses/logs. The CI job provisions PostgreSQL and Mailpit, applies migrations, then runs the guarded suite. API email tests, lint, typecheck, build, Prettier, and `git diff --check` pass.

**Dependencies:** Tasks 6–9.

**Files likely touched:** `apps/api/src/**/*.test.ts`, `apps/api/package.json`, `.github/workflows/ci.yml`.

**Estimated scope:** Medium.

## Checkpoint: API authentication

- [ ] Better Auth API flow passes against clean PostgreSQL.
- [ ] Session and cookie behavior is demonstrated with both web origin and native client requests.
- [ ] Invalid credentials and rejected origins do not create sessions.

## Phase 3: Web and Expo account lifecycle

### Task 11: Build responsive web account lifecycle views

**Description:** Use Tailwind and shadcn/ui for registration, verification/resend, sign-in, forgot/reset, protected session, and sign-out views. Use Impeccable comp-first references for desktop and mobile web and document tokens within the auth demo scope.

**Acceptance criteria:**

- [ ] Covers registration, verification/resend, invalid credentials, API/email unavailable, loading/renewing session, forgot/reset, authenticated, and signed-out states accessibly.
- [ ] Protected view validates session with the API on the server; periodic/focus revalidation handles expiry, and client-only flags do not authorize.
- [ ] Desktop/mobile-web comps inform tokenized UI; all flows work at 320 and 360–390 CSS-pixel widths with keyboard focus and actions reachable.

**Verification:** Run web typecheck/build and inspect registration, email-link, reset, session expiry/renewal, protected-route reload, sign-out, responsive layout, and keyboard behavior in a browser.

**Dependencies:** Tasks 2, 5, and 9.

**Files likely touched:** `apps/web/app/**`, `apps/web/components/**`, `apps/web/lib/**`, `apps/web/package.json`.

**Estimated scope:** Medium.

### Task 12: Build Expo account lifecycle views

**Description:** Use the official Better Auth Expo integration for registration, email verification/resend, sign-in, forgot/reset, secure session storage, rolling-session revalidation, and sign-out.

**Acceptance criteria:**

- [ ] Native UI supports registration, verification/resend and reset links, invalid credentials, API/email unavailable, session loading/renewal, authenticated, and signed-out states.
- [ ] Session persistence uses supported secure storage; active/resume checks refresh only valid sessions; sign-out/reset clears server and local state.
- [ ] Verification/reset links work through supported deep-link/web-fallback paths; device API URL does not assume localhost.

**Verification:** Run mobile typecheck/export and manually exercise full lifecycle, link handling, session renewal/expiry, relaunch, and sign-out on iOS and Android.

**Dependencies:** Tasks 2, 5, and 9.

**Files likely touched:** `apps/mobile/App.tsx`, `apps/mobile/lib/**`, `apps/mobile/app.json`, `apps/mobile/package.json`.

**Estimated scope:** Medium.

### Task 13: Add web browser and native lifecycle tests

**Description:** Automate web browser journeys and native auth UI/session transitions, then document the device-only checks that cannot run reliably in CI.

**Acceptance criteria:**

- [ ] Browser suite covers registration/verification, sign-in, reset, email/API failure, protected routes, refresh/expiry, sign-out, keyboard reachability, and horizontal overflow.
- [ ] Native tests cover lifecycle, revalidation, and link states; device checklist covers SecureStore, email links, and iOS/Android keyboard/navigation.
- [ ] CI runs the automated suites with isolated services and no external credentials.

**Verification:** Run focused suites locally and in CI; capture artifacts only when they are useful and redact credentials/session data.

**Dependencies:** Tasks 10–12.

**Files likely touched:** `apps/web/tests/**`, `apps/mobile/**` test files, root/workspace package manifests, `.github/workflows/ci.yml`.

**Estimated scope:** Medium.

### Task 14: Document test operation and observed failure/fix examples

**Description:** Turn real development/test failures into a short teaching walkthrough and document local commands for every test layer.

**Acceptance criteria:**

- [ ] Records at least one real auth/styling issue with reproduction, symptom, root cause, fix, and passing regression check.
- [ ] Documents how to run API, browser, native, and setup tests and how to read their failure output.
- [ ] Does not present expected negative cases as implementation defects or invent an unobserved failure as fact.

**Verification:** A contributor can run the documented commands from a clean setup and locate the corresponding tests.

**Dependencies:** Task 13.

**Files likely touched:** `docs/testing/auth-login-logout.md`, `README.md` or `docs/local-dev.md`.

**Estimated scope:** Small.

## Checkpoint: Cross-platform flow

- [ ] Web and Expo both sign in, retain session, present authenticated state, and sign out.
- [ ] API, browser, native, and responsive acceptance cases pass.
- [ ] Failure/fix documentation is based on observed work and includes a regression test.

## Phase 4: Selectable auth setup recipe

### Task 15: Choose the optional recipe source-of-truth model

**Description:** Decide how the working API, web, and Expo implementation is stored and copied/generated so it remains maintainable as an optional setup recipe.

**Acceptance criteria:**

- [ ] A single editable source of truth exists for each scaffolded file; duplicated hand-maintained copies are avoided.
- [ ] The model can install auth dependencies and migration only when selected and has a clear no-auth default.
- [ ] Setup reruns preserve user edits and avoid deleting unrelated files.

**Verification:** Review a small representative scaffold in a disposable copy and confirm selected/unselected outputs and rerun behavior.

**Dependencies:** Tasks 7–14.

**Files likely touched:** `docs/decisions/auth-scaffold.md`.

**Estimated scope:** Small.

### Task 16: Add setup selection and scaffold API/database auth

**Description:** Add an interactive and non-interactive auth selection path and apply the selected API dependencies, configuration, and migration files.

**Acceptance criteria:**

- [ ] Auth selection is explicit and defaults consistently with the chosen optional-recipe behavior.
- [ ] API auth code, dependencies, environment keys, and migration are present only in the selected setup.
- [ ] Missing prerequisites and reruns produce actionable output without exposing secrets or overwriting user files.

**Verification:** Run the setup helper in isolated copies for both choices and inspect resulting manifests, files, lockfile, and migration list.

**Dependencies:** Task 15.

**Files likely touched:** `scripts/setup.sh`, `scripts/scaffold-auth.mjs`, API recipe manifest/source.

**Estimated scope:** Medium.

### Task 17: Scaffold the web auth client and UI

**Description:** Make web auth dependencies, client configuration, and sign-in/signed-in screens available only when the auth option is selected.

**Acceptance criteria:**

- [ ] Selected setup installs and wires the web auth client to the API origin.
- [ ] Unselected setup retains the existing starter health page and has no auth-only package dependency.
- [ ] Re-running setup does not replace user-edited web files.

**Verification:** Run selected/unselected web typecheck and build from clean copies.

**Dependencies:** Tasks 11 and 16.

**Files likely touched:** `apps/web/package.json`, web recipe manifest/source, `scripts/scaffold-auth.mjs`.

**Estimated scope:** Medium.

### Task 18: Scaffold the Expo auth client and UI

**Description:** Make the Better Auth Expo client and sign-in/signed-in screens available only when the auth option is selected.

**Acceptance criteria:**

- [ ] Selected setup installs SDK-compatible Expo auth dependencies and secure session storage.
- [ ] Unselected setup keeps the baseline Expo app free of auth-only dependencies and configuration.
- [ ] Expo remains SDK 58 and rerunning setup preserves user-edited app files.

**Verification:** Run selected/unselected mobile typecheck and iOS/Android export from clean copies; perform the device checks defined in Task 13.

**Dependencies:** Tasks 12 and 16.

**Files likely touched:** `apps/mobile/package.json`, mobile recipe manifest/source, `apps/mobile/app.json`, `scripts/scaffold-auth.mjs`.

**Estimated scope:** Medium.

### Task 19: Verify both clean setup paths

**Description:** Prove that auth-selected and no-auth setups install cleanly and remain independently runnable.

**Acceptance criteria:**

- [ ] Both paths work from clean copies; the no-auth path has no stale auth dependency, file, migration, or generated state.
- [ ] Setup output and errors identify next corrective actions and do not leak secrets.
- [ ] CI exercises both setup modes using isolated PostgreSQL and no external credentials.

**Verification:** Run setup, migrations, API tests, web browser tests, Expo checks, workspace lint/typecheck/build for each selected path.

**Dependencies:** Tasks 16–18.

**Files likely touched:** setup tests, `.github/workflows/ci.yml`, package scripts.

**Estimated scope:** Medium.

### Task 20: Document the selected auth recipe workflow

**Description:** Update starter docs with recipe selection, local account provisioning, service URLs, test commands, failure/fix guide, and scope limits.

**Acceptance criteria:**

- [ ] A fresh fork user can select or omit auth and find the exact web, Expo, and test commands.
- [ ] Docs distinguish this staging-ready integration example from environment-specific production auth configuration.
- [ ] README links to the Epic, design spec, and auth test guide.

**Verification:** Follow the documented instructions from a clean clone or clean worktree for each setup mode.

**Dependencies:** Tasks 14 and 19.

**Files likely touched:** `README.md`, `docs/local-dev.md`, `docs/testing/auth-login-logout.md`.

**Estimated scope:** Small.

## Final checkpoint

- [ ] All acceptance criteria in the Epic, design, and test strategy are complete.
- [ ] Expo remains SDK 58 and the selected mobile styling decision is verified.
- [ ] Auth-selected and no-auth setup paths both work from clean copies.
- [ ] Workspace lint, typecheck, build, API tests, web browser tests, and mobile checks pass.
