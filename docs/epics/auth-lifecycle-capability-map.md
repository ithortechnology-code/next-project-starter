# Capability Map: Cross-Platform Email/Password Auth

This map updates the existing sign-in/sign-out example to cover the complete email/password account lifecycle. The repository remains a generic template; the example does not add product-specific account features.

| Module              | Responsibility                                                                                                                                                                                                    | Depends on                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `email-delivery`    | Send verification and password-reset messages through the existing local SMTP setup, with generic templates and safe link handling.                                                                               | —                                   |
| `auth-api`          | Public email/password registration, verification, sign-in, database-backed session lookup and rolling renewal, sign-out, password-reset request and completion, origin/cookie rules, and local/test provisioning. | `email-delivery`                    |
| `web-auth`          | Responsive browser flows for registration, sign-in, verification status, forgot/reset password, authenticated state, and sign-out.                                                                                | `auth-api`                          |
| `expo-auth`         | Native equivalents using secure session storage, deep links, and platform keyboard/navigation behavior.                                                                                                           | `auth-api`                          |
| `auth-setup-recipe` | Selectable scaffold of API, email, web, Expo, dependencies, migrations, and tests, preserving the no-auth starter path.                                                                                           | `auth-api`, `web-auth`, `expo-auth` |

## Build order

`email-delivery` → `auth-api` → `web-auth` and `expo-auth` → `auth-setup-recipe`.

Tests and contributor documentation are updated with each module. Social sign-in, MFA, organizations, roles, and account deletion remain outside this map unless requested.
