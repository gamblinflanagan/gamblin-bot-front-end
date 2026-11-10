import { headers } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuth } from "@/lib/auth";
import { getServerSession } from "@/lib/session";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuth: vi.fn() }));

describe("getServerSession", () => {
  beforeEach(() => {
    vi.mocked(headers).mockResolvedValue(new Headers() as unknown as Awaited<ReturnType<typeof headers>>);
  });

  it("returns no session when auth is not configured", async () => {
    vi.mocked(getAuth).mockReturnValue(null);
    await expect(getServerSession()).resolves.toBeNull();
  });

  it("returns the authoritatively validated session", async () => {
    const session = { user: { id: "user-1" }, session: { id: "session-1" } };
    const getSession = vi.fn().mockResolvedValue(session);
    vi.mocked(getAuth).mockReturnValue({ api: { getSession } } as unknown as ReturnType<typeof getAuth>);
    await expect(getServerSession()).resolves.toBe(session);
    expect(getSession).toHaveBeenCalledOnce();
  });

  it("rejects invalid sessions and fails closed on auth errors", async () => {
    const getSession = vi.fn().mockResolvedValue(null);
    vi.mocked(getAuth).mockReturnValue({ api: { getSession } } as unknown as ReturnType<typeof getAuth>);
    await expect(getServerSession()).resolves.toBeNull();

    getSession.mockRejectedValue(new Error("database unavailable"));
    await expect(getServerSession()).resolves.toBeNull();
  });
});
