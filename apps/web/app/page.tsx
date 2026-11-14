import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { getServerSession } from "@/lib/auth-server";

export default async function HomePage() {
  const result = await getServerSession();
  if (result.kind === "authenticated") redirect("/app");
  if (result.kind === "anonymous") redirect("/sign-in");

  return (
    <AuthShell>
      <h2>We couldn’t check your session</h2>
      <p className="auth-description">
        The API is unavailable. Start the API and local services, then retry.
      </p>
      <p className="auth-switch">
        <Link href="/">Retry session check</Link>
      </p>
    </AuthShell>
  );
}
