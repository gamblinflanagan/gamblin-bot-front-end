import "server-only";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";

type BackendPath = "/data" | "/record" | "/status";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function proxyBackendRequest(path: BackendPath) {
  if (process.env.NODE_ENV !== "development" && !(await getServerSession())) {
    return error("Authentication required.", 401);
  }

  const base = (process.env.BACKEND_API_URL?.trim() || "http://127.0.0.1:8000").replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(`${base}${path}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported protocol");
  } catch {
    return error("Backend is not configured correctly.", 502);
  }

  const apiKey = process.env.BACKEND_API_KEY?.trim();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return error("Backend request failed.", 502);

    try {
      const data: unknown = await response.json();
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return error("Backend returned invalid JSON.", 502);
    }
  } catch (cause) {
    if (cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError")) {
      return error("Backend request timed out.", 504);
    }
    return error("Could not connect to the backend.", 502);
  }
}
