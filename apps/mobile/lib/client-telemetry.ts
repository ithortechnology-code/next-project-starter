import { CLIENT_TELEMETRY_PATH, createClientTelemetry } from "@starter/shared/client-telemetry";

export const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || "http://localhost:4000"
).replace(/\/$/, "");

export const mobileTelemetry = createClientTelemetry(apiBaseUrl + CLIENT_TELEMETRY_PATH, "expo");
