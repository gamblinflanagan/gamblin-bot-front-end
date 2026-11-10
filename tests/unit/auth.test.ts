import { describe, expect, it, vi } from "vitest";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { getDatabase } from "@/db";
import { getAuth } from "@/lib/auth";
import { getAuthEnvironment } from "@/lib/env";

vi.mock("better-auth", () => ({ betterAuth: vi.fn(() => ({ handler: vi.fn() })) }));
vi.mock("better-auth/next-js", () => ({ nextCookies: vi.fn(() => "next-cookies") }));
vi.mock("@better-auth/drizzle-adapter", () => ({ drizzleAdapter: vi.fn(() => vi.fn()) }));
vi.mock("@/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/env", () => ({ getAuthEnvironment: vi.fn() }));

describe("auth initialization", () => {
  it("does not initialize a database or auth instance without configuration", () => {
    vi.mocked(getAuthEnvironment).mockReturnValue(null);
    expect(getAuth()).toBeNull();
    expect(getDatabase).not.toHaveBeenCalled();
    expect(betterAuth).not.toHaveBeenCalled();
  });

  it("configures disabled sign-up and a five-minute signed cookie cache", () => {
    vi.mocked(getAuthEnvironment).mockReturnValue({
      databaseUrl: "postgresql://localhost/test",
      secret: "a-test-secret-that-is-at-least-32-characters",
      baseUrl: "http://localhost:3000",
      trustedOrigins: ["http://localhost:3000"],
      useSecureCookies: false,
    });
    vi.mocked(getDatabase).mockReturnValue({} as unknown as NonNullable<ReturnType<typeof getDatabase>>);

    expect(getAuth()).not.toBeNull();
    expect(drizzleAdapter).toHaveBeenCalledWith({}, expect.objectContaining({ provider: "pg" }));
    expect(betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAndPassword: { enabled: true, disableSignUp: true },
        session: { cookieCache: { enabled: true, maxAge: 300 } },
        trustedOrigins: ["http://localhost:3000"],
        plugins: ["next-cookies"],
      }),
    );
  });
});
