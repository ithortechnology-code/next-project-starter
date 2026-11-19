"use client";

import { useEffect } from "react";
import { webTelemetry } from "../lib/client-telemetry";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    webTelemetry.report({ event: "render_error" });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-5 px-6 py-12 text-foreground">
      <h1 className="text-2xl font-semibold">This page couldn’t load</h1>
      <button
        type="button"
        onClick={reset}
        className="min-h-12 rounded-md bg-primary px-5 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Try again
      </button>
    </main>
  );
}
