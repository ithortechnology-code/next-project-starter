import { test, expect } from "@playwright/test";

test("anonymous protection and keyboard-accessible sign-in validation", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in/);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Email", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((el) => el.clientWidth),
  );
});

test("invalid credentials and unavailable API produce feedback", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("unknown@example.test");
  await page.getByLabel("Password", { exact: true }).fill("invalid-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page.route("**/api/auth/sign-in/email", (route) => route.abort());
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
});

test("signup validation and recovery states", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill("unknown@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If this address");
  await page.goto("/reset-password?token=invalid-test-token");
  await page.getByLabel("Password", { exact: true }).fill("New-password-2026!");
  await page.getByLabel("Confirm password", { exact: true }).fill("New-password-2026!");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("invalid or expired");
});

test("registration, email verification, reload, reset revocation and sign-out", async ({
  page,
  request,
}) => {
  const email = `browser-${crypto.randomUUID()}@example.test`;
  const password = "Browser-2026-check!";
  const mailpit = process.env.MAILPIT_API_URL ?? "http://localhost:8025";
  async function emailLink(subject: string) {
    let id: string | undefined;
    await expect
      .poll(async () => {
        const response = await request.get(`${mailpit}/api/v1/search`, {
          params: { query: `to:${email}` },
        });
        const data = await response.json();
        id = data.messages.find(
          (item: { Subject: string; ID: string }) => item.Subject === subject,
        )?.ID;
        return Boolean(id);
      })
      .toBe(true);
    const response = await request.get(`${mailpit}/api/v1/message/${id}`);
    const message = await response.json();
    const match = message.Text.match(/https?:\/\/[^\s<>]+/);
    if (!match) throw new Error("Expected an email link");
    return match[0] as string;
  }
  try {
    await page.goto("/sign-up");
    await page.getByLabel("Name", { exact: true }).fill("Browser Test");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page).toHaveURL(/verify-email/);
    await page.goto(await emailLink("Verify your email address"));
    await page.goto("/sign-in");
    async function signIn(secret: string) {
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(secret);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/app$/);
    }
    await signIn(password);
    await page.reload();
    await expect(page.getByRole("heading", { name: "You’re signed in." })).toBeVisible();
    await page.goto("/forgot-password");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    await page.goto(await emailLink("Reset your password"));
    const replacement = "Browser-replacement-2026!";
    await page.getByLabel("Password", { exact: true }).fill(replacement);
    await page.getByLabel("Confirm password", { exact: true }).fill(replacement);
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page).toHaveURL(/sign-in/);
    await page.goto("/app");
    await expect(page).toHaveURL(/sign-in/);
    await signIn(replacement);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/sign-in/);
    await page.goto("/app");
    await expect(page).toHaveURL(/sign-in/);
  } finally {
    const { Client } = await import("pg");
    const db = new Client({ connectionString: process.env.AUTH_TEST_DATABASE_URL });
    await db.connect();
    try {
      await db.query('DELETE FROM "user" WHERE email = $1', [email]);
    } finally {
      await db.end();
      await request.delete(`${mailpit}/api/v1/search`, { params: { query: `to:${email}` } });
    }
  }
});
