import { expect, test } from "@playwright/test";

test("standalone login is styled and safely unconfigured", async ({ page, request }) => {
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  expect(page.url()).toContain("/login");

  await expect(page.getByText("Authentication not configured")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  const button = page.getByRole("button", { name: "Sign in" });
  await expect(button).toBeDisabled();
  await expect(button).toHaveCSS("display", "inline-flex");

  const stylesheet = await page.locator('link[rel="stylesheet"]').first().getAttribute("href");
  expect(stylesheet).toContain("/_next/static/");
  const asset = await request.get(stylesheet!);
  expect(asset.status()).toBe(200);

  const auth = await request.get("/api/auth/get-session");
  expect(auth.status()).toBe(503);
  expect(await auth.json()).toEqual({ error: "Authentication is not configured." });
});

test("protected home rejects missing and fabricated sessions", async ({ context, page, request }) => {
  const anonymous = await request.get("/", { maxRedirects: 0 });
  expect(anonymous.status()).toBe(307);
  expect(new URL(anonymous.headers().location).pathname).toBe("/login");

  await context.addCookies([
    { name: "better-auth.session_token", value: "fabricated", url: "http://127.0.0.1:3100" },
  ]);
  await page.goto("/");
  expect(page.url()).toContain("/login");
  await expect(page.getByText("Authentication not configured")).toBeVisible();
  await expect(page.getByText("Protected application shell")).toHaveCount(0);
});
