import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxyBackendRequest } from "@/lib/backend";
import { getServerSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getServerSession: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("BACKEND_API_URL", "http://127.0.0.1:8000/");
  vi.stubEnv("BACKEND_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Python backend proxy", () => {
  it("rejects anonymous production requests before calling Python", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxyBackendRequest("/data");
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows the development preview and forwards the optional key", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BACKEND_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxyBackendRequest("/status");
    expect(response.status).toBe(200);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][0].pathname).toBe("/status");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-key");
  });

  it("returns safe gateway and timeout errors", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: {}, session: {} } as never);
    const timeout = new Error("timeout");
    timeout.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("private details")).mockRejectedValueOnce(timeout));

    const unavailable = await proxyBackendRequest("/data");
    const expired = await proxyBackendRequest("/record");
    expect(unavailable.status).toBe(502);
    expect(await unavailable.json()).toEqual({ error: "Could not connect to the backend." });
    expect(expired.status).toBe(504);
  });
});
