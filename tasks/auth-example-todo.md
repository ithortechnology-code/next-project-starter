# Task Checklist: Cross-Platform Better Auth Example

This checklist is tracked separately from `tasks/todo.md`, which retains the existing starter infrastructure follow-ups.

**Current verification scope:** Complete local development and local automated checks. CI execution and staging checks are deferred by user instruction (2026-11-15). A checked local task does not claim those external checks passed. Device coverage limits (full VoiceOver/autofill and installed mail-client handoff) remain explicit in the test guide; Safari handoff, secure persistence, keyboard focus, native reset, and sign-out have local evidence.

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

### Task 4: Check utility styling compatibility on Expo 58 — Complete

**Description:** NativeWind 4.2.7 is selected after successful iOS/Android bundling and basic layout/spacing runtime checks on Expo 58. See [evidence](../docs/testing/nativewind-expo58.md). Complete the broader component-state checks during UI work.

**Acceptance criteria:**

- [x] Expo remains on SDK 58 throughout the spike.
- [x] NativeWind v4.2.7 was checked against its official installation guidance; the guidance documents SDK 57 support, and the local SDK 58 evidence is recorded separately.
- [x] The styling decision and reversible implementation are recorded. Historical isolation cannot be established from the existing evidence; this process limitation is retained explicitly and does not block closure of the completed spike.
- [x] iOS and Android exported and rendered the layout/spacing probe on Expo 58. Broader component colors, interaction states, accessibility, and keyboard checks are tracked in Task 5 and the auth UI tasks.

**Verification:** Exact versions, export/typecheck/lint results, runtime observations, and known limitations are recorded in the [Expo 58 report](../docs/testing/nativewind-expo58.md). NativeWind 4.2.7 is selected. This closes the compatibility spike; it does not claim full component-state compatibility or a reliable online Expo dependency check.

**Dependencies:** None.

**Files likely touched:** `apps/mobile/package.json`, Expo styling config, probe screen, and `package-lock.json`.

**Estimated scope:** Medium.

### Task 5: Establish the mobile styling foundation — Complete

**Description:** Use the installed NativeWind 4 foundation and complete component-level behavior checks as the auth UI is implemented.

**Acceptance criteria:**

- [x] Expo SDK 58 remains pinned.
- [x] Expo’s online dependency compatibility check passes: `npm exec --workspace=@starter/mobile -- expo install --check` reports “Dependencies are up to date” without the earlier offline warning (2026-11-15).
- [x] Styling configuration is documented and mobile components remain platform-local.
- [x] Existing iOS and Android exports continue to work; the compatibility note records a successful export for both platforms.
- [x] iOS runtime review confirms colors, labeled form/action order, password visibility, and Email → Password keyboard focus. Component tests verify pressed opacity, disabled/busy semantics, prevention of disabled actions, and keyboard submission. Full VoiceOver/autofill and mail-client checks remain separate Task 13 device checks; Android runtime review is optional.

**Verification:** Run mobile lint, typecheck, iOS/Android export, and the runtime probe on iOS. Android runtime review is optional under the default quick-check scope.

**Dependencies:** Task 4.

**Files likely touched:** `apps/mobile/**`, `package.json`, `package-lock.json`, `docs/design-guidelines.md`.

**Estimated scope:** Medium.

## Checkpoint: Design and mobile foundation

- [x] Tasks 1–5 complete with Expo SDK 58 unchanged.
- [x] Contributor-facing Epic, design, and test documents agree on the complete email/password lifecycle and rolling-session policy.
- [x] Mobile styling decision is backed by iOS runtime evidence and iOS/Android export evidence.

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

- [x] Better Auth API flow passes against clean PostgreSQL.
- [x] Session and cookie behavior is demonstrated with both web origin and native client requests.
- [x] Invalid credentials and rejected origins do not create sessions.

## Phase 3: Web and Expo account lifecycle

### Task 11: Build responsive web account lifecycle views

**Description:** Use Tailwind and shadcn/ui for registration, verification/resend, sign-in, forgot/reset, protected session, and sign-out views. Use Impeccable comp-first references for desktop and mobile web and document tokens within the auth demo scope.

**Acceptance criteria:**

- [x] Covers registration, verification/resend, invalid credentials, API/email unavailable, loading/renewing session, forgot/reset, authenticated, and signed-out states accessibly.
- [x] Protected view validates session with the API on the server; periodic/focus revalidation handles expiry, and client-only flags do not authorize.
- [x] Desktop/mobile-web comps inform tokenized UI; 320px and 390px layouts were inspected with responsive browser mode. Full browser journeys and keyboard reachability remain in Task 13.

**Verification:** Web lint, web/shared typecheck, and production build pass. Local route checks return 200 for public lifecycle pages, `/api/auth/get-session` returns 200 with `null`, and anonymous `/app` redirects to sign-in. Safari private browsing showed the sign-up form at desktop and at 320×844 and 390×844 responsive viewports. Complete email, session renewal/expiry, and keyboard journeys remain assigned to Task 13; they have not been claimed as complete here.

**Dependencies:** Tasks 2, 5, and 9.

**Files likely touched:** `apps/web/app/**`, `apps/web/components/**`, `apps/web/lib/**`, `apps/web/package.json`.

**Estimated scope:** Medium.

### Task 12: Build Expo account lifecycle views

**Description:** Use the official Better Auth Expo integration for registration, email verification/resend, sign-in, forgot/reset, secure session storage, rolling-session revalidation, and sign-out.

**Acceptance criteria:**

- [x] Native UI supports registration, verification/resend and reset links, invalid credentials, API/email unavailable, session loading/renewal, authenticated, and signed-out states.
- [x] Session persistence uses supported secure storage; active/resume checks refresh only valid sessions; sign-out/reset clears server and local state.
- [x] Verification/reset links work through supported deep-link/web-fallback paths; device API URL does not assume localhost.

**Verification:** Run mobile lint/typecheck and iOS/Android export, then manually exercise lifecycle, link handling, session renewal/expiry, relaunch, and sign-out on iOS native. Android native runtime review is an optional follow-up and does not block this task.

**Progress note (verified):** The app-local native UI and Better Auth Expo/SecureStore integration are implemented. Mobile lint, typecheck, and iOS/Android export pass. API lint/typecheck/build and all 11 PostgreSQL-backed API integration tests pass. A native iOS development build succeeded on the iOS 26.5 simulator. The sign-up screen, field validation, primary actions, verification callback, and authenticated screen were visually reviewed. A test account completed registration, email verification through Mailpit, and sign-in. The verification deep link opened `projectstarter://verify-email`; a reset callback opened the reset form. Terminating and relaunching the app retained the authenticated session, confirming secure persistence. The verified session is checked with the API on launch, resume, and while active; session expiry and revocation behavior are covered by API integration tests. Android runtime review is optional under the project's quick-check scope; Android export remains part of the build check.

**Dependencies:** Tasks 2, 5, and 9.

**Files likely touched:** `apps/mobile/App.tsx`, `apps/mobile/lib/**`, `apps/mobile/app.json`, `apps/mobile/package.json`.

**Estimated scope:** Medium.

### Task 13: Add web browser and native lifecycle tests — Complete locally

**Description:** Automate web browser journeys and native auth UI/session transitions, then document the device-only checks that cannot run reliably in CI.

**Acceptance criteria:**

- [x] Browser suite covers registration/verification, sign-in, reset, email/API failure, protected routes, refresh/expiry, sign-out, keyboard reachability, and horizontal overflow.
- [x] Native tests cover lifecycle, revalidation, and link states on iOS; the device checklist covers SecureStore, email links, and iOS keyboard/navigation. Android runtime coverage is optional and non-blocking.
- [x] Local automated suites pass against isolated services with no external credentials; CI is configured, with execution deferred under the current local-only scope.

**Verification:** Run focused suites locally and in CI; capture artifacts only when they are useful and redact credentials/session data.

**Local verification:** 12 browser tests and 10 iOS component tests pass. Keyboard submission and password-visibility semantics have regression coverage; native Next actions now move focus through email, password, and confirmation. Remote CI and staging execution are deferred by user instruction. Device-only checks remain listed explicitly below and in the testing document.

**Progress:** Desktop/mobile-web Playwright now covers the real lifecycle, forced rolling renewal/expiry, protected routes, API failure, simulated email-service rejection, validation, keyboard focus, and overflow. The iOS Jest component suite covers session/sign-in/sign-out, foreground failure/expiry, and cold link states. CI jobs run both suites with isolated services for browser tests. Local checks pass; remote CI execution has not been observed. The linked test document records actual iOS evidence and the remaining device-only keyboard/accessibility and mail-client reset checks; Task 13 automation is complete locally; supplemental device coverage limits remain explicitly recorded.

**Dependencies:** Tasks 10–12.

**Files likely touched:** `apps/web/tests/**`, `apps/mobile/**` test files, root/workspace package manifests, `.github/workflows/ci.yml`.

**Estimated scope:** Medium.

### Task 14: Document test operation and observed failure/fix examples

**Description:** Turn real development/test failures into a short teaching walkthrough and document local commands for every test layer.

**Acceptance criteria:**

- [x] Records at least one real auth/styling issue with reproduction, symptom, root cause, fix, and passing regression check.
- [x] Documents how to run API, browser, native, and setup tests and how to read their failure output.
- [x] Does not present expected negative cases as implementation defects or invent an unobserved failure as fact.

**Verification:** A contributor can run the documented commands from a clean setup and locate the corresponding tests.

**Dependencies:** Task 13.

**Files likely touched:** `docs/testing/auth-login-logout.md`, `README.md` or `docs/local-dev.md`.

**Estimated scope:** Small.

**Local completion evidence (2026-11-15):** The test guide records the observed Strict Mode reset failure and regression, all test-layer commands, and links to the clean recipe verifier.

## Checkpoint: Cross-platform flow

- [x] Web and Expo both sign in, retain session, present authenticated state, and sign out.
- [x] API, browser, native, and responsive acceptance cases pass.
- [x] Failure/fix documentation is based on observed work and includes a regression test.

## Phase 4: Selectable auth setup recipe

### Task 15: Choose the optional recipe source-of-truth model

**Description:** Decide how the working API, web, and Expo implementation is stored and copied/generated so it remains maintainable as an optional setup recipe.

**Acceptance criteria:**

- [x] A single editable source of truth exists for each scaffolded file; duplicated hand-maintained copies are avoided.
- [x] The model can install auth dependencies and migration only when selected and has a clear no-auth default.
- [x] Setup reruns preserve user edits and avoid deleting unrelated files.

**Verification:** `node --test scripts/tests/auth-recipe.test.mjs` passes all 3 disposable-copy tests: both choices, preserved edits on rerun, rejected switching, and rejection of changed input before mutation. The single-source model and one-time selection contract are recorded in `docs/decisions/auth-scaffold.md`.

**Dependencies:** Tasks 7–14.

**Files likely touched:** `docs/decisions/auth-scaffold.md`.

**Estimated scope:** Small.

### Task 16: Add setup selection and scaffold API/database auth

**Description:** Add an interactive and non-interactive auth selection path and apply the selected API dependencies, configuration, and migration files.

**Acceptance criteria:**

- [x] Auth selection is explicit and defaults consistently with the chosen optional-recipe behavior.
- [x] API auth code, dependencies, environment keys, and migration are present only in the selected setup.
- [x] Missing prerequisites and reruns produce actionable output without exposing secrets or overwriting user files.

**Verification:** Run the setup helper in isolated copies for both choices and inspect resulting manifests, files, lockfile, and migration list.

**Dependencies:** Task 15.

**Files likely touched:** `scripts/setup.sh`, `scripts/scaffold-auth.mjs`, API recipe manifest/source.

**Estimated scope:** Medium.

**Local completion evidence (2026-11-15):** Generator selection/rerun/tamper tests pass. Clean no-auth output removes the API auth sources, CLI, dependency chain, and migration; fresh migrations and API route smoke pass.

### Task 17: Scaffold the web auth client and UI

**Description:** Make web auth dependencies, client configuration, and sign-in/signed-in screens available only when the auth option is selected.

**Acceptance criteria:**

- [x] Selected setup installs and wires the web auth client to the API origin.
- [x] Unselected setup retains the existing starter health page and has no auth-only package dependency.
- [x] Re-running setup does not replace user-edited web files.

**Verification:** Run selected/unselected web typecheck and build from clean copies.

**Dependencies:** Tasks 11 and 16.

**Files likely touched:** `apps/web/package.json`, web recipe manifest/source, `scripts/scaffold-auth.mjs`.

**Estimated scope:** Medium.

**Local completion evidence (2026-11-15):** Clean selected and omitted web builds/typechecks pass; the omitted build has only health/home and not-found routes. Rerun tests preserve edited source.

### Task 18: Scaffold the Expo auth client and UI

**Description:** Make the Better Auth Expo client and sign-in/signed-in screens available only when the auth option is selected.

**Acceptance criteria:**

- [x] Selected setup installs SDK-compatible Expo auth dependencies and secure session storage.
- [x] Unselected setup keeps the baseline Expo app free of auth-only dependencies and configuration.
- [x] Expo remains SDK 58 and rerunning setup preserves user-edited app files.

**Verification:** Run selected/unselected mobile typecheck and iOS/Android export from clean copies; perform the device checks defined in Task 13.

**Dependencies:** Tasks 12 and 16.

**Files likely touched:** `apps/mobile/package.json`, mobile recipe manifest/source, `apps/mobile/app.json`, `scripts/scaffold-auth.mjs`.

**Estimated scope:** Medium.

**Local completion evidence (2026-11-15):** Clean selected and omitted mobile lint/typecheck and both platform exports pass on SDK 58. Selected native suite passes 10 tests; device evidence and limits are in the test guide.

### Task 19: Verify both clean setup paths

**Description:** Prove that auth-selected and no-auth setups install cleanly and remain independently runnable.

**Acceptance criteria:**

- [x] Both paths work from clean copies; the no-auth path has no stale auth dependency, file, migration, or generated state.
- [x] Setup output and errors identify next corrective actions and do not leak secrets.
- [x] Local clean-copy verification exercises both modes using isolated PostgreSQL and no external credentials. CI/staging execution is deferred; no remote result is claimed.

**Verification:** Run setup, migrations, API tests, web browser tests, Expo checks, workspace lint/typecheck/build for each selected path.

**Dependencies:** Tasks 16–18.

**Files likely touched:** setup tests, `.github/workflows/ci.yml`, package scripts.

**Estimated scope:** Medium.

**Local completion evidence (2026-11-15):** Both disposable copies pass install, fresh database migrations, lint, typecheck, and builds. No-auth health/auth-404 smoke and lockfile absence checks pass; selected API 11/email 5/native 10/browser 10 tests pass. CI/staging execution is deferred.

### Task 20: Document the selected auth recipe workflow

**Description:** Update starter docs with recipe selection, local account provisioning, service URLs, test commands, failure/fix guide, and scope limits.

**Acceptance criteria:**

- [x] A fresh fork user can select or omit auth and find the exact web, Expo, and test commands.
- [x] Docs distinguish this locally verified integration example from environment-specific production auth configuration.
- [x] README links to the Epic, design spec, and auth test guide.

**Verification:** Follow the documented instructions from a clean clone or clean worktree for each setup mode.

**Dependencies:** Tasks 14 and 19.

**Files likely touched:** `README.md`, `docs/local-dev.md`, `docs/testing/auth-login-logout.md`.

**Estimated scope:** Small.

**Local completion evidence (2026-11-15):** The recipe guide, README, local-dev guide, test guide, and source-of-truth decision document selection, safe reruns, prerequisites, exact commands, and deployment limits. Instructions were exercised in the clean-copy verifier.

## Final checkpoint

- [x] Final local epic review and the dedicated observability task are complete. Remaining device coverage limits are explicit in the test guide; CI/staging execution is deferred.
- [x] Expo remains SDK 58 and the selected mobile styling decision is verified.
- [x] Auth-selected and no-auth setup paths both work from clean copies.
- [x] Workspace lint, typecheck, build, API tests, web browser tests, and mobile checks pass.

### Auth observability follow-up: lifecycle outcomes and privacy — Complete locally

**Description:** Complete auth instrumentation using the observability-and-instrumentation skill while preserving the existing session architecture.

**Questions to answer:** Where do registration, verification, sign-in, and recovery flows fail or stop? Are failures caused by rejected input, unavailable API/database, or email delivery? Are session checks failing or expiring unexpectedly? Which lifecycle operations are slow?

**Acceptance criteria:**

- [x] Define bounded lifecycle operation/outcome events and counters for registration, verification/resend, sign-in/out, recovery/reset, and session checks; distinguish actual server outcomes from privacy-preserving public responses.
- [x] Correlate API and email outcomes with request/trace IDs and explicit entry points. Log expected rejection separately from operational failure; avoid noisy success logs for periodic session checks.
- [x] Document aggregate funnel limitations: request counts are not unique-user conversion. Any client funnel instrumentation must use allowlisted fields and an explicit privacy/retention policy.
- [x] Review every logging and tracing sink, including Better Auth library logs, HTTP URL attributes, SMTP errors, and client errors. Exclude passwords, cookies, authorization headers, tokens, email addresses, full bodies, raw deep links, and database/SMTP credentials; sanitize query and path tokens consistently.
- [x] Add meaningful regression checks with sentinel secrets for actual logs and exported spans. Verify counters and duration histograms use bounded operation/outcome labels.
- [x] Record observed success/failure telemetry and local collector evidence; add actionable runbooks for auth/API or email failures. Production alert destinations and thresholds depend on the fork's hosting/SLO configuration.

**Completion evidence (2026-11-15):** Reviewed Tasks 1–20 using the observability skill; the mapping is recorded in `docs/auth-observability.md`. Added bounded auth/email counters and duration histograms, correlated structured events with entry points, privacy-safe library diagnostics, strict trace export filtering, explicit OTLP log export, safe request/error serialization, and web request/proxy logging protections. Two real-export tests pass against a local OTLP receiver, including logs/metrics/traces, active trace correlation, an induced email failure, and sentinel-secret absence. API auth 11/email 5/native 10/browser 12 tests and clean selected/unselected recipe verification pass. Workspace quality gates pass. A runbook documents symptoms and first checks; CI/staging, alert delivery, and deployed collector/dashboard verification are deferred, not claimed as passed.

**Verification:** Exercise successful and rejected sign-in, email-delivery failure, session expiry/revocation, and verification/reset links against isolated services. Inspect emitted logs, metrics, and traces for correlation, bounded labels, and absence of sentinel secrets.
