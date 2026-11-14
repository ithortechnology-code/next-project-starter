import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignedOutNotice } from "@/components/auth/auth-status";
import { safeReturnPath } from "@/lib/auth-server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;

  return (
    <AuthShell>
      <SignedOutNotice reason={reason} />
      {reason === "expired" ? (
        <p className="auth-message" role="status">
          Your session expired. Sign in to continue.
        </p>
      ) : null}
      <AuthForm mode="sign-in" nextPath={safeReturnPath(params.next)} />
    </AuthShell>
  );
}
