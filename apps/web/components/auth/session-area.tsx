"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SessionArea({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const { data, isPending, error } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    if (!isPending && !error && data === null) {
      router.replace("/sign-in?reason=expired");
    }
  }, [data, error, isPending, router]);

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("request failed");
      router.replace("/sign-in?reason=signed-out");
      router.refresh();
    } catch {
      setSignOutError("The session could not be ended. Check the API and retry.");
      setSigningOut(false);
    }
  }

  const name = data?.user?.name ?? initialName;
  const email = data?.user?.email ?? initialEmail;

  return (
    <div className="auth-session">
      <div className="auth-session-icon" aria-hidden="true">
        <RefreshCw />
      </div>
      <h2>You’re signed in.</h2>
      <p className="auth-description">
        This protected screen was rendered after the API validated your database session.
      </p>
      <dl className="auth-session-details">
        <div>
          <dt>Name</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>Session</dt>
          <dd>Rolling · checked with the API</dd>
        </div>
      </dl>
      {isPending ? (
        <p className="auth-session-check" role="status">
          <LoaderCircle className="auth-spinner" aria-hidden="true" /> Checking current session…
        </p>
      ) : null}
      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          Session refresh is unavailable. Your current protected view stays visible while you retry.
        </p>
      ) : null}
      {signOutError ? (
        <p className="auth-message auth-message-error" role="alert">
          {signOutError}
        </p>
      ) : null}
      <Button type="button" className="auth-submit" onClick={signOut} disabled={signingOut}>
        {signingOut ? (
          <LoaderCircle className="auth-spinner" aria-hidden="true" />
        ) : (
          <LogOut aria-hidden="true" />
        )}
        {signingOut ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
