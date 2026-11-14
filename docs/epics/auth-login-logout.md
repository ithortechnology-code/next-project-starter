# Epic: Cross-platform sign-in and sign-out example

## Goal

Give contributors a small, working example of how this starter carries a cross-platform feature from planning through API, web and native implementation, automated checks, and failure diagnosis. The example supports email/password sign-in, a server-validated signed-in view, session persistence, and sign-out in the web and Expo apps.

This is a generic starter example. It demonstrates integration patterns without adding product-specific account features to the template.

## Users and value

- **Starter contributors** can follow a concrete feature from its scope and design through implementation and verification.
- **Developers evaluating the starter** can see how the independent web and Expo clients use one API and PostgreSQL-backed session system.

## Scope

- Better Auth runs in the API process and uses the existing PostgreSQL database.
- Email/password sign-in, session lookup and persistence, a protected signed-in view, and sign-out are available in web and Expo.
- A documented local/test account provisioning path makes the sign-in-only example usable without a public registration flow.
- The optional setup recipe can include or omit auth without leaving auth-only code, dependencies, or migrations in the omitted setup.
- API, web, native, responsive, security/configuration, and setup-selection behavior is documented and checked.

## Non-goals

- Sign-up UI or public account creation.
- Email verification, password reset, social login, organizations, roles, or SSO.
- A production-ready identity policy for every fork. Each deployment must configure its own origins, secrets, account provisioning, and operational controls.
- Shared web/native presentation components or a new shared UI package.
- Product-specific screens, branding, or domain behavior.

## Constraints and principles

- Keep Better Auth configuration on the server in `apps/api`; PostgreSQL remains the source of truth for users and sessions.
- Add required auth tables to the existing ordered Kysely migration sequence.
- Use `packages/shared` only for contracts genuinely shared by the API and clients. Keep web and Expo presentation and platform behavior app-local.
- Use credentialed CORS and explicit trusted origins. Do not reflect arbitrary origins or enable development wildcards in production.
- Keep credentials out of source, logs, committed fixtures, and reusable production seeds. Fail production startup clearly when required configuration is missing or invalid.
- Keep Expo SDK 58 pinned. The NativeWind 4 foundation and compatibility evidence are tracked in the [implementation plan](../../tasks/auth-example-plan.md) and [Expo 58 report](../testing/nativewind-expo58.md); finish component color, interaction-state, accessibility, and keyboard checks with the native UI.
- Follow [project design guidelines](../design-guidelines.md) for web and native behavior. The separate design specification owns screen-level interaction and responsive behavior.

## Risks and responses

| Risk | Response |
| --- | --- |
| Browser cookie rules can differ across local and deployed web/API origins. | Test configured local origins and document production origin/proxy decisions as deployment-specific. |
| Native clients need supported session persistence and device networking. | Use the supported Expo integration and secure storage; check simulator and physical-device URL behavior. |
| Generated auth schema could diverge from project migrations. | Review generated SQL and add it only through the existing Kysely migration runner. |
| Optional setup could leave stale files or dependencies. | Verify auth-selected and auth-omitted setup from clean copies, including reruns and user-edited files. |
| A sign-in-only flow has no built-in account creation. | Provide an explicit local/test provisioning path without shared credentials or public signup. |

## Acceptance criteria

- [ ] A contributor can follow the linked design and test documents without relying on conversation context.
- [ ] API sign-in, anonymous and authenticated session lookup, sign-out invalidation, and rejected-origin behavior are checked against isolated PostgreSQL.
- [ ] Web and Expo support sign-in, persisted session, server-validated signed-in state, and sign-out; expected failures have recoverable feedback.
- [ ] Web works at 320 CSS pixels and 360–390 CSS pixels without page-level horizontal overflow; keyboard and browser navigation remain usable.
- [ ] Native keyboard, secure session persistence, navigation, and API URL behavior are checked on supported iOS and Android paths.
- [ ] Auth-selected and auth-omitted setup paths work from clean copies; the omitted path has no auth-only dependency, file, migration, or generated state.
- [ ] Workspace lint, typecheck, build, and the focused API, browser, native, and setup checks pass.
- [ ] Any failure/fix walkthrough records an observed failure, reproduction, root cause, fix, and passing regression check; expected negative cases are not described as defects.

## Supporting documents

- [Cross-platform design specification](../design/auth-login-logout.md)
- [Cross-platform test strategy](../testing/auth-login-logout.md)
- [Implementation plan and dependency order](../../tasks/auth-example-plan.md)
- [Task checklist](../../tasks/auth-example-todo.md)

## Completion

This Epic is complete when all acceptance criteria above are met and the implementation plan's final checkpoint is satisfied. Deployment-specific production origin, secret, and account-provisioning choices remain the responsibility of each fork.
