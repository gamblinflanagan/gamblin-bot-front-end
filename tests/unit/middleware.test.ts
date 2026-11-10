import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, middleware } from "@/middleware";

describe("middleware", () => {
  it("redirects a request without a session cookie", () => {
    const response = middleware(new NextRequest("http://localhost/"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("uses cookie presence only as an optimistic pass-through", () => {
    const request = new NextRequest("http://localhost/", {
      headers: { cookie: "better-auth.session_token=fabricated" },
    });
    const response = middleware(request);
    expect(response.status).toBe(200);
  });

  it("matches only the protected application route", () => {
    expect(config.matcher).toEqual(["/"]);
  });
});
