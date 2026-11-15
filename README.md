# Project Starter

A reusable TypeScript boilerplate for building a web app, an iOS/Android app, and an API together. It provides local development services, shared validation, database migrations, background jobs, email, file storage, and privacy-aware telemetry. An optional authentication example includes the complete email/password lifecycle.

**Start here:** copy the repository, choose whether to include auth, run local setup, then adapt the generated project. You do not need cloud credentials to try it locally.

## Is this an installer package?

This is currently a **repository template with a local recipe generator**. The root npm package is private. There is no published `create-project-starter` package, `npx` installer, project-name wizard, or versioned scaffold release yet.

You can create a project using GitHub’s **Use this template** button when the source repository is configured as a template, or by cloning it. The generator selects auth or a no-auth baseline inside that copy; it does not generate arbitrary app architectures or automatically rename a project.

## What you get

| Area                        | Technology and purpose                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Workspace                   | npm workspaces and TypeScript; Node.js 24 default, Node.js 26 also supported                                               |
| API                         | Fastify; JSON endpoints and OpenAPI route schemas                                                                          |
| Web                         | Next.js and React; Tailwind CSS 4 and shadcn/ui                                                                            |
| Mobile                      | Expo SDK 58 and React Native; NativeWind 4/Tailwind CSS 3 foundation with app-local native components                      |
| Shared contracts            | Zod schemas and pure shared logic in `packages/shared`                                                                     |
| Database                    | PostgreSQL 18, Kysely, and ordered migrations                                                                              |
| Authentication, if selected | Better Auth, SMTP verification/reset emails, database sessions, Expo SecureStore                                           |
| Background jobs             | pg-boss and a separate worker using PostgreSQL                                                                             |
| Storage                     | Filesystem and S3-compatible adapters; local SeaweedFS service                                                             |
| Email                       | Provider-neutral SMTP; Mailpit captures local messages                                                                     |
| Observability               | Pino, OpenTelemetry, Collector, and OpenObserve; auth outcomes, durations, correlation IDs, and redaction                  |
| Verification                | Node integration tests, Playwright browser tests, and iOS-preset native component tests                                    |
| Deployment files            | Dockerfiles, GitHub Actions, and a two-environment VPS/Cloudflare/Caddy example; external execution remains to be verified |

The generated project keeps these boundaries:

```text
apps/api/          API, migrations, email, jobs, and worker
apps/web/          Web app and app-local components
apps/mobile/       Expo app and app-local native components
packages/shared/   Shared contracts and validation
packages/storage/  File storage adapters
scripts/           Setup, recipe generation, and local verification
.agents/skills/    Repository-local agent instructions and skills
.codex/            Codex hook configuration
.claude/           Committed Claude configuration/skill files, where present
docs/              Design, development, testing, and deployment guides
```

**Auth selected:** registration → verification email/resend → sign-in → persisted rolling session → sign-out; forgot-password/reset revokes existing sessions. Web uses cookies; Expo stores the opaque session cookie through SecureStore. PostgreSQL controls expiry and renewal. See the [auth design](docs/design/auth-login-logout.md).

**Auth omitted:** web and mobile show starter health screens. Auth-only clients, UI, API sources, CLI tooling, dependency chain, environment-template keys, and auth migration are removed. Generic API, database, jobs, email infrastructure, storage, and telemetry remain. The reference repository intentionally contains the working auth example before generation.

OpenAPI coverage is **partial**: `/openapi.json` exists, but individual Better Auth operations and an interactive documentation dashboard are still an [open task](tasks/todo.md). Do not assume the full API explorer is available yet.

## Required tools

| Tool                                                                                                         | Needed for                                                                |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Git                                                                                                          | Copying the repository and tracking your changes                          |
| Node.js 24 + npm 10 or newer                                                                                 | Installing packages and running/building apps; `.nvmrc` selects Node 24   |
| Docker Desktop, or Docker Engine with Compose v2                                                             | Local PostgreSQL and optional supporting services; Docker must be running |
| Bash                                                                                                         | `scripts/setup.sh` and agent environment scripts                          |
| Browser                                                                                                      | Web app, Mailpit, and telemetry UI                                        |
| macOS + Xcode, command-line tools, an installed iOS Simulator runtime, and CocoaPods for native dependencies | Native iOS build/runtime checks                                           |
| Android Studio/emulator or an Android device                                                                 | Android runtime development, if you choose to do it                       |

With nvm, run `nvm install` then `nvm use` inside the repository. Another version manager can select Node 24 instead. Node 26 is accepted by the scripts; remote CI execution on either version is not claimed verified in this checkout.

The local workflow was exercised on macOS. Windows users need an appropriate Bash environment, typically WSL2 with Docker integration; Windows/WSL end-to-end setup has not been verified here. You can run web/API work without Xcode or an Android emulator.

## Create your own project

Choose one method. Replace the example repository URLs with real URLs; this checkout does not supply a published installer or public source URL.

### GitHub template

1. Open the published source repository and select **Use this template → Create a new repository**.
2. Clone your new repository and enter its directory.
3. Choose a recipe and run setup below, **before editing app source or package manifests**.

### Clone a copy

```sh
git clone https://github.com/YOUR_ORG/YOUR_STARTER.git my-project
cd my-project

# Keep the original as an upstream and connect your own empty repository.
git remote rename origin upstream
git remote add origin https://github.com/YOUR_ORG/MY_PROJECT.git
```

This keeps the source history. GitHub’s template flow gives you a new repository instead. Neither method registers cloud services, creates VPSes, or configures a deployment for you.

## Set up and see it working

Choose **one** recipe in a fresh copy:

```sh
# Full auth example, useful for trying the complete demo:
AUTH_RECIPE=better-auth bash scripts/setup.sh --start
```

Or:

```sh
# Health-screen baseline without authentication:
AUTH_RECIPE=none bash scripts/setup.sh --start
```

Setup installs npm packages, reconciles the lockfile, creates an ignored `.env`, starts local Compose services, applies migrations, and starts the API, web app, Expo dev server, and worker. For auth, it generates a local auth secret if needed. First installation/build can take several minutes.

Interactive setup asks whether to include auth. The non-interactive default is `none`; use `AUTH_RECIPE` explicitly for repeatable setup. To prepare services without launching app processes, omit `--start`, then start the apps separately:

```sh
npm run dev          # API + web
npm run dev:worker   # Separate terminal
npm run dev:mobile   # Separate terminal
```

Default URLs, unless `.env` changes their ports:

| Service                   | Address                                            |
| ------------------------- | -------------------------------------------------- |
| Web                       | http://localhost:3000                              |
| API health                | http://localhost:4000/health                       |
| Existing OpenAPI document | http://localhost:4000/openapi.json                 |
| Mailpit inbox             | http://localhost:8025                              |
| OpenObserve               | http://localhost:5080                              |
| Expo/Metro                | Port 8081; follow the terminal/device instructions |

Setup prints the configured service addresses. Local example credentials are in `.env.example`; use your `.env` values if you changed them. They are development defaults, not production credentials.

### Try the auth flow

1. Open the web app, create an account, and leave the verification screen open.
2. Open Mailpit and follow the verification email link. Local messages stay in Mailpit; they are not sent to real recipients.
3. Sign in, reload the page, and sign out. Anonymous visits to `/app` return to sign-in.
4. Request a password reset, open the Mailpit link, and complete it. Existing sessions are revoked.
5. Follow the [observability guide](docs/auth-observability.md) to inspect safe lifecycle events and duration metrics. Local exporter tests are verified; a ready-made auth funnel dashboard is not provided.

There is no shared demo user/password. Create your own local account; explicit local provisioning is documented in [local development](docs/local-dev.md).

### Try native iOS

With the local API/Metro running and Xcode’s simulator ready, build and open the native app. Run this block from the repository root:

```sh
(
  cd apps/mobile
  node --import=../../scripts/load-env.mjs ../../node_modules/expo/bin/cli run:ios --no-bundler
)
```

Complete Xcode’s first-run setup and install a simulator runtime first. Resolve any CocoaPods/native-dependency prompts reported by Expo. Simulator builds do not require store distribution setup; physical-device/release signing needs your own Apple configuration.

If Metro uses a custom port, also pass `--port` with the port printed by setup. `--no-bundler` reuses the Metro server already running from setup.

This is an additional build step; `npm run dev:mobile` starts Metro but does not itself compile a native binary. `npm run ios --workspace=@starter/mobile` starts Expo with iOS selected. Expo Go can help inspect supported screens, but it does not register this project’s custom auth callback scheme. Use a native build for the full email-link flow.

The iOS Simulator can reach the computer’s localhost API. On a physical phone, set `EXPO_PUBLIC_API_URL` to a reachable computer LAN address, configure matching public email-link URLs/origins, and allow the connection through your firewall. Android emulators commonly use `http://10.0.2.2:4000` for the host. These addresses are development configuration; deployed apps need HTTPS and product-specific app/universal links.

## What generation changes—and what you still do

The recipe is recorded in `.starter/auth-selection.json`. Its choice is **one-time**: rerunning the same choice preserves user edits; changing choices requires a fresh template copy. Modified recipe inputs are rejected before generation writes anything. The generator does not migrate or delete an existing product database.

For source generation alone, without starting Docker:

```sh
node scripts/scaffold-auth.mjs better-auth  # Or: none
npm install
```

The full setup script also formats the no-auth output. If using source-only generation, follow the formatting step in the [recipe guide](docs/auth-recipe.md) before linting.

After selecting the recipe:

- Set your root package name and app display names, Expo slug/scheme and bundle/application identifiers. There is no automatic project renaming. If changing workspace package names, update their dependency references and imports together.
- Use a unique Compose project name and ports if running several projects at once; [agent environments](docs/local-dev.md) and `scripts/agent-env.sh` provide isolated worktrees for parallel work.
- Configure `.env` and service profiles. The default enables Mailpit, observability and SeaweedFS. If disabling SeaweedFS, set `STORAGE_DRIVER=filesystem`; if disabling observability, clear `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Adapt product copy, branding, schemas, migrations and business logic. Keep `AGENTS.md`, design guidelines and project docs consistent with your fork.
- Commit the generated source, `.starter/auth-selection.json`, and updated lockfile. Keep `.env`, keys, native generated folders and build outputs out of Git.

See the [source-of-truth decision](docs/decisions/auth-scaffold.md) for safe reruns and how starter maintainers refresh recipe fingerprints after changing canonical inputs.

## Are AI skills installed too?

A template/clone copy includes the **committed** `AGENTS.md`, `.agents/skills/`, `.codex/hooks.json`, and available `.claude/` files. They are development aids, not app runtime dependencies. The auth recipe preserves them.

Setup does **not** install Codex/Claude, an editor extension, MCP/browser tooling, AI credentials, or global skills. Whether a tool discovers repository-local skills and runs hooks depends on that tool’s support and configuration. Review and enable them in your agent environment; read [AGENTS.md](AGENTS.md) before agent-assisted work. The apps run without an AI agent.

Impeccable’s committed launcher can obtain a pinned engine on first use; downloaded binaries are ignored by Git and are not included in a new clone. Network/tool permissions may be needed. Review `PRODUCT.md`, `DESIGN.md`, and `docs/design-guidelines.md` for your fork; run the skill’s initialization/context workflow when doing design work. Ordinary npm setup does not conduct a product interview or automatically create a new product design.

## Tests and actual verification status

These are **local results**, not evidence that remote CI, staging or production has passed:

| Layer                  | Verified locally                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API auth               | 11 PostgreSQL-backed tests: registration, verification, sessions, renewal/expiry, reset/revocation, origins and safe responses                               |
| Email                  | 5 configuration/template/failure tests; actual local SMTP flows use Mailpit                                                                                  |
| Telemetry              | 2 tests, including real log/metric/trace export to a local OTLP receiver, correlation and sentinel-secret checks                                             |
| Web/mobile web         | 12 Playwright tests across desktop Chromium and Chromium emulating mobile web; real lifecycle, failures, keyboard, overflow and privacy                      |
| Native                 | 10 component tests using the iOS Jest preset, plus iOS 26.5 simulator evidence for sign-in/out, relaunch persistence, reset, link handoff and keyboard focus |
| Recipe generator       | 3 tests for selected/omitted output, preserved edits, rejected switching and changed-input rejection                                                         |
| Fresh generated copies | Dependency install, isolated fresh migrations, workspace lint/typecheck/build and Expo iOS/Android exports; auth suites on the selected copy                 |

**Platform limits:** native runtime verification focused on iOS. Android export passes; earlier styling probes ran on Android, but the complete Android auth lifecycle has not been runtime-verified. Chromium mobile emulation is not native iOS or Safari testing. Limited manual Safari responsive checks exist. Full VoiceOver/autofill and installed-mail-client handoff remain unverified; actual email URLs were tested through simulator Safari, which handed them to the native app. Passing component tests does not prove every device behavior.

Every generated app can run:

```sh
npm run lint
npm run typecheck
npm run build
```

Auth-selected output also provides:

```sh
npm run test:email --workspace=@starter/api
npm run test:telemetry --workspace=@starter/api
npm run test:auth --workspace=@starter/mobile
npx playwright install chromium
```

API and browser integration tests require running PostgreSQL/Mailpit and a **disposable, migrated test database**. Read the [test guide](docs/testing/auth-login-logout.md) before pointing tests at any database:

```sh
# Replace the placeholder with your test database URL, not starter_dev.
AUTH_TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:PORT/starter_auth_test' npm run test:auth --workspace=@starter/api
AUTH_TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:PORT/starter_auth_test' npm run test:auth --workspace=@starter/web
```

From the intact reference checkout, maintainers can verify both generated paths:

```sh
node --test scripts/tests/auth-recipe.test.mjs
AUTH_TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:PORT/starter_auth_test' node scripts/verify-auth-recipes.mjs
```

The full verifier creates and drops its own test databases and needs a role allowed to do so. It removes temporary copies after checking them. Generator tests belong in the reference checkout, where canonical auth sources still exist. They are not the product test suite for a generated no-auth project.

Stop local services with `docker compose down`; this keeps named data volumes. `docker compose down -v` deletes those volumes and their data.

## Staging, VPS testing, and release: next steps

Deployment files are supplied as a starting point. **Remote CI, VPS rollout, staging acceptance, rollback drills, and release publishing have not been verified in this local epic.** Expo exports are JavaScript/assets bundles, not signed `.ipa`/`.aab` files or App Store/Play Store submissions.

Follow the [VPS guide](docs/deploy-vps.md) in this order:

1. Connect your own GitHub repository and review workflow triggers before pushing. Pushes to `main` can publish GHCR images, and successful CI can trigger the staging workflow. Require appropriate protected GitHub Environments before enabling deployment.
2. Run and inspect CI and validate the Docker image builds in that repository. The current quality matrix targets Node 24/26; remote results are still to follow. Do not put cloud credentials in workflow files.
3. Provision an isolated staging VPS, domains, TLS, SMTP, storage, database credentials, backups and environment secrets. Test the actual web/API/native URLs, email links, migrations and telemetry there.
4. Verify backup restoration, application rollback and database migration compatibility. Treat existing PostgreSQL version upgrades as separate maintenance work.
5. After staging acceptance, promote the **same tested immutable image SHA** to a separate production VPS through its protected environment. Choose and tag a release version and write a changelog; there is no published scaffold-package release yet.
6. Configure mobile signing, app identifiers, app/universal links and store accounts separately. Build and test native release binaries on devices before distributing them. Android runtime coverage remains work for a fork that ships Android.

The VPS example uses Ubuntu, Docker Compose, GHCR, Caddy, and Cloudflare DNS/TLS. It is not an automatically provisioned or certified production service. Do not apply its example credentials to staging or production.

## Further reading

- [Starter contract](SPEC.md) and [capability map](CAPABILITIES.md)
- [Local development](docs/local-dev.md) and [email](docs/email.md)
- [Optional auth recipe](docs/auth-recipe.md), [auth epic](docs/epics/auth-login-logout.md), and [task/evidence checklist](tasks/auth-example-todo.md)
- [Test guide](docs/testing/auth-login-logout.md), [auth observability](docs/auth-observability.md), and [failure runbook](docs/runbooks/auth-failures.md)
- [Design guidelines](docs/design-guidelines.md), [PostgreSQL upgrades](docs/postgresql-18-upgrade.md), and [VPS deployment](docs/deploy-vps.md)
- [Open work](tasks/todo.md), including complete OpenAPI coverage and an interactive API docs UI

## License

Original project code is available under the [MIT License](LICENSE). Keep its copyright and permission notice when copying or distributing substantial portions. Third-party dependencies, tools, fonts and imported skill assets retain their respective licenses; the project license does not replace those terms.
