# Task Checklist: Cross-Platform Better Auth Example

This checklist is tracked separately from `tasks/todo.md`, which retains the existing starter infrastructure follow-ups.

## Phase 1: Plan, design, and verify mobile styling

### Task 1: Write the authentication Epic and reusable planning templates

**Description:** Document why the sign-in/sign-out example exists, its boundaries, and a reusable format contributors can use for future Epics and implementation tasks.

**Acceptance criteria:**

- [ ] Epic states goals, non-goals, risks, acceptance checks, and links to the design and test documents.
- [ ] Reusable Epic and task templates include ownership-neutral descriptions, acceptance criteria, verification, dependencies, and scope.
- [ ] Epic is scoped to web and Expo sign-in/sign-out; account lifecycle extensions are deferred.

**Verification:** Review the templates against one auth task and confirm a contributor can fill them without project-specific assumptions.

**Dependencies:** None.

**Files likely touched:** `docs/epics/auth-login-logout.md`, `docs/templates/epic.md`, `docs/templates/task.md`.

**Estimated scope:** Medium.

### Task 2: Specify web and Expo sign-in/sign-out behavior

**Description:** Define screen states and interaction differences while keeping the user flow and API contract consistent across platforms.

**Acceptance criteria:**

- [ ] Covers signed-out, submitting, invalid-credentials, API-unavailable, authenticated, expired-session, and signed-out-again states.
- [ ] Web specification covers responsive narrow layouts, keyboard reachability, browser reload, and redirects.
- [ ] Expo specification covers native keyboard behavior, session persistence, and platform navigation.

**Verification:** Review against `docs/design-guidelines.md` and the Expo platform conventions; confirm no signup, verification, reset, or social UI is implied.

**Dependencies:** Task 1.

**Files likely touched:** `docs/design/auth-login-logout.md`.

**Estimated scope:** Small.

### Task 3: Specify test cases and failure diagnosis

**Description:** Create a cross-platform test matrix and a repeatable format for recording actual failures, their root causes, fixes, and regression checks.

**Acceptance criteria:**

- [ ] Includes API, web, native, setup-selection, security/configuration, and responsive interaction cases.
- [ ] Separates expected negative cases (such as invalid credentials) from development failures that require diagnosis.
- [ ] Defines what a useful failure/fix walkthrough records without requiring intentionally broken code to remain in the repository.

**Verification:** Map every Epic acceptance criterion to at least one automated or manual check.

**Dependencies:** Tasks 1 and 2.

**Files likely touched:** `docs/testing/auth-login-logout.md`.

**Estimated scope:** Small.

### Task 4: Check utility styling compatibility on Expo 58

**Description:** Test NativeWind and, only if needed, other maintained utility-style options against the repository's pinned Expo SDK 58 / React Native 0.88 stack.

**Acceptance criteria:**

- [ ] Expo remains on SDK 58 throughout the spike.
- [ ] Candidate is checked against official compatibility guidance and installed only in an isolated, reversible spike.
- [ ] iOS and Android both bundle and render a probe covering layout, spacing, color, and state styles; a bundle-only pass does not count as compatibility.

**Verification:** Record exact versions, commands, device/runtime results, and known issues in the task notes or design decision. If no candidate passes, stop and retain StyleSheet.

**Dependencies:** None.

**Files likely touched:** `apps/mobile/package.json`, Expo styling config, probe screen, and `package-lock.json`.

**Estimated scope:** Medium.

### Task 5: Establish the mobile styling foundation

**Description:** Integrate the candidate that passed Task 4, or record React Native StyleSheet as the supported baseline when none passes.

**Acceptance criteria:**

- [ ] Expo SDK 58 remains pinned and its dependency compatibility check passes.
- [ ] Styling configuration is documented and mobile components remain platform-local.
- [ ] Existing iOS and Android exports continue to work.

**Verification:** Run mobile lint, typecheck, iOS/Android export, and the runtime probe on both platforms.

**Dependencies:** Task 4.

**Files likely touched:** `apps/mobile/**`, `package.json`, `package-lock.json`, `docs/design-guidelines.md`.

**Estimated scope:** Medium.

## Checkpoint: Design and mobile foundation

- [ ] Tasks 1–5 complete with Expo SDK 58 unchanged.
- [ ] Contributor-facing Epic, design, and test documents agree on the sign-in/sign-out scope.
- [ ] Mobile styling decision is backed by iOS and Android evidence.

## Phase 2: Better Auth API foundation

### Task 6: Add Better Auth server configuration and local account provisioning

**Description:** Add the server-only Better Auth configuration to the API, connect it to PostgreSQL, configure required secrets/origins, and provide a local/test account path without a signup screen or committed credentials.

**Acceptance criteria:**

- [ ] Better Auth is pinned to a stable compatible version and runs in the API process, not as a hosted service.
- [ ] The public signup endpoint is disabled for this sign-in-only slice; local/test account provisioning is explicit and never creates a shared production password.
- [ ] Production startup fails clearly for missing required secrets or invalid auth configuration.

**Verification:** Run Better Auth diagnostics/schema checks and prove a local/test account can be provisioned and read without exposing its password in logs.

**Dependencies:** Tasks 1 and 3.

**Files likely touched:** `apps/api/package.json`, `apps/api/src/auth.ts`, auth config/environment docs.

**Estimated scope:** Medium.

### Task 7: Add Better Auth tables to the Kysely migration sequence

**Description:** Generate and review the auth schema, then incorporate its SQL into one ordered project migration.

**Acceptance criteria:**

- [ ] Migration creates the tables and indexes required by the configured Better Auth features.
- [ ] Fresh database setup and the existing migration runner apply it in order.
- [ ] Runtime/setup does not depend on a separate Better Auth migration command.

**Verification:** Apply migrations on a clean PostgreSQL database, run the Better Auth schema check, and verify the down-migration policy matches repository migration conventions.

**Dependencies:** Task 6.

**Files likely touched:** `apps/api/src/migrations/<new_auth_migration>.ts`, `apps/api/src/database.ts` if generated database typing needs updates.

**Estimated scope:** Small.

### Task 8: Mount auth routes and configure trusted origins/CORS

**Description:** Connect Better Auth to the existing Fastify API and configure browser/native request origins and credential handling explicitly.

**Acceptance criteria:**

- [ ] Better Auth catch-all handler is mounted at the chosen `/api/auth` path and its response headers/cookies are preserved.
- [ ] Credentialed CORS allows configured web development origins and rejects untrusted origins; production does not use wildcard origin reflection.
- [ ] Expo deep-link/development origins are narrowly documented and development wildcards are never enabled in production.

**Verification:** Exercise preflight, sign-in, session lookup, and sign-out requests from the web origin and Expo runtime; verify cookies/headers survive the Fastify bridge.

**Dependencies:** Tasks 6 and 7.

**Files likely touched:** `apps/api/src/app.ts`, `apps/api/src/auth.ts`, `.env.example`, `docs/local-dev.md`.

**Estimated scope:** Medium.

### Task 9: Add API authentication integration tests

**Description:** Test the auth API and session lifecycle against an isolated PostgreSQL database.

**Acceptance criteria:**

- [ ] Covers valid and invalid sign-in, anonymous session, authenticated session, and sign-out invalidation.
- [ ] Covers untrusted origin and missing/invalid production configuration behavior.
- [ ] Tests clean up users/sessions and do not rely on shared credentials or the developer's database volume.

**Verification:** Run the focused API test command locally and in CI using a disposable PostgreSQL service.

**Dependencies:** Tasks 6–8.

**Files likely touched:** `apps/api/src/**/*.test.ts`, `apps/api/package.json`, `.github/workflows/ci.yml`.

**Estimated scope:** Medium.

## Checkpoint: API authentication

- [ ] Better Auth API flow passes against clean PostgreSQL.
- [ ] Session and cookie behavior is demonstrated with both web origin and native client requests.
- [ ] Invalid credentials and rejected origins do not create sessions.

## Phase 3: Web and Expo sign-in/sign-out

### Task 10: Build the web sign-in and authenticated views

**Description:** Use Tailwind and shadcn/ui for a mobile-first sign-in form, session-aware view, and sign-out action over the shared API behavior.

**Acceptance criteria:**

- [ ] Covers submitting, invalid credentials, API unavailable, loading session, authenticated, and signed-out states accessibly.
- [ ] Protected view validates the session with the server; client-only session UI is not treated as authorization.
- [ ] Works at 320 and 360–390 CSS-pixel widths with keyboard focus and relevant actions reachable.

**Verification:** Run web typecheck/build and inspect browser behavior for direct protected-route access, reload, and sign-out.

**Dependencies:** Tasks 2, 5, and 8.

**Files likely touched:** `apps/web/app/**`, `apps/web/components/**`, `apps/web/lib/**`, `apps/web/package.json`.

**Estimated scope:** Medium.

### Task 11: Build the Expo sign-in and authenticated views

**Description:** Use the official Better Auth Expo integration for sign-in, session state, secure session storage, and sign-out in the native app.

**Acceptance criteria:**

- [ ] Native UI supports submitting, invalid credentials, API unavailable, session loading, authenticated, and signed-out states.
- [ ] Session persistence uses supported secure storage; sign-out clears server session and local session state.
- [ ] API URL works from simulator and physical device networking, with no localhost assumption on a physical device.

**Verification:** Run mobile typecheck/export and sign in, reload/relaunch, and sign out on iOS and Android.

**Dependencies:** Tasks 2, 5, and 8.

**Files likely touched:** `apps/mobile/App.tsx`, `apps/mobile/lib/**`, `apps/mobile/app.json`, `apps/mobile/package.json`.

**Estimated scope:** Medium.

### Task 12: Add web browser and native client/UI tests

**Description:** Automate web browser journeys and native auth UI/session transitions, then document the device-only checks that cannot run reliably in CI.

**Acceptance criteria:**

- [ ] Browser suite covers sign-in success/failure, protected-route behavior, reload persistence, sign-out, API failure, keyboard reachability, and horizontal overflow.
- [ ] Native tests cover auth client/UI state transitions and failure handling; a device checklist covers actual SecureStore persistence on iOS and Android.
- [ ] CI runs the automated suites with isolated services and no external credentials.

**Verification:** Run focused suites locally and in CI; capture artifacts only when they are useful and redact credentials/session data.

**Dependencies:** Tasks 9–11.

**Files likely touched:** `apps/web/tests/**`, `apps/mobile/**` test files, root/workspace package manifests, `.github/workflows/ci.yml`.

**Estimated scope:** Medium.

### Task 13: Document test operation and observed failure/fix examples

**Description:** Turn real development/test failures into a short teaching walkthrough and document local commands for every test layer.

**Acceptance criteria:**

- [ ] Records at least one real auth/styling issue with reproduction, symptom, root cause, fix, and passing regression check.
- [ ] Documents how to run API, browser, native, and setup tests and how to read their failure output.
- [ ] Does not present expected negative cases as implementation defects or invent an unobserved failure as fact.

**Verification:** A contributor can run the documented commands from a clean setup and locate the corresponding tests.

**Dependencies:** Task 12.

**Files likely touched:** `docs/testing/auth-login-logout.md`, `README.md` or `docs/local-dev.md`.

**Estimated scope:** Small.

## Checkpoint: Cross-platform flow

- [ ] Web and Expo both sign in, retain session, present authenticated state, and sign out.
- [ ] API, browser, native, and responsive acceptance cases pass.
- [ ] Failure/fix documentation is based on observed work and includes a regression test.

## Phase 4: Selectable auth setup recipe

### Task 14: Choose the optional recipe source-of-truth model

**Description:** Decide how the working API, web, and Expo implementation is stored and copied/generated so it remains maintainable as an optional setup recipe.

**Acceptance criteria:**

- [ ] A single editable source of truth exists for each scaffolded file; duplicated hand-maintained copies are avoided.
- [ ] The model can install auth dependencies and migration only when selected and has a clear no-auth default.
- [ ] Setup reruns preserve user edits and avoid deleting unrelated files.

**Verification:** Review a small representative scaffold in a disposable copy and confirm selected/unselected outputs and rerun behavior.

**Dependencies:** Tasks 6–13.

**Files likely touched:** `docs/decisions/auth-scaffold.md`.

**Estimated scope:** Small.

### Task 15: Add setup selection and scaffold API/database auth

**Description:** Add an interactive and non-interactive auth selection path and apply the selected API dependencies, configuration, and migration files.

**Acceptance criteria:**

- [ ] Auth selection is explicit and defaults consistently with the chosen optional-recipe behavior.
- [ ] API auth code, dependencies, environment keys, and migration are present only in the selected setup.
- [ ] Missing prerequisites and reruns produce actionable output without exposing secrets or overwriting user files.

**Verification:** Run the setup helper in isolated copies for both choices and inspect resulting manifests, files, lockfile, and migration list.

**Dependencies:** Task 14.

**Files likely touched:** `scripts/setup.sh`, `scripts/scaffold-auth.mjs`, API recipe manifest/source.

**Estimated scope:** Medium.

### Task 16: Scaffold the web auth client and UI

**Description:** Make web auth dependencies, client configuration, and sign-in/signed-in screens available only when the auth option is selected.

**Acceptance criteria:**

- [ ] Selected setup installs and wires the web auth client to the API origin.
- [ ] Unselected setup retains the existing starter health page and has no auth-only package dependency.
- [ ] Re-running setup does not replace user-edited web files.

**Verification:** Run selected/unselected web typecheck and build from clean copies.

**Dependencies:** Tasks 10 and 15.

**Files likely touched:** `apps/web/package.json`, web recipe manifest/source, `scripts/scaffold-auth.mjs`.

**Estimated scope:** Medium.

### Task 17: Scaffold the Expo auth client and UI

**Description:** Make the Better Auth Expo client and sign-in/signed-in screens available only when the auth option is selected.

**Acceptance criteria:**

- [ ] Selected setup installs SDK-compatible Expo auth dependencies and secure session storage.
- [ ] Unselected setup keeps the baseline Expo app free of auth-only dependencies and configuration.
- [ ] Expo remains SDK 58 and rerunning setup preserves user-edited app files.

**Verification:** Run selected/unselected mobile typecheck and iOS/Android export from clean copies; perform the device checks defined in Task 12.

**Dependencies:** Tasks 11 and 15.

**Files likely touched:** `apps/mobile/package.json`, mobile recipe manifest/source, `apps/mobile/app.json`, `scripts/scaffold-auth.mjs`.

**Estimated scope:** Medium.

### Task 18: Verify both clean setup paths

**Description:** Prove that auth-selected and no-auth setups install cleanly and remain independently runnable.

**Acceptance criteria:**

- [ ] Both paths work from clean copies; the no-auth path has no stale auth dependency, file, migration, or generated state.
- [ ] Setup output and errors identify next corrective actions and do not leak secrets.
- [ ] CI exercises both setup modes using isolated PostgreSQL and no external credentials.

**Verification:** Run setup, migrations, API tests, web browser tests, Expo checks, workspace lint/typecheck/build for each selected path.

**Dependencies:** Tasks 15–17.

**Files likely touched:** setup tests, `.github/workflows/ci.yml`, package scripts.

**Estimated scope:** Medium.

### Task 19: Document the selected auth recipe workflow

**Description:** Update starter docs with recipe selection, local account provisioning, service URLs, test commands, failure/fix guide, and scope limits.

**Acceptance criteria:**

- [ ] A fresh fork user can select or omit auth and find the exact web, Expo, and test commands.
- [ ] Docs distinguish this staging-ready integration example from environment-specific production auth configuration.
- [ ] README links to the Epic, design spec, and auth test guide.

**Verification:** Follow the documented instructions from a clean clone or clean worktree for each setup mode.

**Dependencies:** Tasks 13 and 18.

**Files likely touched:** `README.md`, `docs/local-dev.md`, `docs/testing/auth-login-logout.md`.

**Estimated scope:** Small.

## Final checkpoint

- [ ] All acceptance criteria in the Epic, design, and test strategy are complete.
- [ ] Expo remains SDK 58 and the selected mobile styling decision is verified.
- [ ] Auth-selected and no-auth setup paths both work from clean copies.
- [ ] Workspace lint, typecheck, build, API tests, web browser tests, and mobile checks pass.
