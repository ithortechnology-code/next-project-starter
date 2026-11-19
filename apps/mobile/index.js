import { registerRootComponent } from "expo";
import { createElement, useEffect } from "react";
import App from "./App";
import { mobileTelemetry } from "./lib/client-telemetry";

const errorUtils = globalThis.ErrorUtils;
if (errorUtils) {
  const handleError = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    try {
      mobileTelemetry.report({ event: "js_error" });
    } finally {
      handleError(error, isFatal);
    }
  });
}

let started = false;
function Root() {
  useEffect(() => {
    if (!started) {
      started = true;
      mobileTelemetry.report({ event: "session_started" });
    }
  }, []);
  return createElement(App);
}

registerRootComponent(Root);
