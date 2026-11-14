import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SessionArea } from "@/components/auth/session-area";
import { getServerSession } from "@/lib/auth-server";

export default async function ProtectedPage() {
  const result = await getServerSession();
  if (result.kind === "anonymous") redirect("/sign-in?next=%2Fapp");
  if (result.kind === "unavailable") {
    return (
      <AuthShell>
        <h2>Session check unavailable</h2>
        <p className="auth-description">
          The API did not confirm your session. Retry the check before continuing.
        </p>
        <p className="auth-switch">
          <Link href="/app">Retry session check</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <SessionArea
        initialName={result.session.user.name}
        initialEmail={result.session.user.email}
      />
    </AuthShell>
  );
}
