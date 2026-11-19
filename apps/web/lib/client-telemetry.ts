import { CLIENT_TELEMETRY_PATH, createClientTelemetry } from "@starter/shared/client-telemetry";

export const webTelemetry = createClientTelemetry(CLIENT_TELEMETRY_PATH, "web");
