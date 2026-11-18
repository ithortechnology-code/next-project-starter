# Choose authentication in a fresh fork

The template contains the working reference implementation. Choose the generated app's recipe **before editing app files or applying migrations**. The no-auth choice is the non-interactive default. The current reference checkout should be kept intact for developing the starter; run recipe experiments only in disposable copies.

```sh
# Complete local setup with auth:
AUTH_RECIPE=better-auth bash scripts/setup.sh

# Complete local setup without auth:
AUTH_RECIPE=none bash scripts/setup.sh
```

Interactive setup asks whether to include auth. Both choices install dependencies, reconcile the lockfile, start the existing local Compose services, and apply the selected migrations. Docker Compose and Node 24 or 26 are required. Configure service profiles in `.env`; never commit that file.

For source generation without starting Docker:

```sh
node scripts/scaffold-auth.mjs better-auth  # or none
npm install
```

For `none`, format the generated baseline files before linting (the full setup helper does this automatically):

```sh
npx prettier --write apps/api/src/app.ts apps/api/src/email.ts apps/web/app/page.tsx apps/web/app/layout.tsx apps/mobile/App.tsx apps/mobile/app.json packages/shared/src/index.ts
```

The choice is recorded in `.starter/auth-selection.json`. Repeat the same choice safely: the generator preserves all user edits. It rejects switching choices and rejects modified recipe inputs before making changes. Use a fresh template copy if you need to choose differently. This is source scaffolding, not a database migration/removal tool; it never removes database volumes. Existing fork customizations must be integrated deliberately rather than replaced.

The no-auth output has health screens, no auth routes/client/dependencies, and only the baseline database migration. The auth output includes registration, verification/resend, sign-in/out, recovery/reset, PostgreSQL rolling sessions, and Expo SecureStore integration. It does not add social login, MFA, or account deletion.

## Run the apps

```sh
npm run dev:api
npm run dev:web
npm run dev:mobile
```

API reads `DATABASE_URL`, web reads `API_URL`, and Expo reads `EXPO_PUBLIC_API_URL`. Web defaults to port 3000 and API to 4000. The iOS simulator can reach host localhost; physical devices need the computer's reachable LAN address. Custom email callback schemes need a native development build; see [local development](local-dev.md) and the [auth test guide](testing/auth-login-logout.md). Android runtime review is optional; both Expo exports remain required.

## Local checks

```sh
npm run lint
npm run typecheck
npm run build
```

For auth-selected output, also run API email/auth/telemetry tests, web browser tests, and native component tests using the commands in the [test guide](testing/auth-login-logout.md). The no-auth output removes auth-only test scripts. Expected invalid credentials, expired links, and unknown-account reset requests are negative cases, not implementation defects.

Recipe-generator tests run only in the reference checkout (`node --test scripts/tests/auth-recipe.test.mjs`), where the canonical inputs still exist.

From the unmodified reference checkout, verify complete fresh copies of both recipes:

```sh
npx playwright install chromium
AUTH_TEST_DATABASE_URL="postgresql://<user>:<password>@localhost:<port>/starter_auth_test" node scripts/verify-auth-recipes.mjs
```

The database name must contain `test`. The test database role needs permission to create/drop disposable databases. Mailpit SMTP and its API must be reachable. The verifier installs each recipe in a temporary directory, applies migrations to its own new database, runs quality gates, and runs auth/browser/native tests for the selected path. It deletes its temporary directory and test database afterward. Failures exit nonzero; inspect the first failed workspace/check, then use the [observed failure guide](testing/auth-login-logout.md#observed-failure-reset-link-invalidated-during-development). Do not paste logs containing local configuration into public issues.

## Deployment boundary

CI and basic staging deployment smoke checks have passed in the reference repository; these do not certify production readiness or a fork's configuration. Before deployment, forks must configure HTTPS public URLs, explicit trusted origins, unique secrets, an SMTP provider, platform app identifiers, universal/app links with web fallback, and protected hosting environments. Then test the account lifecycle, email delivery, and recovery process on their staging environment. See the [epic](epics/auth-login-logout.md), [design](design/auth-login-logout.md), and [recipe decision](decisions/auth-scaffold.md).
