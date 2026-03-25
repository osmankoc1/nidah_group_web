import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page without auth
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Allow logout (clears cookie and redirects — no auth required)
  if (pathname === "/api/admin/logout") {
    return NextResponse.next();
  }

  // Allow auth endpoint (login itself)
  if (pathname === "/api/admin/auth") {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api/admin");

  // Check JWT cookie
  const token = request.cookies.get("admin-token")?.value;
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    // Invalid/expired token
    if (isApiRoute) {
      const response = NextResponse.json(
        { error: "Oturum süresi doldu." },
        { status: 401 }
      );
      response.cookies.delete("admin-token");
      return response;
    }
    const response = NextResponse.redirect(
      new URL("/admin/login", request.url)
    );
    response.cookies.delete("admin-token");
    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
