import { NextRequest, NextResponse } from "next/server";
import { suggestParts } from "@/lib/prosis";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`catalog:${ip}`, 30, 60_000, "1 m");
  if (!rl.success) {
    return NextResponse.json({ suggestions: [] }, { status: 429 });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100).trim();

  if (!q) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await suggestParts(q);
    return NextResponse.json({ suggestions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[catalog/suggest] connector error:", msg);
    return NextResponse.json({ suggestions: [] }, { status: 503 });
  }
}
