import { NextRequest, NextResponse } from "next/server";
import { getPart } from "@/lib/prosis";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`catalog:${ip}`, 30, 60_000, "1 m");
  if (!rl.success) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen bekleyin." },
      { status: 429 }
    );
  }

  const { id } = await context.params;

  // Basic sanity check — part IDs should only contain safe characters
  if (!/^[\w\-\.\s]{1,100}$/.test(id)) {
    return NextResponse.json({ error: "Geçersiz parça ID" }, { status: 400 });
  }

  try {
    const part = await getPart(id);
    if (!part) {
      return NextResponse.json({ error: "Parça bulunamadı" }, { status: 404 });
    }
    return NextResponse.json(part);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[catalog/parts/:id] connector error:", msg);
    return NextResponse.json(
      { error: "Katalog servisi şu anda kullanılamıyor" },
      { status: 503 }
    );
  }
}
