import { healthResponseSchema } from "@starter/shared";

async function getHealth() {
  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  try {
    const response = await fetch(`${apiUrl}/health`, { cache: "no-store" });
    if (!response.ok) return { error: `API returned HTTP ${response.status}` };
    return { health: healthResponseSchema.parse(await response.json()) };
  } catch {
    return { error: "API unavailable. Start the API and local services, then refresh." };
  }
}

export default async function HomePage() {
  const result = await getHealth();
  return (
    <main style={{ maxWidth: 760, margin: "12vh auto", padding: 32 }}>
      <p style={{ color: "#3563e9", fontWeight: 700 }}>PROJECT STARTER</p>
      <h1 style={{ fontSize: 48, marginBottom: 12 }}>A solid place to start.</h1>
      <p style={{ color: "#526079", fontSize: 18 }}>
        Web, API, mobile, and PostgreSQL in one workspace.
      </p>
      <section
        style={{ background: "white", borderRadius: 16, padding: 24, marginTop: 36 }}
        aria-live="polite"
      >
        <h2>Local services</h2>
        {result.health ? (
          <p>API: online · Database: {result.health.database}</p>
        ) : (
          <p>{result.error}</p>
        )}
      </section>
    </main>
  );
}
