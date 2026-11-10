import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

function unavailable(status: 500 | 503) {
  return Response.json(
    { error: status === 503 ? "Authentication is not configured." : "Authentication is unavailable." },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function handle(request: Request, method: "GET" | "POST") {
  const auth = getAuth();
  if (!auth) return unavailable(503);

  try {
    const handlers = toNextJsHandler(auth);
    return await handlers[method](request);
  } catch {
    return unavailable(500);
  }
}

export async function GET(request: Request) {
  return handle(request, "GET");
}

export async function POST(request: Request) {
  return handle(request, "POST");
}
