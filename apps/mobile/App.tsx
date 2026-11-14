import "./global.css";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";
import { authEmailSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@starter/shared";
import { AuthField } from "./components/auth-field";
import { AuthButton } from "./components/auth-button";
import { authClient } from "./lib/auth-client";

type Mode = "sign-in" | "sign-up" | "forgot" | "resend" | "reset" | "verification";
type Session = NonNullable<Awaited<ReturnType<typeof authClient.getSession>>["data"]>;

const colors = {
  ink: "#182b4d",
  muted: "#63728a",
  blue: "#245de8",
  border: "#d7dfeb",
  surface: "#ffffff",
  background: "#f2f5fa",
  success: "#176b49",
  danger: "#a83b42",
};

export default function App() {
  const scheme = useColorScheme();
  const palette =
    scheme === "dark"
      ? {
          ...colors,
          ink: "#edf2fb",
          muted: "#b2bfd2",
          blue: "#86a9ff",
          border: "#38465d",
          surface: "#192438",
          background: "#0f1725",
        }
      : colors;
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [signedOutNotice, setSignedOutNotice] = useState("");
  const [refreshError, setRefreshError] = useState(false);
  const checkedAt = useRef(0);

  const refreshSession = useCallback(async (initial = false) => {
    if (initial) setChecking(true);
    try {
      const result = await authClient.getSession({ fetchOptions: { cache: "no-store" } });
      if (result.error) throw new Error("session unavailable");
      setSession((result.data as Session | null) ?? null);
      setRefreshError(false);
      checkedAt.current = Date.now();
    } catch {
      setRefreshError(true);
    } finally {
      if (initial) setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession(true);
    const timer = setInterval(
      () => {
        if (AppState.currentState === "active") void refreshSession();
      },
      5 * 60 * 1000,
    );
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && Date.now() - checkedAt.current > 15_000) {
        void refreshSession();
      }
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refreshSession]);

  const handleAuthLink = useCallback(
    (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const path = (parsed.path?.replace(/^\//, "") || parsed.hostname || "").replace(/^\//, "");
      if (path === "reset-password") {
        const token = parsed.queryParams?.token;
        setResetToken(typeof token === "string" ? token : "");
        setPassword("");
        setConfirmPassword("");
        setFieldErrors({});
        setMode("reset");
        setError(
          typeof parsed.queryParams?.error === "string"
            ? "This reset link is invalid or expired. Request a new one."
            : "",
        );
        setNotice("");
      } else if (path === "verify-email") {
        setPassword("");
        setConfirmPassword("");
        setResetToken("");
        setFieldErrors({});
        setMode("verification");
        setNotice(
          typeof parsed.queryParams?.verified === "string"
            ? "Your email is verified. You can now sign in."
            : "Open the link from your verification email to finish this step.",
        );
        setError("");
        void refreshSession();
      }
    },
    [refreshSession],
  );

  useEffect(() => {
    void Linking.getInitialURL().then(handleAuthLink);
    const subscription = Linking.addEventListener("url", ({ url }) => handleAuthLink(url));
    return () => subscription.remove();
  }, [handleAuthLink]);

  function moveTo(next: Mode) {
    setMode(next);
    setPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
    setFieldErrors({});
  }

  async function submit() {
    setError("");
    setNotice("");
    setFieldErrors({});
    let parsed:
      | { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }
      | undefined;
    if (mode === "sign-up")
      parsed = signUpSchema.safeParse({ name, email, password, confirmPassword });
    if (mode === "sign-in") parsed = signInSchema.safeParse({ email, password });
    if (mode === "reset") parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (mode === "forgot" || mode === "resend") {
      const result = authEmailSchema.safeParse(email);
      if (!result.success) setFieldErrors({ email: "Enter a valid email address." });
      parsed = result;
    }
    if (parsed && !parsed.success) {
      setFieldErrors(
        Object.fromEntries(
          (parsed.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    if (mode === "reset" && !resetToken) {
      setError("This reset link is missing or expired. Request a new link to continue.");
      return;
    }

    setPending(true);
    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          callbackURL: "projectstarter://verify-email?verified=1",
        });
        if (result.error) throw new Error("Sign-up failed");
        const submittedEmail = email.trim();
        moveTo("verification");
        setEmail(submittedEmail);
        setNotice(
          "If this address can receive a verification link, a message should arrive shortly.",
        );
      } else if (mode === "sign-in") {
        const result = await authClient.signIn.email({ email: email.trim(), password });
        if (result.error) {
          setError(
            result.error.status === 403
              ? "Verify your email before signing in, or request a new verification link."
              : "We couldn’t sign you in with those details. Check them or reset your password.",
          );
          return;
        }
        await refreshSession(true);
      } else if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email: email.trim(),
          redirectTo: "projectstarter://reset-password",
        });
        if (result.error) throw new Error("Reset request failed");
        setNotice("If this address can receive a reset link, it should arrive shortly.");
      } else if (mode === "resend") {
        const result = await authClient.sendVerificationEmail({
          email: email.trim(),
          callbackURL: "projectstarter://verify-email?verified=1",
        });
        if (result.error) throw new Error("Verification request failed");
        setNotice("If this address needs verification, a message should arrive shortly.");
      } else if (mode === "reset") {
        const result = await authClient.resetPassword({ newPassword: password, token: resetToken });
        if (result.error) {
          setError(
            "This reset link is invalid or expired. Request a new password reset link to continue.",
          );
          return;
        }
        await authClient.signOut();
        setResetToken("");
        setSession(null);
        moveTo("sign-in");
        setNotice("Your password has been updated. Sign in with your new password.");
      }
    } catch {
      setError("The auth service is unavailable. Check the API and email service, then try again.");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign-out failed");
      setSession(null);
      setSignedOutNotice("You have signed out.");
      moveTo("sign-in");
    } catch {
      setError("We couldn’t end this session. Check the API and try again.");
    } finally {
      setPending(false);
    }
  }

  if (checking) {
    return (
      <StatusScreen title="Checking your session" message="Confirming your account with the API." />
    );
  }

  if (session) {
    return (
      <Shell palette={palette}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ACCOUNT</Text>
        </View>
        <Text style={[styles.title, { color: palette.ink }]}>You’re signed in.</Text>
        <Text style={[styles.description, { color: palette.muted }]}>
          Your session is checked with the API and renews while it remains valid.
        </Text>
        <View
          style={[
            styles.identity,
            { backgroundColor: scheme === "dark" ? "#222f43" : colors.background },
          ]}
        >
          <Text style={[styles.label, { color: palette.muted }]}>Name</Text>
          <Text style={[styles.identityValue, { color: palette.ink }]}>{session.user.name}</Text>
          <Text style={[styles.label, { color: palette.muted }]}>Email</Text>
          <Text style={[styles.identityValue, { color: palette.ink }]}>{session.user.email}</Text>
          <Text style={[styles.label, { color: palette.muted }]}>Session</Text>
          <Text style={[styles.identityValue, { color: palette.ink }]}>
            Rolling · checked with the API
          </Text>
        </View>
        {refreshError ? (
          <Feedback kind="error">
            Session refresh is unavailable. Your current screen stays open; retry when the API is
            reachable.
          </Feedback>
        ) : null}
        <AuthButton
          label={pending ? "Signing out…" : "Sign out"}
          disabled={pending}
          onPress={signOut}
          secondary
        />
      </Shell>
    );
  }

  const title: Record<Mode, string> = {
    "sign-in": "Sign in to continue",
    "sign-up": "Create your account",
    forgot: "Reset your password",
    resend: "Resend verification",
    reset: "Choose a new password",
    verification: "Check your email",
  };
  const description: Record<Mode, string> = {
    "sign-in": "Access your account with your email and password.",
    "sign-up": "Use an email address you can verify.",
    forgot: "We’ll send a password reset link if the address is eligible.",
    resend: "We’ll send a verification link if one is needed.",
    reset: "Choose a strong password for your account.",
    verification: "Follow the link in your inbox to verify your email address.",
  };

  return (
    <Shell palette={palette}>
      <View style={[styles.badge, { backgroundColor: scheme === "dark" ? "#263957" : "#edf3ff" }]}>
        <Text style={[styles.badgeText, { color: palette.blue }]}>PROJECT STARTER</Text>
      </View>
      <Text style={[styles.title, { color: palette.ink }]}>{title[mode]}</Text>
      <Text style={[styles.description, { color: palette.muted }]}>{description[mode]}</Text>
      {signedOutNotice ? <Feedback kind="success">{signedOutNotice}</Feedback> : null}
      {error ? <Feedback kind="error">{error}</Feedback> : null}
      {notice ? <Feedback kind="success">{notice}</Feedback> : null}
      {refreshError ? (
        <Feedback kind="error">
          The API is temporarily unavailable. Your current session will be checked again when you
          retry.
        </Feedback>
      ) : null}
      {mode === "verification" ? (
        <>
          <AuthButton
            label="Resend verification link"
            onPress={() => {
              setMode("resend");
              setError("");
              setNotice("");
            }}
          />
          <TextButton label="Back to sign in" onPress={() => moveTo("sign-in")} />
        </>
      ) : (
        <>
          {mode === "sign-up" ? (
            <AuthField
              label="Name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              error={fieldErrors.name}
              returnKeyType="next"
            />
          ) : null}
          {mode !== "reset" ? (
            <AuthField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={fieldErrors.email}
              returnKeyType={mode === "forgot" || mode === "resend" ? "done" : "next"}
              onSubmitEditing={() => {
                if (mode === "forgot" || mode === "resend") void submit();
              }}
            />
          ) : null}
          {mode === "sign-in" || mode === "sign-up" || mode === "reset" ? (
            <AuthField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              error={fieldErrors.password}
              returnKeyType={mode === "sign-up" || mode === "reset" ? "next" : "done"}
              onSubmitEditing={() => {
                if (mode === "sign-in") void submit();
              }}
            />
          ) : null}
          {mode === "sign-up" || mode === "reset" ? (
            <AuthField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
            />
          ) : null}
          <AuthButton
            label={pending ? "Please wait…" : primaryLabel(mode)}
            disabled={pending}
            onPress={() => void submit()}
            loading={pending}
          />
          {mode === "sign-in" ? (
            <TextButton label="Forgot password?" onPress={() => moveTo("forgot")} />
          ) : null}
          {mode === "sign-up" ? (
            <TextButton
              label="Already have an account? Sign in"
              onPress={() => moveTo("sign-in")}
            />
          ) : null}
          {mode === "sign-in" ? (
            <TextButton label="Create an account" onPress={() => moveTo("sign-up")} />
          ) : null}
          {mode === "forgot" || mode === "resend" || mode === "reset" ? (
            <TextButton label="Back to sign in" onPress={() => moveTo("sign-in")} />
          ) : null}
        </>
      )}
      <Text style={[styles.footnote, { color: palette.muted }]}>
        Your account and session are managed securely by this starter’s API.
      </Text>
    </Shell>
  );
}

function primaryLabel(mode: Mode) {
  if (mode === "sign-up") return "Create account";
  if (mode === "sign-in") return "Sign in";
  if (mode === "forgot") return "Send reset link";
  if (mode === "resend") return "Send verification link";
  return "Update password";
}

function Shell({ children, palette }: { children: React.ReactNode; palette: typeof colors }) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View
            style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatusScreen({ title, message }: { title: string; message: string }) {
  return (
    <Shell palette={colors}>
      <ActivityIndicator color={colors.blue} size="large" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{message}</Text>
    </Shell>
  );
}

function Feedback({ children, kind }: { children: string; kind: "error" | "success" }) {
  return (
    <Text
      accessibilityRole={kind === "error" ? "alert" : "text"}
      accessibilityLiveRegion={kind === "error" ? "assertive" : "polite"}
      style={[styles.feedback, kind === "error" ? styles.feedbackError : styles.feedbackSuccess]}
    >
      {children}
    </Text>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <AuthButton label={label} onPress={onPress} link />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24, paddingVertical: 32 },
  card: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: "#e5eaf2",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#edf3ff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  badgeText: { color: colors.blue, fontSize: 12, fontWeight: "700", letterSpacing: 0.8 },
  title: { color: colors.ink, fontSize: 29, lineHeight: 36, fontWeight: "700" },
  description: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  identity: { backgroundColor: colors.background, borderRadius: 12, padding: 16, gap: 7 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "600", marginTop: 5 },
  identityValue: { color: colors.ink, fontSize: 16 },
  feedback: { borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 20, overflow: "hidden" },
  feedbackError: { color: colors.danger, backgroundColor: "#fff1f0" },
  feedbackSuccess: { color: colors.success, backgroundColor: "#eef9f3" },
  footnote: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 4,
  },
});
