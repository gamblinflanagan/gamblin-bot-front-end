import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/auth/[...all]/route";
import { getAuth } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({ getAuth: vi.fn() }));

describe("unconfigured auth routes", () => {
  it("fails safely for GET and POST without exposing exception details", async () => {
    vi.mocked(getAuth).mockReturnValue(null);

    for (const handler of [GET, POST]) {
      const response = await handler(new Request("http://localhost/api/auth/sign-in/email", { method: "POST" }));
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({ error: "Authentication is not configured." });
    }
  });
});
