import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { oemNumbers, partNumberTypeEnum, products } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { normalizePartNumber } from "@/lib/part-number";
import { OEM_NUMBER_COLUMNS_V2 } from "@/lib/db/columns";
import { checkIdentifierCell } from "@/lib/import-validation";
import { parseVerificationSource, parseVerifiedFlag } from "@/lib/verification";
import { isUniqueViolation } from "@/lib/db/errors";

/**
 * OEM / çapraz referans numaraları — YÖNETİM YOLU.
 *
 * Denetim E-8: `oem_numbers` tablosuna yazan hiçbir kod yolu yoktu; tablo
 * şemada ve migration'larda vardı ama yalnızca okunuyordu. Bu rota o boşluğu
 * kapatır.
 *
 * İKİ KURAL:
 *   1. `number_normalized` NOT NULL'dur ve AYNI istekte, `part_number.ts`'teki
 *      kuralla üretilir. Normalize yazmayı atlayan bir INSERT şema tarafından
 *      reddedilir (drizzle/0007 gerekçesi).
 *   2. `verified = true` için KAYNAK ZORUNLUDUR. Dayanağı belirtilmeden bir
 *      numara OEM/muadil olarak kesin bilgi hâline getirilemez.
 */

type Params = { params: Promise<{ id: string }> };

const NUMBER_TYPES = partNumberTypeEnum.enumValues;
type NumberType = (typeof NUMBER_TYPES)[number];

function parseNumberType(
  value: unknown
): { ok: true; value: NumberType } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: "oem" };
  }
  if (typeof value === "string" && (NUMBER_TYPES as readonly string[]).includes(value)) {
    return { ok: true, value: value as NumberType };
  }
  return {
    ok: false,
    error: `Geçersiz type: "${String(value)}". Kullanılabilir: ${NUMBER_TYPES.join(" · ")}.`,
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  const rows = await db
    .select(OEM_NUMBER_COLUMNS_V2)
    .from(oemNumbers)
    .where(eq(oemNumbers.productId, id))
    .orderBy(asc(oemNumbers.type), asc(oemNumbers.oemNumber));

  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Geçersiz gövde." }, { status: 400 });

  // Ürün gerçekten var mı? (FK hatası yerine net mesaj.)
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!product) return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });

  // Kimlik bütünlüğü — boş / alfanümerik olmayan / bilimsel gösterim reddedilir.
  const identityIssue = checkIdentifierCell({
    value: typeof body.oemNumber === "string" ? body.oemNumber : "",
    wasTypedCell: false,
    columnLabel: "oemNumber",
  });
  if (identityIssue) {
    return NextResponse.json({ error: identityIssue.message }, { status: 400 });
  }

  const canonical = String(body.oemNumber).trim().toUpperCase();
  const normalized = normalizePartNumber(canonical);

  const type = parseNumberType(body.type);
  if (!type.ok) return NextResponse.json({ error: type.error }, { status: 400 });

  const verified = parseVerifiedFlag(body.verified ?? false);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });

  const source = parseVerificationSource(body.source, verified.value);
  if (!source.ok) return NextResponse.json({ error: source.error }, { status: 400 });

  const manufacturer =
    typeof body.manufacturer === "string" ? body.manufacturer.trim() || null : null;
  const note = typeof body.note === "string" ? body.note.trim() || null : null;

  try {
    const [row] = await db
      .insert(oemNumbers)
      .values({
        productId: id,
        oemNumber: canonical,
        // NOT NULL — kanonik degerle AYNI istekte, atomik yazilir.
        numberNormalized: normalized,
        type: type.value,
        manufacturer,
        note,
        verified: verified.value,
        verifiedAt: verified.value ? new Date() : null,
        source: source.value,
      })
      .returning(OEM_NUMBER_COLUMNS_V2);

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err: unknown) {
    // Constraint adi `cause` zincirinde durur, mesajda DEGIL (src/lib/db/errors.ts).
    if (isUniqueViolation(err, ["uq_oem_product_number_type"])) {
      return NextResponse.json(
        {
          error:
            `"${canonical}" numarası bu ürün için "${type.value}" tipinde zaten kayıtlı. ` +
            `Boşluk ve noktalama karşılaştırmada yok sayılır.`,
        },
        { status: 409 }
      );
    }
    console.error("[POST oem-numbers]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
