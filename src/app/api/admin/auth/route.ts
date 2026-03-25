import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signToken } from "@/lib/auth/jwt";
import { rateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  // Strict brute-force protection: 5 attempts per 30 minutes per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`admin-auth:${ip}`, 5, 30 * 60_000, "30 m");
  if (!rl.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Çok fazla giriş denemesi. 30 dakika sonra tekrar deneyin.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Kullanıcı adı ve şifre gereklidir." },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        { success: false, error: "Geçersiz kullanıcı adı veya şifre." },
        { status: 401 }
      );
    }

    const token = await signToken({ username });

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
