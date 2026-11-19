import { webTelemetry } from "./lib/client-telemetry";

window.addEventListener("error", (event) => {
  if (event instanceof ErrorEvent) webTelemetry.report({ event: "js_error" });
});
window.addEventListener("unhandledrejection", () => {
  webTelemetry.report({ event: "unhandled_rejection" });
});

const sessionKey = "starter.telemetry.started";
try {
  if (!sessionStorage.getItem(sessionKey)) {
    sessionStorage.setItem(sessionKey, "1");
    webTelemetry.report({ event: "session_started" });
  }
} catch {
  webTelemetry.report({ event: "session_started" });
}
