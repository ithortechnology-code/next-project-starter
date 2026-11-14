# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Contributors building from or evaluating this generic, forkable project starter. They need a working reference for adding account access to their own projects.

## Product Purpose

The starter provides a complete, adaptable email/password account lifecycle across its API, web app, and Expo app. Success means a contributor can run the flow locally, understand its boundaries, and adapt it without inheriting product-specific rules.

## Positioning

This is a reusable project starter with an end-to-end auth example, not a consumer identity product. No market or competitive claim is established.

## Operating Context

Contributors clone or fork the repository, run its apps and local PostgreSQL-backed services, then replace generic examples as they build their own product.

## Capabilities and Constraints

- Email/password registration, email verification and resend, sign-in/out, forgot/reset password, and server-validated database sessions.
- The API owns account and session state. Verification and reset links use configured email delivery.
- Web and Expo support the same lifecycle with platform-appropriate UI and secure session handling.
- Keep business rules and shared validation out of UI components; do not add product-specific account features.
- Social sign-in, MFA, organizations, roles, and account deletion are outside the current auth example.

## Brand Commitments

The generic app name is Project Starter. No additional brand identity, logo, or visual style is binding.

## Evidence on Hand

- Auth lifecycle scope and behavior: `docs/epics/auth-login-logout.md` and `docs/design/auth-login-logout.md`.
- API session, verification, reset, and email behavior: `apps/api/src/auth.ts`, `apps/api/src/auth.integration.test.ts`, and `docs/testing/auth-login-logout.md`.
- No customer stories, testimonials, product metrics, or product-specific imagery are supplied; do not invent them.

## Product Principles

- Keep examples generic and safe to adapt.
- Make the server the authority for account and session state.
- Keep API, web, and native apps independently runnable.
- Prefer a complete, inspectable example over product-specific functionality.

## Accessibility & Inclusion

Auth screens must support keyboard navigation, visible focus, readable labels and errors, responsive layouts, and screen-reader status feedback, as specified in `docs/design/auth-login-logout.md`.
