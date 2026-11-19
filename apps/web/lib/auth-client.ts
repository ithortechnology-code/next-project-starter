import { createAuthClient } from "better-auth/react";
import { webTelemetry } from "./client-telemetry";

export const authClient = createAuthClient({
  fetchOptions: { customFetchImpl: webTelemetry.trackedFetch },
  sessionOptions: {
    refetchInterval: 5 * 60,
    refetchOnWindowFocus: true,
    refetchWhenOffline: false,
  },
});
