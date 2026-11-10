import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import ApplicationLayout from "@/app/(app)/layout";
import LoginPage from "@/app/(auth)/login/page";
import { isAuthConfigured } from "@/lib/env";
import { getServerSession } from "@/lib/session";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/env", () => ({ isAuthConfigured: vi.fn() }));
vi.mock("@/lib/session", () => ({ getServerSession: vi.fn() }));

describe("authoritative route protection", () => {
  it("rejects a fabricated or missing session in the protected layout", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    await expect(ApplicationLayout({ children: <div>Private</div> })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders protected children only after server validation", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: {}, session: {} } as never);
    const children = <div>Private</div>;
    await expect(ApplicationLayout({ children })).resolves.toBe(children);
  });

  it("redirects a genuinely signed-in user away from login", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerSession).mockResolvedValue({ user: {}, session: {} } as never);
    await expect(LoginPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("renders the safe login state without a configured session lookup", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    await expect(LoginPage()).resolves.toBeTruthy();
    expect(getServerSession).not.toHaveBeenCalled();
  });
});
