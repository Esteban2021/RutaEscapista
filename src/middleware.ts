import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_EXACT = ["/login", "/registro", "/salas", "/rutas"];
const PUBLIC_PREFIXES = ["/sala/", "/ruta/", "/rutas", "/invitacion/"];
const AUTH_ONLY_REDIRECT = ["/login", "/registro"];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) return true;
  if (pathname.endsWith("/editar")) return false;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("firebase-token")?.value;
  const { pathname } = request.nextUrl;

  if (!token && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && AUTH_ONLY_REDIRECT.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
