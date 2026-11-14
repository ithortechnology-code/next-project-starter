# Forkable Product Starter: Auth as a Worked Example

## Problem Statement

How might we help developers go from a fresh fork to a running product example with one setup command, while teaching them how to carry a feature from an Epic and task plan through design, implementation, and tests?

## Recommended Direction

Keep authentication optional, and use it as the starter's worked product feature. Better Auth is an in-app TypeScript library running in this project's API and PostgreSQL; it is not a hosted auth service. The API sends verification and reset email through the existing SMTP interface, with Mailpit capturing messages locally. The setup flow should let a developer select the auth scaffold; the default path remains useful without auth. Use a flag such as `--with-auth` so the same command works interactively and in automation.

Add a small, generic product-style sample centered on a file workspace. Demonstrate signup, sign-in, email verification, password reset, and authenticated access in both the Next.js web app and Expo app. Demonstrate upload and download, local S3-compatible storage, and a background job in action on the developer's local machine. The local demo may show local S3 service and object URLs so people can see the storage flow. Keep local demo settings distinct from the template's staging and production deployment path, which each fork configures for its own environments.

Make the example teach the development process as well as the feature. Include one complete authentication Epic, reusable Epic/task templates, a screen and flow design, an implementation plan and task checklist, and a testing strategy with visible automated and manual checks. The current job example only confirms enqueueing, so showing completion requires adding a status or result path.

Better Auth's official docs describe PostgreSQL support through Kysely and an Expo integration for native and web clients. Target Expo SDK 55 for the documented integration (React Native 0.83 and React 19.2); SDK 55 requires the New Architecture. Set Node.js 24 LTS as the baseline and keep the Node version consistent in local setup and application containers; CI checks both Node 24 and 26 LTS. Exclude odd-numbered Node releases because Node 25 is end-of-life. The project's single append-only Kysely migration history should remain authoritative; generate the auth schema from Better Auth and incorporate it into that history instead of creating a second migration path.

## Key Assumptions to Validate

- [ ] Developers starting real products benefit from a working product example more than a blank app. Validate by having several developers follow the fresh-fork setup.
- [ ] An auth flow is a useful example for showing how to plan, design, implement, and test a cross-platform feature.
- [ ] Verify the SDK 55 New Architecture and native development-build path on supported iOS/Android tooling.
- [ ] Both setup paths work without stale migrations, dependencies, or generated files when auth is omitted.
- [ ] Local Postgres and Mailpit can support repeatable automated auth-flow tests in CI.

## MVP Scope

1. Keep one setup command after Node.js, npm, and Docker prerequisites; have it explain any required tool-specific hook approval.
2. Write an authentication Epic, reusable Epic/task templates, a design specification for web and Expo, an implementation plan, and an ordered task checklist.
3. Add the optional Better Auth package and API integration, schema migration, and shared client setup when auth is selected.
4. Build signup, sign-in, email verification, password reset, and protected sample flows for both web and Expo; capture local auth messages with Mailpit.
5. Demonstrate file upload/download, the local S3-compatible backend, and a background job lifecycle in the sample workspace.
6. Add tests for auth services/routes, verification and reset email flows using Mailpit, web browser journeys, Expo UI/session behavior, and both setup modes.
7. Keep staging and production deployment guidance in the base template; users supply their own environment configuration and credentials.

## Not Doing (and Why)

- Require authentication in every fork — projects should be able to start with their own auth choices.
- Depend on a hosted Better Auth service — the example uses the package in the project's own API and database.
- Provision cloud credentials during local setup — credentials and provider accounts belong to each project environment.
- Add social login, organizations, roles, or SSO to the first auth example — these expand beyond the core account lifecycle being demonstrated.
- Turn the sample into a domain-specific product — keep it generic and easy to replace.

## Open Questions

- Should setup offer an interactive auth choice by default, with `--with-auth` for automation, or require an explicit flag?
- Should the sample show persisted job status in the app, or enqueue the job and link to local logs?

## Technical References

- [Better Auth introduction](https://better-auth.com/docs/introduction) — framework-agnostic TypeScript authentication library.
- [Better Auth PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql) — direct PostgreSQL support through Kysely.
- [Better Auth Expo integration](https://better-auth.com/docs/integrations/expo) — web and native Expo integration; the guide currently targets Expo SDK 55.
- [Better Auth email and password](https://better-auth.com/docs/authentication/email-password) — email verification and password reset flows.
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases) — supported LTS release lines.
- [Expo SDK 55 reference](https://docs.expo.dev/versions/v55.0.0/) — supported React, React Native, and Node versions.
- [Expo SDK upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) — dependency alignment and validation steps.
- [Expo New Architecture guide](https://docs.expo.dev/guides/new-architecture/) — SDK 55 architecture requirements.
