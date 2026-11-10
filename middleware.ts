import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Optimistic routing only: the protected layout performs authoritative validation.
  const hasSessionCookie =
    request.cookies.has("better-auth.session_token") || request.cookies.has("__Secure-better-auth.session_token");
  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
