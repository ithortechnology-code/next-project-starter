# Cross-platform email/password account lifecycle design

## Purpose and scope

This specification defines a complete generic email/password account lifecycle for the web and Expo clients. Visitors can register, verify their email, sign in, use a server-validated session, sign out, request a password reset, and complete a reset.

Do not imply social sign-in, MFA, organizations, roles, account deletion, or product-specific account features. Local/test provisioning remains available for isolated development and tests.

The API owns account and session state in PostgreSQL. Verification and password-reset links are sent through the API's configured SMTP transport. Web and Expo share behavior and API expectations, not visual components. Web/mobile-web token demos use a responsive web design; Expo keeps native presentation and keyboard conventions.

Web and Expo use Better Auth's opaque, database-backed session cookie. Set an explicit 7-day session expiry and 1-day update age. Revalidate session status every 5 minutes while the client is active, plus on browser focus or app resume. Better Auth extends the session expiry when a valid session is fetched after the update-age threshold; an expired session is never revived. Sign-out and password reset revoke server-side sessions. Do not add JWT access/refresh tokens or stateless cookie caching to this first-party example; if a future fork needs bearer tokens for external API consumers, document that as a separate credential flow.

## Shared lifecycle

| State                     | Entry condition                                                         | Required behavior                                                                                                                                                                                                                              |
| ------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checking session          | Web route or app starts, reloads, or resumes                            | Ask the API for the current session. Do not show protected identity before confirmation. Keep loading identifiable to assistive technology.                                                                                                    |
| Refreshing session        | The client interval, browser focus, or app resume triggers revalidation | Send the existing session cookie to the API. If the session is valid and past the update-age threshold, the API updates its expiry and refreshes the cookie. If it is expired/revoked, clear local session state and show the signed-out flow. |
| Signed out                | API confirms no valid session                                           | Show sign-in and a clear route to registration. Do not show authenticated content.                                                                                                                                                             |
| Registering               | Valid name, email, password, and confirmation are submitted             | Prevent duplicate submissions, expose progress, never persist/log the password, and handle email already in use without confirming account existence.                                                                                          |
| Verification pending      | Registration request is accepted for email verification                 | Explain that a message was sent, show the submitted email safely, offer resend, and allow return to sign-in. Do not treat the account as authenticated.                                                                                        |
| Verifying email           | User follows a verification link                                        | API validates the one-time token. The web/native landing state reports success, invalid link, or expiry and provides a path to sign-in or resend. Do not expose the token in logs or subsequent navigation.                                    |
| Submitting sign-in        | Valid email and password are sent                                       | Prevent duplicate submissions and expose progress. Do not store the password.                                                                                                                                                                  |
| Invalid credentials       | API rejects the supplied email/password                                 | Use the same public feedback for unknown email and wrong password; retain email for correction.                                                                                                                                                |
| Email not verified        | Credentials are valid but verification is incomplete                    | Do not create an authenticated session. Offer a safe verification resend flow without revealing account existence.                                                                                                                             |
| API/email unavailable     | API request or message delivery cannot complete                         | Explain what can be retried and how local services can be checked. Never claim success if the API did not confirm it.                                                                                                                          |
| Authenticated             | API confirms a valid session                                            | Show safe identity data such as email and provide sign-out.                                                                                                                                                                                    |
| Forgot-password submitted | User submits an email address                                           | Always show the same public confirmation regardless of whether an account exists. Send a reset link only when appropriate.                                                                                                                     |
| Resetting password        | User opens a valid reset link and submits a new password twice          | Validate confirmation, show progress, consume the one-time token, and report invalid/expired/reused tokens with a request-new-link action.                                                                                                     |
| Signing out               | User activates sign-out                                                 | Disable repeated activation and treat sign-out as complete only after server invalidation. Clear local state and protected navigation.                                                                                                         |
| Signed out again          | API confirms sign-out or session expiry                                 | Return to a signed-out route. Reload, browser history, or app Back must not restore protected content.                                                                                                                                         |

Use server/API confirmation, never a client-only flag, as authority for account verification or sessions. Public feedback must not reveal account existence for registration, sign-in, verification resend, or password-reset requests. Never put passwords, cookies, or session tokens in URLs, logs, analytics, or error text. Verification/reset links necessarily contain one-time tokens; redact them in logs and remove them from the visible URL after processing where the platform permits.

## Web behavior

### Reference implementation

The starter web example uses a same-origin `/api/auth/*` Next route to proxy requests to `API_URL`. This keeps the browser on the web origin while preserving Better Auth cookies from the API. Server components forward the incoming cookie to `/api/auth/get-session` with caching disabled and validate the response against the shared safe session schema before rendering `/app`. An API error is shown as a retryable unavailable state; it is not treated as an anonymous session.

The client revalidates the session every five minutes, on browser focus, and when the browser is online. The API remains authoritative for the rolling seven-day session and one-day update age. If revalidation confirms that the session has ended, the client returns to sign-in. A temporary revalidation error leaves the server-confirmed view visible and offers a retry message.

The web visual tokens are recorded in the project [design system](../../DESIGN.md). The auth surface uses a desktop split panel with a pale blue lifecycle context and a white form surface; at widths up to 920px it becomes a single-column form-first layout. The web uses a locally bundled Inter Variable face and 3.5rem form controls. The two-panel treatment is context only; business rules remain out of UI components.

### Routes and navigation

- `/sign-up`: name, email, password, and password confirmation; link to `/sign-in`.
- `/sign-in`: email/password; links to `/forgot-password` and `/sign-up`.
- `/verify-email`: status landing page after API verification or resend; expired/invalid links offer a resend path.
- `/forgot-password`: email field and generic confirmation.
- `/reset-password`: new password and confirmation; accepts a one-time token from the email link, then removes it from browser history after processing.
- `/app`: protected view. A direct visit or reload checks the API session on the server before rendering identity. Signed-out visitors go to `/sign-in` with a safe internal return destination. API failure shows a retryable service state instead of treating the user as signed out.

After successful sign-in, return only to a same-origin relative path that starts with one slash and contains no backslash or control characters; ignore external, protocol-relative, or malformed values. After sign-out, replace the protected history entry where practical. Verification and reset callbacks must not forward untrusted redirect URLs.

### Responsive behavior

- At 320 CSS pixels, show one readable column with the page purpose, fields, primary action, feedback, and relevant account-lifecycle link in that order. No page-level horizontal scrolling.
- At 360–390 CSS pixels, retain the order and comfortable field/action sizing; do not shrink controls to fit.
- At medium and wide widths, constrain forms to a readable maximum width and use surrounding space for alignment and hierarchy. A second column is optional and must not hide the primary flow.
- Long addresses and service feedback wrap. Zoom, text resizing, browser chrome changes, and the mobile keyboard must not hide the focused field or next relevant action. Do not use fixed-height or scroll-locking form layouts.

### Keyboard and accessibility

- Use visible labels, email/password semantics, browser autofill hints, logical focus order, and persistent focus indicators.
- Use appropriate password autocomplete values (`new-password` for registration/reset, `current-password` for sign-in).
- Associate field errors with their inputs. Announce progress and service feedback without repeatedly interrupting typing.
- The password and confirmation fields remain reachable with a mobile keyboard open. Enter submits from the final field.
- Do not disable zoom. Do not rely on color alone for verification, error, disabled, or success states.

## Expo behavior

- Provide native registration, verification-pending/resend, sign-in, forgot/reset-password, authenticated, and sign-out states.
- Use native text inputs, autofill, screen-reader semantics, safe areas, keyboard return behavior, and touch targets. Email advances to password; password submission starts sign-in.
- Use the supported Better Auth Expo integration and secure storage. Do not copy tokens into general preferences, logs, or navigation parameters.
- Verification and reset links must open the app through supported deep-link behavior or a usable web fallback. Token handling must not expose tokens in analytics, logs, or persisted plain-text state.
- On launch/resume, confirm persisted session with the API before showing authenticated content. Sign-out and expiry clear local session state and authenticated navigation history.
- Read the API origin from `EXPO_PUBLIC_API_URL`; physical-device setup must not assume localhost points to the developer computer.
- Record deliberate iOS/Android differences in implementation notes.

The reference Expo client uses `@better-auth/expo` on both sides, the `projectstarter` app scheme, and `expo-secure-store` through Better Auth's storage adapter. The opaque session cookie is persisted in SecureStore; the API remains authoritative and confirms it before the authenticated screen appears. The native app calls `getSession` at launch, every five minutes while active, and after returning to the foreground. Temporary lookup failure keeps a previously confirmed screen visible with retry feedback; a confirmed missing session returns to sign-in. The server's seven-day expiry and one-day update age decide whether the database session is renewed.

The app handles `projectstarter://verify-email` and `projectstarter://reset-password`. Reset tokens are held only in component memory while the form is active, then cleared after completion. Email delivery remains generic. A development/production native build is required for the custom scheme; Expo Go does not register this scheme automatically. Production email links should use universal/app links and a web fallback when the fork configures its own domain and associated app identifiers.

For a simulator, `EXPO_PUBLIC_API_URL` can point to the host API origin. Android emulators typically use the emulator's host bridge address; physical devices need the development computer's reachable LAN address, firewall access, and a matching `BETTER_AUTH_URL`/trusted-origin setup. Use HTTPS for deployed environments. Never ship a localhost API origin in a device build.

## Content and account safety

- Use concise, neutral messages. Sign-in errors do not distinguish unknown email and wrong password.
- Registration, verification resend, and reset-request feedback do not confirm whether an address exists.
- Never include demo credentials, reusable passwords, tokens, or session details in screens, screenshots, logs, URLs, or committed fixtures.
- Email messages identify the action, use the configured application/API origin, explain expiry in plain language, and avoid unnecessary personal data.

## Design and acceptance review

Use [project design guidelines](../design-guidelines.md) for responsive behavior, interaction targets, contrast, keyboard, and native differences. Keep the result generic to the starter. Visual direction and tokens are documented separately by the web UI implementation.

- [ ] Registration, verification/resend, sign-in, forgot/reset, authenticated, expired-session, and signed-out-again states are present.
- [ ] API verification and reset tokens are one-time, expire, and cannot create an authenticated session before email verification.
- [ ] A valid active session is refreshed according to `expiresAt`/update-age policy; an expired/revoked session is not refreshed. Sign-out and password reset invalidate server sessions.
- [ ] Public feedback does not disclose account existence.
- [ ] Protected web content is rendered only after a server session check; API outages are not mistaken for anonymous sessions.
- [ ] Web flows work at 320 and 360–390 CSS pixels with keyboard access and no page-level horizontal overflow.
- [ ] Expo uses secure session persistence, reachable API configuration, usable keyboards/navigation, and safe email-link handling on iOS. Android native runtime review is optional for routine tasks; its export remains part of the build check.
- [ ] Sign-out invalidates the server session and clears local/protected navigation state.
- [ ] No social sign-in, MFA, role/organization, or account-deletion UI is implied.

## Technical references

- [Better Auth session management](https://better-auth.com/docs/concepts/session-management) — database session expiry, `expiresIn`/`updateAge`, and the separate cookie-cache trade-off.
- [Better Auth client session options](https://better-auth.com/docs/concepts/client) — periodic and focus-based session revalidation.
- [Better Auth email/password](https://better-auth.com/docs/authentication/email-password) — email verification, password reset, and revoking sessions after a reset.
