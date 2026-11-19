import type { createAuth } from "./auth.js";

const sessionRequired = new Set([
  "/account-info",
  "/change-email",
  "/change-password",
  "/delete-user",
  "/delete-user/callback",
  "/get-access-token",
  "/link-social",
  "/list-accounts",
  "/list-sessions",
  "/refresh-token",
  "/revoke-other-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/unlink-account",
  "/update-session",
  "/update-user",
  "/verify-password",
]);

const redirects = new Set([
  "/callback/{id}",
  "/delete-user/callback",
  "/error",
  "/expo-authorization-proxy",
  "/reset-password/{token}",
  "/verify-email",
]);

const redirectOnly = new Set([
  "/callback/{id}",
  "/expo-authorization-proxy",
  "/reset-password/{token}",
]);

export async function generateAuthOpenApi(auth: ReturnType<typeof createAuth>) {
  const [{ paths, components }, context] = await Promise.all([
    auth.api.generateOpenAPISchema(),
    auth.$context,
  ]);
  const endpoints = new Map(
    Object.values(auth.api).flatMap((endpoint) =>
      "path" in endpoint && endpoint.path
        ? [[endpoint.path.replace(/:([^/]+)/g, "{$1}"), endpoint.options] as const]
        : [],
    ),
  );
  const basePath = auth.options.basePath ?? "/api/auth";
  return {
    paths: Object.fromEntries(
      Object.entries(paths).map(([path, methods]) => [
        basePath + path,
        Object.fromEntries(
          Object.entries(methods).map(([method, operation]) => {
            const options = endpoints.get(path);
            const body = options && "body" in options ? options.body : undefined;
            const requestBody =
              body && operation.requestBody
                ? { ...operation.requestBody, required: !body.safeParse(undefined).success }
                : undefined;
            const responses = { ...operation.responses };
            const featureDisabled =
              (path.startsWith("/delete-user") && !context.options.user?.deleteUser?.enabled) ||
              (path === "/change-email" && !context.options.user?.changeEmail?.enabled);
            if (redirects.has(path) && !featureDisabled) {
              responses["302"] = {
                description: "Redirect to the next step in the authentication flow",
                headers: { Location: { schema: { type: "string" } } },
              };
            }
            if (redirectOnly.has(path) || featureDisabled) delete responses["200"];
            if (path === "/get-session" && method === "post") {
              delete responses["200"];
              responses["405"] = { description: "POST requires deferred session refresh" };
            }
            if (method === "post") {
              responses["415"] ??= { description: "Unsupported request media type" };
            }
            const parameters = operation.parameters?.map((parameter: { name: string }) =>
              (path === "/expo-authorization-proxy" && parameter.name === "authorizationURL") ||
              (path === "/delete-user/callback" && parameter.name === "token")
                ? { ...parameter, required: true }
                : parameter,
            );
            if (path === "/account-info") {
              parameters?.push(
                { name: "accountId", in: "query", schema: { type: "string" } },
                { name: "useAccountCookie", in: "query", schema: { type: "boolean", const: true } },
                { name: "userId", in: "query", schema: { type: "string" } },
              );
            }
            if (path === "/error") {
              parameters?.push(
                { name: "error", in: "query", schema: { type: "string" } },
                { name: "error_description", in: "query", schema: { type: "string" } },
              );
            }
            return [
              method,
              {
                ...operation,
                description: featureDisabled
                  ? "This operation is disabled by the current authentication configuration."
                  : operation.description,
                requestBody,
                tags: path.startsWith("/expo-") ? ["Expo authentication"] : ["Authentication"],
                security: sessionRequired.has(path)
                  ? [{ authSession: [] }]
                  : path === "/get-session" || path === "/sign-out"
                    ? [{ authSession: [] }, {}]
                    : [],
                parameters,
                responses,
              },
            ];
          }),
        ),
      ]),
    ),
    components: {
      schemas: components.schemas,
      securitySchemes: {
        authSession: {
          type: "apiKey" as const,
          in: "cookie" as const,
          name: context.authCookies.sessionToken.name,
          description: "Sign in on the API origin to establish a browser session cookie.",
        },
      },
    },
  };
}
