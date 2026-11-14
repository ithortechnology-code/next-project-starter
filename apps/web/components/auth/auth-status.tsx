"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MailWarning } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";

export function VerificationStatus({
  sent,
  verified,
  error,
}: {
  sent?: string | undefined;
  verified?: string | undefined;
  error?: string | undefined;
}) {
  const expired = error?.toLowerCase().includes("expired");
  return (
    <div>
      <div className="auth-status-mark" aria-hidden="true">
        {verified ? <CheckCircle2 /> : <MailWarning />}
      </div>
      <h2>
        {verified
          ? "Email verified"
          : error
            ? "Verification link unavailable"
            : sent
              ? "Check your email"
              : "Verify your email"}
      </h2>
      <p className="auth-description">
        {verified
          ? "Your verification link has been processed. You can sign in to continue."
          : error
            ? expired
              ? "This verification link has expired. Request a fresh link to continue."
              : "This verification link is invalid. Request a fresh link to continue."
            : sent
              ? "If this address can be registered, a verification message should arrive shortly. Follow its link before signing in."
              : "Open the link in your verification email to finish setting up your account. You can request another message below."}
      </p>
      {!verified ? <AuthForm mode="resend-verification" /> : null}
      <p className="auth-switch">
        <a href="/sign-in">Continue to sign in</a>
      </p>
    </div>
  );
}

export function ResetPasswordForm({
  token,
  error,
}: {
  token?: string | undefined;
  error?: string | undefined;
}) {
  const [resetToken, setResetToken] = useState(token ?? "");
  const [invalid, setInvalid] = useState(Boolean(error));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkToken = params.get("token") ?? "";
    setResetToken(linkToken);
    setInvalid(params.has("error") || !linkToken);
    if (params.has("token") || params.has("error")) {
      window.history.replaceState(null, "", "/reset-password");
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <p className="auth-description" role="status">
        Checking reset link…
      </p>
    );
  }

  if (invalid || !resetToken) {
    return (
      <>
        <h2>Reset link unavailable</h2>
        <p className="auth-description">
          This reset link is invalid or expired. Request a new one to continue.
        </p>
        <p className="auth-switch">
          <a href="/forgot-password">Request a reset link</a>
        </p>
      </>
    );
  }

  return <AuthForm mode="reset-password" resetToken={resetToken} />;
}

export function SignedOutNotice({ reason }: { reason?: string | undefined }) {
  if (reason === "password-reset") {
    return (
      <p className="auth-message auth-message-success" role="status">
        Your password was updated and existing sessions were revoked. Sign in with your new
        password.
      </p>
    );
  }
  if (reason === "signed-out") {
    return (
      <p className="auth-message auth-message-success" role="status">
        You’re signed out.
      </p>
    );
  }
  return null;
}
