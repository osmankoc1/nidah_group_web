import { NextRequest, NextResponse } from "next/server";
import { revalidateProducts } from "@/lib/revalidate-public";
import { db } from "@/lib/db";
import { productTranslations, products } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import {
  PRODUCT_TRANSLATION_LOCALES,
  isProductTranslationLocale,
} from "@/lib/product-i18n";
import { FIELD_LIMITS, parseOptionalText } from "@/lib/product-fields";

/**
 * Ürün çevirileri — TR temel, EN/RU/AR çeviri.
 *
 * MEVCUT DAVRANIŞ KORUNUR: blogdaki manuel çeviri modeli birebir uygulanır.
 * TR içerik `products` tablosunda durur; bu rota yalnızca EN/RU/AR satırlarını
 * yönetir.
 *
 * YAYIN KAPISI: `published` dil başınadır ve varsayılanı `false`. Bir çeviri
 * satırının var olması onu yayına sokmaz — public sayfa yalnızca
 * `published = true` olan çeviriyi kullanır (src/lib/product-i18n.ts).
 * Doğrulanmamış çeviri OTOMATİK YAYINLANMAZ.
 */

type Params = { params: Promise<{ id: string }> };

const TRANSLATION_COLUMNS = {
  id: productTranslations.id,
  productId: productTranslations.productId,
  locale: productTranslations.locale,
  name: productTranslations.name,
  shortDescription: productTranslations.shortDescription,
  longDescription: productTranslations.longDescription,
  metaTitle: productTranslations.metaTitle,
  metaDescription: productTranslations.metaDescription,
  published: productTranslations.published,
  publishedAt: productTranslations.publishedAt,
  createdAt: productTranslations.createdAt,
  updatedAt: productTranslations.updatedAt,
} as const;

export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  const rows = await db
    .select(TRANSLATION_COLUMNS)
    .from(productTranslations)
    .where(eq(productTranslations.productId, id))
    .orderBy(asc(productTranslations.locale));

  return NextResponse.json({
    data: rows,
    meta: { supportedLocales: PRODUCT_TRANSLATION_LOCALES },
  });
}

/**
 * Bir dilin çevirisini oluşturur veya günceller (upsert).
 * Benzersizlik `uq_product_translation_product_locale` ile korunur.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Geçersiz gövde." }, { status: 400 });

  const locale = typeof body.locale === "string" ? body.locale.trim().toLowerCase() : "";
  if (!isProductTranslationLocale(locale)) {
    return NextResponse.json(
      {
        error:
          `Geçersiz locale: "${locale}". Kullanılabilir: ` +
          `${PRODUCT_TRANSLATION_LOCALES.join(" · ")}. ` +
          `TR temel dildir ve ürünün kendi alanlarında tutulur.`,
      },
      { status: 400 }
    );
  }

  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!product) return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Çeviri için ad (name) zorunludur." }, { status: 400 });
  }
  if (name.length > 500) {
    return NextResponse.json({ error: "name en fazla 500 karakter olabilir." }, { status: 400 });
  }

  const fields: Array<[string, number | undefined]> = [
    ["shortDescription", FIELD_LIMITS.shortDescription],
    ["longDescription", undefined],
    ["metaTitle", FIELD_LIMITS.metaTitle],
    ["metaDescription", undefined],
  ];
  const text: Record<string, string | null> = {};
  for (const [field, limit] of fields) {
    const parsed = parseOptionalText(body[field], field, limit);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    text[field] = parsed.value;
  }

  // YAYIN KARARI — açık boolean. Verilmezse yayına ALINMAZ.
  const published = body.published === true || body.published === "true";
  const now = new Date();

  const [row] = await db
    .insert(productTranslations)
    .values({
      productId: id,
      locale,
      name,
      shortDescription: text.shortDescription,
      longDescription: text.longDescription,
      metaTitle: text.metaTitle,
      metaDescription: text.metaDescription,
      published,
      publishedAt: published ? now : null,
    })
    .onConflictDoUpdate({
      target: [productTranslations.productId, productTranslations.locale],
      set: {
        name,
        shortDescription: text.shortDescription,
        longDescription: text.longDescription,
        metaTitle: text.metaTitle,
        metaDescription: text.metaDescription,
        published,
        publishedAt: published ? now : null,
        updatedAt: now,
      },
    })
    .returning(TRANSLATION_COLUMNS);

  // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
  // panelde gorunen veri ile sitede gorunen veri ayrisir.
  revalidateProducts();
  return NextResponse.json({ data: row });
}
