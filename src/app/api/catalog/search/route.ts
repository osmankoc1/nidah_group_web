import { NextRequest, NextResponse } from "next/server";
import { searchParts } from "@/lib/prosis";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`catalog:${ip}`, 30, 60_000, "1 m");
  if (!rl.success) {
    return NextResponse.json(
      {
        parts: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        error: "Çok fazla istek. Lütfen bekleyin.",
      },
      { status: 429 }
    );
  }

  const { searchParams } = request.nextUrl;
  const q        = (searchParams.get("q") ?? "").slice(0, 200);
  const brand    = (searchParams.get("brand") ?? "").slice(0, 10).toUpperCase();
  const page     = Math.max(1, parseInt(searchParams.get("page")     ?? "1",  10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20)
  );

  try {
    const data = await searchParts(q, page, pageSize, brand);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[catalog/search] connector error:", msg);
    return NextResponse.json(
      {
        parts: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: "Katalog servisi şu anda kullanılamıyor",
      },
      { status: 503 }
    );
  }
}
