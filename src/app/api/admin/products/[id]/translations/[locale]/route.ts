import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productTranslations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isProductTranslationLocale } from "@/lib/product-i18n";

type Params = { params: Promise<{ id: string; locale: string }> };

/**
 * Tek bir dilin YAYIN durumunu değiştirir.
 *
 * İçerik düzenlemesi üst rotadaki `PUT` ile yapılır; bu uç yalnızca
 * "yayınla / yayından al" kararı içindir. Böylece yayın, içerik düzenlemesinden
 * ayrı ve bilinçli bir adım olarak kalır.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, locale } = await params;
  const normalizedLocale = locale.trim().toLowerCase();
  if (!isProductTranslationLocale(normalizedLocale)) {
    return NextResponse.json({ error: `Geçersiz locale: "${locale}".` }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !("published" in body)) {
    return NextResponse.json({ error: "published alanı zorunludur." }, { status: 400 });
  }
  if (typeof body.published !== "boolean") {
    return NextResponse.json({ error: "published true veya false olmalı." }, { status: 400 });
  }

  const published: boolean = body.published;

  const [updated] = await db
    .update(productTranslations)
    .set({
      published,
      publishedAt: published ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productTranslations.productId, id),
        eq(productTranslations.locale, normalizedLocale)
      )
    )
    .returning({
      locale: productTranslations.locale,
      published: productTranslations.published,
      publishedAt: productTranslations.publishedAt,
    });

  if (!updated) {
    return NextResponse.json({ error: "Bu dil için çeviri bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, locale } = await params;
  const normalizedLocale = locale.trim().toLowerCase();
  if (!isProductTranslationLocale(normalizedLocale)) {
    return NextResponse.json({ error: `Geçersiz locale: "${locale}".` }, { status: 400 });
  }

  const [deleted] = await db
    .delete(productTranslations)
    .where(
      and(
        eq(productTranslations.productId, id),
        eq(productTranslations.locale, normalizedLocale)
      )
    )
    .returning({ locale: productTranslations.locale });

  if (!deleted) {
    return NextResponse.json({ error: "Bu dil için çeviri bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
