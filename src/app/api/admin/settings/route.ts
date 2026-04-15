import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { MANAGED_PAGES, type PageKey } from "@/lib/site-settings";
import { eq } from "drizzle-orm";

// GET /api/admin/settings — tüm sayfa görünürlük ayarlarını döner
export async function GET() {
  if (!db) return NextResponse.json({ error: "DB bağlantısı yok." }, { status: 503 });

  const rows = await db.select().from(siteSettings);
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const pages = MANAGED_PAGES.map((p) => ({
    key: p.key,
    path: p.path,
    label: p.label,
    enabled: p.key in stored ? stored[p.key] === "true" : p.defaultEnabled,
  }));

  return NextResponse.json({ pages });
}

// PATCH /api/admin/settings — { key, enabled } ile tek ayar günceller
export async function PATCH(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB bağlantısı yok." }, { status: 503 });

  const body = await req.json() as { key: string; enabled: boolean };

  const validKeys = MANAGED_PAGES.map((p) => p.key) as string[];
  if (!validKeys.includes(body.key)) {
    return NextResponse.json({ error: "Geçersiz anahtar." }, { status: 400 });
  }

  await db
    .insert(siteSettings)
    .values({ key: body.key as PageKey, value: String(body.enabled) })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: String(body.enabled), updatedAt: new Date() },
    });

  // Tüm public sayfaların önbelleğini temizle
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true });
}
