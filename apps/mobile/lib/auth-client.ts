import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

import { apiBaseUrl, mobileTelemetry } from "./client-telemetry";

export const authClient = createAuthClient({
  baseURL: `${apiBaseUrl}/api/auth`,
  fetchOptions: { customFetchImpl: mobileTelemetry.trackedFetch },
  plugins: [
    expoClient({
      scheme: "projectstarter",
      storagePrefix: "projectstarter",
      storage: SecureStore,
    }),
  ],
  sessionOptions: {
    refetchInterval: 5 * 60,
    refetchOnWindowFocus: true,
    refetchWhenOffline: false,
  },
});

export const authApiBaseUrl = apiBaseUrl;
