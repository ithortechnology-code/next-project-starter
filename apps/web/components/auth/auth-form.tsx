"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authEmailSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@starter/shared";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type AuthFormMode =
  "sign-up" | "sign-in" | "forgot-password" | "resend-verification" | "reset-password";
type FieldErrors = Record<string, string>;

interface AuthFormProps {
  mode: AuthFormMode;
  nextPath?: string;
  resetToken?: string;
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span className="auth-field-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string | undefined;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field id={id} label={label} error={error}>
      <span className="auth-password-wrap">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          minLength={8}
          maxLength={128}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="auth-password-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </span>
    </Field>
  );
}

function friendlyError(status: number | undefined, fallback: string) {
  if (status === 403) {
    return "If this account needs email verification, request a fresh message. Otherwise, check your email and password.";
  }
  if (status === 429) return "Too many attempts. Wait a little, then try again.";
  return fallback;
}

export function AuthForm({ mode, nextPath = "/app", resetToken = "" }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [offerResend, setOfferResend] = useState(false);

  const isNewPassword = mode === "sign-up" || mode === "reset-password";
  const title = {
    "sign-up": "Create your account",
    "sign-in": "Welcome back",
    "forgot-password": "Reset your password",
    "resend-verification": "Resend verification email",
    "reset-password": "Choose a new password",
  }[mode];
  const description = {
    "sign-up": "Enter your details below, then verify your email to activate your account.",
    "sign-in": "Sign in with the email and password you used to create your account.",
    "forgot-password":
      "Enter your email and we’ll send a reset link if an account can receive one.",
    "resend-verification": "If your address needs verification, we’ll send a fresh link shortly.",
    "reset-password": "Use a new password you have not used for this account before.",
  }[mode];
  const submitLabel = {
    "sign-up": "Create account",
    "sign-in": "Sign in",
    "forgot-password": "Send reset link",
    "resend-verification": "Send verification link",
    "reset-password": "Save new password",
  }[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setFieldErrors({});
    setOfferResend(false);

    if (mode === "sign-up") {
      const parsed = signUpSchema.safeParse({ name, email, password, confirmPassword });
      if (!parsed.success) {
        setFieldErrors(
          Object.fromEntries(
            parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
          ),
        );
        return;
      }
    } else if (mode === "sign-in") {
      const parsed = signInSchema.safeParse({ email, password });
      if (!parsed.success) {
        setFieldErrors(
          Object.fromEntries(
            parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
          ),
        );
        return;
      }
    } else if (mode === "reset-password") {
      const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
      if (!parsed.success) {
        setFieldErrors(
          Object.fromEntries(
            parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
          ),
        );
        return;
      }
      if (!resetToken) {
        setError("This reset link is missing or expired. Request a new link to continue.");
        return;
      }
    } else {
      const parsed = authEmailSchema.safeParse(email);
      if (!parsed.success) {
        setFieldErrors({ email: "Enter a valid email address." });
        return;
      }
    }

    setPending(true);
    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          callbackURL: `${window.location.origin}/verify-email?verified=1`,
        });
        if (result.error) {
          setError(
            friendlyError(
              result.error.status,
              "We couldn’t start sign-up. Check your details and try again.",
            ),
          );
          return;
        }
        router.push("/verify-email?sent=1");
      } else if (mode === "sign-in") {
        const result = await authClient.signIn.email({ email: email.trim(), password });
        if (result.error) {
          setError(
            friendlyError(
              result.error.status,
              "We couldn’t sign you in with those details. Check them or reset your password.",
            ),
          );
          setOfferResend(result.error.status === 403);
          return;
        }
        router.replace(nextPath);
        router.refresh();
      } else if (mode === "forgot-password") {
        const result = await authClient.requestPasswordReset({
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) {
          setError("We couldn’t process that request right now. Check the service and try again.");
          return;
        }
        setNotice("If this address can receive a reset link, it should arrive shortly.");
      } else if (mode === "resend-verification") {
        const result = await authClient.sendVerificationEmail({
          email: email.trim(),
          callbackURL: `${window.location.origin}/verify-email?verified=1`,
        });
        if (result.error) {
          setError("We couldn’t process that request right now. Check the service and try again.");
          return;
        }
        setNotice("If this address needs verification, a message should arrive shortly.");
      } else {
        const result = await authClient.resetPassword({ newPassword: password, token: resetToken });
        if (result.error) {
          setError(
            "This reset link is invalid or expired. Request a new password reset link to continue.",
          );
          return;
        }
        router.replace("/sign-in?reason=password-reset");
      }
    } catch {
      setError("The auth service is unavailable. Check the API and email service, then try again.");
    } finally {
      setPending(false);
    }
  }

  async function resendFromSignIn() {
    setError("");
    setNotice("");
    const parsed = authEmailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldErrors({ email: "Enter a valid email address first." });
      return;
    }
    setPending(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: `${window.location.origin}/verify-email?verified=1`,
      });
      if (result.error) throw new Error("request failed");
      setNotice("If this address needs verification, a message should arrive shortly.");
    } catch {
      setError(
        "We couldn’t send the request right now. Check the API and email service, then retry.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-form-wrap">
      <h2>{title}</h2>
      <p className="auth-description">{description}</p>
      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="auth-message auth-message-success" role="status">
          {notice}
        </p>
      ) : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        {mode === "sign-up" ? (
          <Field id="name" label="Name" error={fieldErrors.name}>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={255}
              required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
            />
          </Field>
        ) : null}

        {mode !== "reset-password" ? (
          <Field id="email" label="Email" error={fieldErrors.email}>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={320}
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
          </Field>
        ) : null}

        {mode === "sign-in" || mode === "sign-up" || mode === "reset-password" ? (
          <>
            <PasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              error={fieldErrors.password}
            />
            {mode === "sign-in" ? (
              <p className="auth-forgot-link">
                <Link href="/forgot-password">Forgot password?</Link>
              </p>
            ) : null}
            {isNewPassword ? (
              <p className="auth-hint">Use at least 8 characters, up to 128.</p>
            ) : null}
            {isNewPassword ? (
              <PasswordInput
                id="confirmPassword"
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                error={fieldErrors.confirmPassword}
              />
            ) : null}
          </>
        ) : null}

        <Button type="submit" className="auth-submit" disabled={pending}>
          {pending ? <LoaderCircle className="auth-spinner" aria-hidden="true" /> : null}
          {pending ? "Please wait…" : submitLabel}
        </Button>
      </form>

      {offerResend && mode === "sign-in" ? (
        <button
          type="button"
          className="auth-inline-action"
          disabled={pending}
          onClick={resendFromSignIn}
        >
          Resend verification email
        </button>
      ) : null}

      <p className="auth-switch">
        {mode === "sign-up" ? (
          <>
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </>
        ) : null}
        {mode === "sign-in" ? (
          <>
            New here? <Link href="/sign-up">Create an account</Link>
          </>
        ) : null}
        {mode === "forgot-password" || mode === "resend-verification" ? (
          <>
            Remember your password? <Link href="/sign-in">Sign in</Link>
          </>
        ) : null}
        {mode === "reset-password" ? (
          <>
            Need another link? <Link href="/forgot-password">Request a reset</Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
