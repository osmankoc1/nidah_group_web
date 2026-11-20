import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages, fitments, productConditionEnum, categories } from "@/lib/db/schema";
import { eq, asc, desc, ilike, or, and, inArray, count, sql } from "drizzle-orm";
import { normalizePartNumber } from "@/lib/part-number";
import { PRODUCT_COLUMNS_V3 } from "@/lib/db/columns";
import { isUniqueViolation } from "@/lib/db/errors";
import { evaluateSeoReadiness, ONERILEN_ACIKLAMA_KARAKTERI } from "@/lib/seo-gate";
import { parseProductFilters } from "@/lib/product-filters";
import { parseProductCategoryId } from "@/lib/category-tree";
import {
  FIELD_LIMITS,
  parseInternalStockCode,
  parseOptionalText,
  parseSourcingType,
  parseStockStatus,
} from "@/lib/product-fields";

/** Şema enum'unun tek kaynağı — elle yazılmış bir kopya tutulmaz. */
const CONDITIONS = productConditionEnum.enumValues;
type Condition = (typeof CONDITIONS)[number];

/**
 * Ucuz veri bütünlüğü doğrulamaları. SEO/hazırlık kontrolleri BURADA DEĞİL —
 * açıklama/kategori/görsel/uyumluluk eksikliği kaydetmeyi engellemez.
 */
function validateCondition(value: unknown): { ok: true; value: Condition } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") return { ok: true, value: "new" };
  if (typeof value === "string" && (CONDITIONS as readonly string[]).includes(value)) {
    return { ok: true, value: value as Condition };
  }
  return { ok: false, error: `Invalid condition. Allowed values: ${CONDITIONS.join(", ")}` };
}

function validateWeight(value: unknown): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: "Invalid weight. Must be a finite number greater than or equal to 0." };
  }
  return { ok: true, value: n };
}

/**
 * Parça numarası benzersizliğini koruyan İKİ index vardır:
 *   uq_products_part_number → ham kanonik değer
 *   uq_products_pn_norm     → normalize edilmiş kimlik
 * İkisi de aynı kullanıcı hatasını temsil eder.
 */
function isPartNumberConflict(err: unknown): boolean {
  // Drizzle surucu hatasini sarar; constraint adi `err.cause` zincirindedir,
  // dis hatanin mesajinda DEGIL. Eski `err.message.includes(...)` kontrolu bu
  // yuzden hic eslesmiyordu ve yaris kosulunda 409 yerine 500 doneriyordu.
  // (src/lib/db/errors.ts)
  return isUniqueViolation(err, [
    "uq_products_part_number",
    "uq_products_pn_norm",
    // Dev veritabani `drizzle-kit push` ile kuruldugu icin ad farkli.
    "products_part_number_unique",
  ]);
}

/** Admin'e gösterilen mesaj — constraint adı veya DB detayı SIZDIRILMAZ. */
function duplicateMessage(existingPartNumber?: string): string {
  return existingPartNumber
    ? `This part number is already registered as "${existingPartNumber}". ` +
      "Spacing and punctuation are ignored when comparing part numbers."
    : "This part number is already registered. " +
      "Spacing and punctuation are ignored when comparing part numbers.";
}

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const page   = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;
    /*
     * ── FİLTRELER (P4) ve SIRALAMA (Y3) ───────────────────────────────────
     *
     * Ayrıştırma `src/lib/product-filters.ts` içinde, SAF bir fonksiyonda
     * yapılır: geçersiz değer hata üretmez, varsayılana düşer; sıralama
     * alanı beyaz listeden gelir.
     *
     * Geriye uyumluluk: eski `?active=true|false` biçimi `ucluOku()` ile
     * hâlâ anlaşılır, bu yüzden mevcut çağrılar kırılmaz.
     */
    const filtre = parseProductFilters(searchParams);
    const search = filtre.search ?? undefined;

    const conditions = [];
    if (search) {
      /*
       * Arama dört alanı birden tarar (Faz 3):
       *   1. görünen parça numarası        — "VOE 12727728"
       *   2. normalize parça numarası      — "VOE12727728"
       *   3. görünen Logo stok kodu        — "002 236 11 10"
       *   4. normalize Logo stok kodu      — "0022361110"
       *
       * 2 ve 4 olmadan, kullanıcının yazdığı biçim depodaki biçimle birebir
       * aynı değilse (boşluk/tire farkı) sonuç DÖNMEZ. Normalize karşılaştırma
       * yalnızca EŞLEŞTİRME içindir; görünen değer hiçbir zaman değişmez.
       *
       * Logo stok kodu YALNIZCA yönetim panelinde aranır; public arama
       * (`/api/products`) bu alanlara DOKUNMAZ.
       */
      const searchNormalized = normalizePartNumber(search);
      const patterns = [
        ilike(products.partNumber, `%${search}%`),
        ilike(products.name, `%${search}%`),
        ilike(products.internalStockCode, `%${search}%`),
      ];
      if (searchNormalized) {
        patterns.push(
          ilike(products.partNumberNormalized, `%${searchNormalized}%`),
          ilike(products.internalStockCodeNormalized, `%${searchNormalized}%`)
        );
      }
      conditions.push(or(...patterns));
    }
    if (filtre.active === "yes") conditions.push(eq(products.isActive, true));
    if (filtre.active === "no")  conditions.push(eq(products.isActive, false));

    if (filtre.seoReady === "yes") conditions.push(eq(products.seoReady, true));
    if (filtre.seoReady === "no")  conditions.push(eq(products.seoReady, false));

    if (filtre.stockStatus) conditions.push(eq(products.stockStatus, filtre.stockStatus));
    if (filtre.condition) {
      conditions.push(eq(products.condition, filtre.condition as Condition));
    }
    if (filtre.categoryId) conditions.push(eq(products.categoryId, filtre.categoryId));
    if (filtre.manufacturer) {
      conditions.push(ilike(products.partManufacturer, `%${filtre.manufacturer}%`));
    }

    /*
     * SENTETİK KAYITLAR — varsayılan olarak GİZLİ.
     *
     * 12 test kaydı `drizzle/0012` ile kalıcı olarak işaretlendi. Varsayılan
     * listede görünmezler; operatör 154 gerçek ürünü görür. Bu bir
     * kullanılabilirlik tercihidir — kayıtlar zaten `is_active = false` ile
     * public yüzeyden kapalıdır ve o koruma DEĞİŞMEDİ.
     */
    if (filtre.synthetic === "hide") conditions.push(eq(products.isSynthetic, false));
    if (filtre.synthetic === "only") conditions.push(eq(products.isSynthetic, true));

    /*
     * Açıklama uzunluğu filtresi — eşik `ONERILEN_ACIKLAMA_KARAKTERI`'den
     * gelir, SQL'e sabit sayı gömülmez.
     *
     * DİKKAT: bu filtre bir KALİTE görünümüdür, yayın uygunluğu DEĞİL.
     * 300 karakterin altında kalmak yayını engellemez (2026-11-20).
     */
    if (filtre.shortDescription === "yes") {
      conditions.push(
        sql`length(coalesce(${products.longDescription}, '')) < ${ONERILEN_ACIKLAMA_KARAKTERI}`
      );
    }
    if (filtre.shortDescription === "no") {
      conditions.push(
        sql`length(coalesce(${products.longDescription}, '')) >= ${ONERILEN_ACIKLAMA_KARAKTERI}`
      );
    }

    /*
     * Fotoğraf filtreleri — alt sorgu ile. `verifiedPhoto` YALNIZCA
     * `product_images.verified = true` satırları sayar; temsilî görselin
     * bu tabloda kaydı YOKTUR, dolayısıyla hiçbir ürünü "fotoğraflı"
     * göstermez.
     */
    const dogrulanmisFotoVar = sql`exists (
      select 1 from ${productImages}
       where ${productImages.productId} = ${products.id}
         and ${productImages.verified}
    )`;
    const herhangiFotoVar = sql`exists (
      select 1 from ${productImages}
       where ${productImages.productId} = ${products.id}
    )`;
    if (filtre.verifiedPhoto === "yes") conditions.push(dogrulanmisFotoVar);
    if (filtre.verifiedPhoto === "no")  conditions.push(sql`not ${dogrulanmisFotoVar}`);
    if (filtre.anyPhoto === "yes") conditions.push(herhangiFotoVar);
    if (filtre.anyPhoto === "no")  conditions.push(sql`not ${herhangiFotoVar}`);

    const where = conditions.length ? and(...conditions) : undefined;

    /*
     * SIRALAMA (Y3) — alan beyaz listeden geldiği için doğrudan
     * eşlenebilir. `publishReadiness` türetilmiş bir sıralamadır: önce
     * yayına EN YAKIN olanlar (doğrulanmış fotoğrafı ve yeterli açıklaması
     * olanlar) gelir; fotoğraf turu önceliklendirmesi buna dayanır.
     */
    const siralamaKolonu = {
      createdAt: products.createdAt,
      partNumber: products.partNumber,
      name: products.name,
      updatedAt: products.updatedAt,
    } as const;

    /*
     * `publishReadiness` = 0-3 arasi bir HAZIRLIK PUANI:
     *   +1 dogrulanmis fotograf varsa
     *   +1 uzun aciklama BOS DEGILSE (2026-11-20: 300 karakter esigi
     *      kaldirildi; puan artik yayin kapisiyla AYNI olcutu kullanir)
     *   +1 dogrulanmis uyumluluk varsa
     * Azalan siralama "yayina en yakin" urunleri basa getirir; artan
     * siralama ise "en cok is gereken" urunleri. Fotograf turu
     * onceliklendirmesi buna dayanir.
     */
    const hazirlikPuani = sql`(
      (case when exists (select 1 from ${productImages}
         where ${productImages.productId} = ${products.id} and ${productImages.verified}) then 1 else 0 end)
    + (case when length(btrim(coalesce(${products.longDescription}, ''))) > 0 then 1 else 0 end)
    + (case when exists (select 1 from ${fitments}
         where ${fitments.productId} = ${products.id} and ${fitments.verified}) then 1 else 0 end)
    )`;

    const orderBy =
      filtre.sort === "publishReadiness"
        ? [
            filtre.dir === "asc" ? sql`${hazirlikPuani} asc` : sql`${hazirlikPuani} desc`,
            asc(products.partNumber),
          ]
        : [
            filtre.dir === "asc"
              ? asc(siralamaKolonu[filtre.sort])
              : desc(siralamaKolonu[filtre.sort]),
          ];

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id:         products.id,
          partNumber: products.partNumber,
          name:       products.name,
          condition:  products.condition,
          isActive:   products.isActive,
          inStock:    products.inStock,
          categoryId: products.categoryId,
          createdAt:  products.createdAt,
          // Faz 2 — liste ekraninda yayin ve stok durumu gorunur olmali.
          stockStatus:      products.stockStatus,
          sourcingType:     products.sourcingType,
          seoReady:         products.seoReady,
          partManufacturer: products.partManufacturer,
          // Faz 3 — depo eşleşmesi için listede görünür. Public listede YOK.
          internalStockCode: products.internalStockCode,
          /*
           * Faz 2 / P13 — uzun açıklamanın KENDİSİ değil, UZUNLUĞU.
           *
           * Liste ucu `long_description` alanını bilinçli olarak taşımıyordu
           * (100 kayıt x ~500 karakter gereksiz yük). Ama bu yüzden
           * "açıklaması eksik ürünler" listede gösterilemiyor ve
           * filtrelenemiyordu. Uzunluk tek bir `length()` ile AYNI sorguda
           * gelir; ek sorgu maliyeti yoktur.
           */
          longDescriptionLength: sql<number>`length(coalesce(${products.longDescription}, ''))`.mapWith(Number),
        })
        .from(products)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(products).where(where),
    ]);

    /*
     * ── TOPLU SAYIMLAR — N+1 YOK (Faz 2 / P13) ─────────────────────────────
     *
     * Sayfadaki ürünlerin TAMAMI için üç sorgu çalışır: birincil görsel,
     * görsel sayıları ve doğrulanmış uyumluluk sayısı. Ürün başına sorgu
     * açılmaz; `inArray` ile tek seferde gelir, `GROUP BY` ile sayılır.
     */
    const ids = rows.map((r) => r.id);
    const imageMap: Record<string, string> = {};
    const imageCounts: Record<string, { toplam: number; dogrulanmis: number }> = {};
    const fitmentCounts: Record<string, number> = {};

    if (ids.length > 0) {
      const [imgs, imgSayim, uyumSayim] = await Promise.all([
        db
          .select({ productId: productImages.productId, url: productImages.cloudinaryUrl })
          .from(productImages)
          .where(and(eq(productImages.isPrimary, true), inArray(productImages.productId, ids))),
        db
          .select({
            productId: productImages.productId,
            toplam: count(),
            // Temsilî görselin bu tabloda kaydı YOKTUR; yalnızca gerçek
            // yüklenmiş dosyalar sayılır.
            dogrulanmis: sql<number>`count(*) filter (where ${productImages.verified})`.mapWith(Number),
          })
          .from(productImages)
          .where(inArray(productImages.productId, ids))
          .groupBy(productImages.productId),
        db
          .select({ productId: fitments.productId, dogrulanmis: count() })
          .from(fitments)
          .where(and(eq(fitments.verified, true), inArray(fitments.productId, ids)))
          .groupBy(fitments.productId),
      ]);

      for (const img of imgs) imageMap[img.productId] = img.url;
      for (const satir of imgSayim) {
        imageCounts[satir.productId] = {
          toplam: Number(satir.toplam),
          dogrulanmis: Number(satir.dogrulanmis),
        };
      }
      for (const satir of uyumSayim) fitmentCounts[satir.productId] = Number(satir.dogrulanmis);
    }

    /*
     * Yayın hazırlığı özeti — AYNI KAPIDAN hesaplanır.
     *
     * `evaluateSeoReadiness()` sunucu tarafı yayın kapısının da kullandığı
     * saf fonksiyondur. Burada EŞİK KOPYASI OLUŞTURULMAZ; aksi hâlde liste
     * rozeti ile gerçek kapı zamanla ayrışırdı.
     *
     * Bu alanlar YALNIZCA BİLGİ amaçlıdır: hiçbir ürünü yayına almaz,
     * `seo_ready` alanına dokunmaz.
     *
     * `longDescription` yerine uzunluğu taşıdığımız için kapıya eşdeğer
     * uzunlukta bir yer tutucu metin verilir — kapı yalnızca UZUNLUĞA bakar.
     */
    const data = rows.map((satir) => {
      const gorsel = imageCounts[satir.id] ?? { toplam: 0, dogrulanmis: 0 };
      const dogrulanmisUyum = fitmentCounts[satir.id] ?? 0;

      const readiness = evaluateSeoReadiness({
        isActive: satir.isActive,
        partNumber: satir.partNumber,
        name: satir.name,
        longDescription: "x".repeat(Number(satir.longDescriptionLength) || 0),
        verifiedImageCount: gorsel.dogrulanmis,
        verifiedFitmentCount: dogrulanmisUyum,
      });

      return {
        ...satir,
        primaryImageUrl: imageMap[satir.id] ?? null,
        imageCount: gorsel.toplam,
        verifiedImageCount: gorsel.dogrulanmis,
        verifiedFitmentCount: dogrulanmisUyum,
        publishEligible: readiness.eligible,
        unmetCount: readiness.unmet.length,
        unmet: readiness.unmet,
      };
    });

    return NextResponse.json({
      data,
      meta: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    console.error("[GET /api/admin/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { partNumber, name, description, condition, categoryId, weight, notes } = body;

    // ── Faz 2 alanlari ──────────────────────────────────────────────────────
    // `seoReady` BILINCLI OLARAK KABUL EDILMEZ: yayin onayi ayri bir insan
    // kararidir ve yalnizca PATCH ile verilir. Yeni urun daima seo_ready=false
    // (sema varsayilani) olarak baslar.
    const stock = parseStockStatus(body.stockStatus);
    if (!stock.ok) return NextResponse.json({ error: stock.error }, { status: 400 });

    const sourcing = parseSourcingType(body.sourcingType);
    if (!sourcing.ok) return NextResponse.json({ error: sourcing.error }, { status: 400 });

    const partMfr = parseOptionalText(body.partManufacturer, "partManufacturer", FIELD_LIMITS.partManufacturer);
    if (!partMfr.ok) return NextResponse.json({ error: partMfr.error }, { status: 400 });

    // Kategori (bulgu P6) — gecersiz uuid sureticiye gidip 500 uretmesin.
    const kategori = parseProductCategoryId(categoryId);
    if (!kategori.ok) return NextResponse.json({ error: kategori.error }, { status: 400 });
    if (kategori.value) {
      const [varMi] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, kategori.value))
        .limit(1);
      if (!varMi) return NextResponse.json({ error: "Kategori bulunamadi." }, { status: 400 });
    }

    const shortDesc = parseOptionalText(body.shortDescription, "shortDescription", FIELD_LIMITS.shortDescription);
    if (!shortDesc.ok) return NextResponse.json({ error: shortDesc.error }, { status: 400 });

    const longDesc = parseOptionalText(body.longDescription, "longDescription");
    if (!longDesc.ok) return NextResponse.json({ error: longDesc.error }, { status: 400 });

    const metaTitle = parseOptionalText(body.metaTitle, "metaTitle", FIELD_LIMITS.metaTitle);
    if (!metaTitle.ok) return NextResponse.json({ error: metaTitle.error }, { status: 400 });

    const metaDesc = parseOptionalText(body.metaDescription, "metaDescription");
    if (!metaDesc.ok) return NextResponse.json({ error: metaDesc.error }, { status: 400 });

    // ── Faz 3: orijinal Logo stok kodu ──────────────────────────────────────
    // Ham deger AYNEN saklanir (bastaki sifir, tire, ic bosluk korunur);
    // normalize deger yalnizca arama/eslestirme icin ayri kolona yazilir.
    const internalStock = parseInternalStockCode(body.internalStockCode);
    if (!internalStock.ok) {
      return NextResponse.json({ error: internalStock.error }, { status: 400 });
    }

    if (!partNumber?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "partNumber and name are required" }, { status: 400 });
    }

    // Kanonik değer — mevcut davranış korunur (trim + uppercase).
    const canonicalPartNumber = String(partNumber).trim().toUpperCase();
    // Kimlik anahtarı — kanonik değerle AYNI istekte, atomik olarak yazılır.
    const normalized = normalizePartNumber(canonicalPartNumber);

    if (!normalized) {
      return NextResponse.json(
        { error: "Part number must contain at least one letter or digit." },
        { status: 400 }
      );
    }

    const cond = validateCondition(condition);
    if (!cond.ok) return NextResponse.json({ error: cond.error }, { status: 400 });

    const w = validateWeight(weight);
    if (!w.ok) return NextResponse.json({ error: w.error }, { status: 400 });

    // Kimlik çakışması normalize değere göre belirlenir:
    // "CH 76281", "CH-76281" ve "ch76281" AYNI üründür.
    // (Bu ön kontrol kullanıcıya net mesaj vermek içindir; yarış koşullarına
    //  karşı nihai garanti uq_products_pn_norm index'idir — aşağıdaki catch.)
    const [clash] = await db
      .select({ partNumber: products.partNumber })
      .from(products)
      .where(eq(products.partNumberNormalized, normalized))
      .limit(1);

    if (clash) {
      return NextResponse.json({ error: duplicateMessage(clash.partNumber) }, { status: 409 });
    }

    const [product] = await db
      .insert(products)
      .values({
        partNumber: canonicalPartNumber,
        partNumberNormalized: normalized,
        name: name.trim(),
        description: description?.trim() || null,
        condition: cond.value,
        categoryId: kategori.value,
        weight: w.value,
        notes: notes?.trim() || null,
        // PARCANIN KENDI ureticisi — uyumlu makine markasindan BAGIMSIZ.
        partManufacturer: partMfr.value,
        sourcingType: sourcing.value,
        stockStatus: stock.value,
        // Stok durumu acikca verildiyse zaman damgasi yazilir; 'unknown' bir
        // insan karari degildir, damgalanmaz.
        stockStatusUpdatedAt: stock.value === "unknown" ? null : new Date(),
        shortDescription: shortDesc.value,
        longDescription: longDesc.value,
        metaTitle: metaTitle.value,
        metaDescription: metaDesc.value,
        // Logo stok kodu: iç kullanım. OEM/muadil iddiası DEĞİLDİR ve public
        // yüzeyde gösterilmez. Mükerrer stok kodu kayıt oluşturmayı ENGELLEMEZ
        // — benzersiz kısıt bilinçli olarak yok (drizzle/0010).
        internalStockCode: internalStock.value?.code ?? null,
        internalStockCodeNormalized: internalStock.value?.normalized ?? null,
      })
      .returning(PRODUCT_COLUMNS_V3);

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err: unknown) {
    if (isPartNumberConflict(err)) {
      return NextResponse.json({ error: duplicateMessage() }, { status: 409 });
    }
    console.error("[POST /api/admin/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
