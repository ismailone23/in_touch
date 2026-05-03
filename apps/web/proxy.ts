import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const path = request.nextUrl.pathname;

  // Public routes
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/verify",
    "/forgot-password",
    "/reset-password",
  ];

  if (publicRoutes.includes(path)) {
    return NextResponse.next();
  }

  // Protected routes require token
  if (path.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};