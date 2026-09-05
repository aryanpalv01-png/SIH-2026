import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protected route paths requiring active investigator authentication
const PROTECTED_PATHS = [
  "/dashboard",
  "/verify",
  "/scan",
  "/report",
  "/reports",
  "/history",
  "/settings",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if requested path matches any protected routes
  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for authentication tokens across supported session cookies
  const authToken =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("app_session_id")?.value ||
    request.cookies.get("veriscan_auth_token")?.value ||
    request.cookies.get("sb-auth-token")?.value;

  if (!authToken) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/verify/:path*",
    "/scan/:path*",
    "/report/:path*",
    "/reports/:path*",
    "/history/:path*",
    "/settings/:path*",
  ],
};
