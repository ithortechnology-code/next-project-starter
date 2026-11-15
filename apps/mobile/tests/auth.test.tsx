import { beforeEach, afterEach, expect, jest, test } from "@jest/globals";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import * as Linking from "expo-linking";
import App from "../App";
import { AuthButton } from "../components/auth-button";
import { authClient } from "../lib/auth-client";

jest.mock("../lib/auth-client", () => ({
  authClient: {
    getSession: jest.fn(),
    signIn: { email: jest.fn() },
    signUp: { email: jest.fn() },
    signOut: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    sendVerificationEmail: jest.fn(),
  },
}));
jest.mock("expo-linking", () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  parse: (url: string) => {
    const parsed = new URL(url);
    return { hostname: parsed.hostname, queryParams: Object.fromEntries(parsed.searchParams) };
  },
}));

const session = {
  user: { id: "test-user", name: "Test User", email: "native@example.test" },
  session: { id: "test-session" },
};
const client = authClient as unknown as {
  getSession: ReturnType<typeof jest.fn<() => Promise<unknown>>>;
  signOut: ReturnType<typeof jest.fn<() => Promise<unknown>>>;
};
beforeEach(() => {
  jest.clearAllMocks();
  client.getSession.mockResolvedValue({ data: null, error: null });
  client.signOut.mockResolvedValue({ error: null });
  jest.mocked(Linking.getInitialURL).mockResolvedValue(null);
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("anonymous session shows sign-in and validates empty fields", async () => {
  await render(<App />);
  await waitFor(() => expect(screen.getByLabelText("Email")).toBeTruthy());
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
});

test("confirmed persisted session renders account and sign-out clears protected state", async () => {
  client.getSession.mockResolvedValue({ data: session, error: null });
  await render(<App />);
  await waitFor(() => expect(screen.getByText("Test User")).toBeTruthy());
  await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(screen.getByLabelText("Email")).toBeTruthy());
  expect(client.signOut).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Test User")).toBeNull();
});

test("session service failure preserves confirmed view with retry feedback", async () => {
  client.getSession
    .mockResolvedValueOnce({ data: session, error: null })
    .mockRejectedValue(new Error("offline"));
  let foreground: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, handler) => {
    foreground = handler;
    return { remove: jest.fn() };
  });
  const now = jest.spyOn(Date, "now").mockReturnValue(0);
  await render(<App />);
  await waitFor(() => expect(screen.getByText("Test User")).toBeTruthy());
  now.mockReturnValue(20_000);
  await act(async () => foreground?.("active"));
  expect(screen.getByText("Test User")).toBeTruthy();
  expect(client.getSession).toHaveBeenCalledTimes(2);
});

test("confirmed expired session on foreground removes protected view", async () => {
  client.getSession
    .mockResolvedValueOnce({ data: session, error: null })
    .mockResolvedValue({ data: null, error: null });
  let foreground: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, handler) => {
    foreground = handler;
    return { remove: jest.fn() };
  });
  const now = jest.spyOn(Date, "now").mockReturnValue(0);
  await render(<App />);
  await waitFor(() => expect(screen.getByText("Test User")).toBeTruthy());
  now.mockReturnValue(20_000);
  await act(async () => foreground?.("active"));
  await waitFor(() => expect(screen.getByLabelText("Email")).toBeTruthy());
  expect(screen.queryByText("Test User")).toBeNull();
});

test("cold reset deep link opens reset form and verification opens confirmation", async () => {
  jest
    .mocked(Linking.getInitialURL)
    .mockResolvedValue("projectstarter://reset-password?token=test-only-token");
  await render(<App />);
  await waitFor(() => expect(screen.getByLabelText("Confirm password")).toBeTruthy());
  expect(screen.queryByLabelText("Email")).toBeNull();
  await cleanup();
  jest.mocked(Linking.getInitialURL).mockResolvedValue("projectstarter://verify-email?verified=1");
  await render(<App />);
  await waitFor(() =>
    expect(screen.getByText("Your email is verified. You can now sign in.")).toBeTruthy(),
  );
});

test("sign-in confirms session with API and handles rejected credentials", async () => {
  const signIn = authClient.signIn.email as unknown as ReturnType<
    typeof jest.fn<() => Promise<unknown>>
  >;
  signIn.mockResolvedValueOnce({ error: { status: 401 } }).mockResolvedValue({ error: null });
  await render(<App />);
  await waitFor(() => expect(screen.getByLabelText("Email")).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText("Email"), "native@example.test");
  await fireEvent.changeText(screen.getByLabelText("Password"), "Native-test-2026!");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getByText(/We couldn’t sign you in/)).toBeTruthy();
  client.getSession.mockResolvedValue({ data: session, error: null });
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(screen.getByText("Test User")).toBeTruthy());
  expect(client.getSession).toHaveBeenCalledTimes(2);
});

test("password keyboard submit validates and visibility toggle has accessible state", async () => {
  await render(<App />);
  await waitFor(() => expect(screen.getByLabelText("Email")).toBeTruthy());
  expect(screen.getByLabelText("Email").props.returnKeyType).toBe("next");
  expect(screen.getByLabelText("Password").props.returnKeyType).toBe("done");
  await fireEvent(screen.getByLabelText("Password"), "submitEditing");
  expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByRole("button", { name: "Show password" }));
  expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(false);
  expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();
});

test("button pressed/disabled states expose semantics and prevent duplicate actions", async () => {
  const press = jest.fn();
  const view = await render(<AuthButton label="Probe" onPress={press} />);
  const button = screen.getByRole("button", { name: "Probe" });
  await fireEvent(button, "pressIn");
  expect(button.props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ opacity: 0.82 })]),
  );
  await fireEvent(button, "pressOut");
  await view.rerender(<AuthButton label="Probe" onPress={press} disabled loading />);
  expect(screen.getByRole("button", { name: "Probe" }).props.accessibilityState).toEqual({
    disabled: true,
    busy: true,
  });
  await fireEvent.press(screen.getByRole("button", { name: "Probe" }));
  expect(press).not.toHaveBeenCalled();
});

test("registration transitions to verification and supports resend", async () => {
  const signup = authClient.signUp.email as unknown as ReturnType<
    typeof jest.fn<(payload: unknown) => Promise<unknown>>
  >;
  const resend = authClient.sendVerificationEmail as unknown as ReturnType<
    typeof jest.fn<() => Promise<unknown>>
  >;
  signup.mockResolvedValue({ error: null });
  resend.mockResolvedValue({ error: null });
  await render(<App />);
  await waitFor(() => expect(screen.getByLabelText("Email")).toBeTruthy());
  await fireEvent.press(screen.getByRole("button", { name: "Create an account" }));
  await fireEvent.changeText(screen.getByLabelText("Name"), "Native Test");
  await fireEvent.changeText(screen.getByLabelText("Email"), "native@example.test");
  await fireEvent.changeText(screen.getByLabelText("Password"), "Native-test-2026!");
  await fireEvent.changeText(screen.getByLabelText("Confirm password"), "Native-test-2026!");
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  await waitFor(() => expect(screen.getByText("Check your email")).toBeTruthy());
  expect(signup).toHaveBeenCalledWith(
    expect.objectContaining({ callbackURL: "projectstarter://verify-email?verified=1" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Resend verification link" }));
  await fireEvent.press(screen.getByRole("button", { name: "Send verification link" }));
  expect(resend).toHaveBeenCalledTimes(1);
});

test("reset completion clears the token and returns to sign-in", async () => {
  const reset = authClient.resetPassword as unknown as ReturnType<
    typeof jest.fn<(payload: unknown) => Promise<unknown>>
  >;
  reset.mockResolvedValue({ error: null });
  jest
    .mocked(Linking.getInitialURL)
    .mockResolvedValue("projectstarter://reset-password?token=disposable-test-token");
  await render(<App />);
  await waitFor(() => expect(screen.getByLabelText("Confirm password")).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText("Password"), "Native-replacement-2026!");
  await fireEvent.changeText(screen.getByLabelText("Confirm password"), "Native-replacement-2026!");
  await fireEvent.press(screen.getByRole("button", { name: "Update password" }));
  await waitFor(() =>
    expect(
      screen.getByText("Your password has been updated. Sign in with your new password."),
    ).toBeTruthy(),
  );
  expect(reset).toHaveBeenCalledWith({
    token: "disposable-test-token",
    newPassword: "Native-replacement-2026!",
  });
  expect(screen.queryByLabelText("Confirm password")).toBeNull();
});
