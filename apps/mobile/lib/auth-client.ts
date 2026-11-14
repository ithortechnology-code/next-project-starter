import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const apiBaseUrl = configuredApiUrl || "http://localhost:4000";

export const authClient = createAuthClient({
  baseURL: `${apiBaseUrl.replace(/\/$/, "")}/api/auth`,
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

export const authApiBaseUrl = apiBaseUrl.replace(/\/$/, "");
