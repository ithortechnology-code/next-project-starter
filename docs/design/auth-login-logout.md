# Cross-platform sign-in and sign-out design

## Purpose and scope

This specification defines the behavior of the starter's email/password sign-in example in the web and Expo apps. Both clients use the same API and support session persistence, a server-validated signed-in view, and sign-out.

There is no public registration or account lifecycle UI. Account provisioning is a local/test operation described in the implementation and local development documentation. Do not imply that a visitor can create an account, reset a password, verify an email, or use a social provider.

The two apps share behavior and API expectations, not presentation components. Use each app's platform conventions. This document sets no new palette, spacing, typography, or shared UI tokens; visual decisions for the demo screens and any reusable tokens belong to UI implementation, using the project design guidelines and the existing app context.

## Shared behavior contract

The flow has these states:

| State | Entry condition | Required behavior |
| --- | --- | --- |
| Checking session | App/page starts, reloads, or returns to the foreground when a refresh is due | Ask the API for the current session. Do not show protected identity or actions until the response is known. Keep the loading state brief and identifiable to assistive technology. |
| Signed out | The API confirms there is no valid session | Show the sign-in form. Do not show a registration or account recovery action. |
| Submitting | A valid form is being sent | Prevent duplicate submissions, keep the current screen stable, and expose progress. Do not log or persist the password in client storage. |
| Invalid credentials | The API rejects the supplied email/password | Show a concise, non-enumerating message that does not reveal whether the email exists. Keep the email available for correction; allow another attempt. |
| API unavailable | The request cannot reach the API or returns an unexpected service failure | Explain that sign-in could not be completed and offer a retry. Keep entered email; do not claim the user is signed in. |
| Authenticated | The API returns a valid session and public user identity | Show the authenticated view only after server confirmation. Display a safe identity field such as the account email and provide sign-out. |
| Session expired | A later session check or protected request says the session is no longer valid | Clear stale client session state, return to sign-in, and explain that the session ended. Preserve only a safe in-app return destination when applicable. |
| Signing out | The user starts sign-out | Disable repeated activation and show progress. Treat sign-out as complete only after the server confirms invalidation; then clear client session state. |
| Signed out again | Server invalidation succeeds | Return to the signed-out state. A browser refresh, app resume, or back navigation must not restore the old authenticated view. |

Use the API response, not locally cached flags, to decide whether a session is valid. Never put passwords, session tokens, or cookies in URLs, logs, analytics, or error text. Do not expose whether an account exists through sign-in feedback.

## Web behavior

### Routes and navigation

- Provide a sign-in route and a distinct authenticated route or view. The authenticated view must request the current session from the API before rendering protected content.
- A direct visit or reload of the authenticated route rechecks the session. If the API confirms the visitor is signed out, send them to sign-in.
- If an unauthenticated visitor was sent from an internal protected route, return them there after successful sign-in. Accept only a same-origin relative destination; ignore external or malformed destinations.
- Browser Back, Forward, refresh, and opening a route in a new tab must not bypass the session check.
- After successful sign-out, navigate to the signed-out experience and replace the authenticated history entry where practical, so Back does not flash stale protected content.

### Narrow-to-wide layout

- At 320 CSS pixels, show a single readable column with the page purpose, email field, password field, primary sign-in action, and any feedback in that order. The form must fit without page-level horizontal scrolling.
- At 360–390 CSS pixels, retain the same content order and comfortable field/action sizing. Do not rely on shrinking text or controls to fit.
- At medium and wide widths, constrain the form to a readable maximum width and use surrounding space to improve alignment or hierarchy. A second column is not required for this task.
- Use content-driven breakpoints. Describe any breakpoint that changes the layout when the implementation is ready; do not add a breakpoint solely for a named device.
- Long error messages, zoom, text resizing, and browser chrome changes must not hide the form or its primary action. Do not force the page into a fixed viewport height.

### Keyboard and browser interaction

- Use visible labels, appropriate email/password input semantics, browser autofill hints, and a logical tab order. Focus indicators must remain visible.
- Enter submits from the password field. Validation and service feedback are announced and associated with the relevant form controls; focus moves only when it helps recovery.
- On mobile browsers, when the virtual keyboard is open, the focused field, its feedback, and the next relevant action can be scrolled into view. Do not use fixed positioning or scroll locking that traps the form.
- Support browser zoom and navigation. Never disable zoom to preserve a layout.

## Expo behavior

- On launch or resume, check the session before presenting the authenticated view. Keep loading and signed-out states distinct.
- Show the same email/password task and recovery feedback as web while using native text inputs, keyboard return behavior, touch targets, accessibility announcements, and app safe areas.
- The email field advances focus to the password field; the password field's submit action starts sign-in. Keep the focused input and relevant action reachable while the keyboard is open, including on shorter screens.
- Use the supported Better Auth Expo integration and secure storage for session persistence. Do not copy tokens into general preferences, logs, or app navigation parameters.
- After successful sign-in, move into the authenticated app state. After sign-out or session expiry, clear the prior authenticated navigation history so Back cannot reopen it.
- Read the API origin from `EXPO_PUBLIC_API_URL`. Simulator and physical-device setup must use an address reachable from that device; do not assume `localhost` works on a physical device.
- Account for iOS and Android differences in autofill, keyboard dismissal, safe areas, and navigation. Record a deliberate platform exception in implementation notes rather than forcing identical behavior.

## Accessibility and content

- Every field has a persistent visible label. Required, invalid, disabled, submitting, and authenticated states are conveyed with text and semantics, not color alone.
- Announce sign-in progress and result without repeatedly interrupting typing. Associate field errors with their inputs and expose service-level errors as an alert or status message appropriate to their urgency.
- Keep all actions reachable by keyboard on web and by screen reader/touch on native. Use native button and text-input semantics rather than clickable containers.
- Use concise, neutral feedback. Invalid credentials should not distinguish an unknown email from a wrong password. API failures should describe the next useful action, such as retrying or checking local services.
- Do not include a demo password, shared account credential, or sensitive session detail in the screen or screenshots.

## Design and acceptance review

Use [the project design guidelines](../design-guidelines.md) for responsive behavior, interaction targets, contrast, keyboard, and native differences. During implementation, use the existing app styles as the starting context, then design the auth example's visual treatment and any reusable tokens deliberately. Keep the result generic to the starter and avoid product-specific account behavior.

Review these cases before accepting either screen:

- [ ] Signed-out, submitting, invalid-credential, API-unavailable, authenticated, session-expired, and signed-out-again states are present.
- [ ] The protected view is shown only after an API session check; direct route entry and reload repeat that check.
- [ ] Web is usable at 320 and 360–390 CSS pixels, with keyboard access and no document-level horizontal overflow.
- [ ] Web feedback remains readable under zoom, text resizing, long messages, and mobile keyboard use.
- [ ] Expo uses secure session persistence, reachable API configuration, and usable keyboard/navigation behavior on iOS and Android.
- [ ] Sign-out invalidates the server session, clears local state, and prevents stale authenticated navigation from returning.
- [ ] No public registration, password recovery, verification, or social sign-in is implied.
