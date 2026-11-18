import { NextRequest, NextResponse } from "next/server";
import { buildXlsxTemplate } from "@/lib/import-xlsx";

type Params = { params: Promise<{ type: string }> };

const TEMPLATES: Record<string, { filename: string; spec: Parameters<typeof buildXlsxTemplate>[0] }> = {
  products: {
    filename: "urun_sablon.xlsx",
    spec: {
      sheetName: "Ürünler",
      // NOT: `seoReady` ve `verified` BILINCLI OLARAK sablonda YOK — yayin
      // onayi ve dogrulama toplu import ile verilemez (import-validation.ts).
      headers:   ["partNumber", "name", "description", "condition", "stockStatus",
                  "partManufacturer", "sourcingType", "shortDescription", "longDescription",
                  "metaTitle", "metaDescription", "inStock", "weight", "category", "notes",
                  // Faz 3 — orijinal Logo stok kodu. IC KULLANIM, public yuzeye cikmaz.
                  "internalStockCode"],
      examples: [
        {
          partNumber:  "VOE11709035",
          stockStatus:      "in_stock",
          partManufacturer: "ORNEK URETICI",
          sourcingType:     "oem_equivalent",
          shortDescription: "Kisa, benzersiz tanitim metni (en fazla 500 karakter).",
          longDescription:  "Uzun, benzersiz govde metni. Yayin onayi icin en az 300 karakter onerilir.",
          metaTitle:        "",
          metaDescription:  "",
          name:        "Hidrolik Pompa",
          description: "Volvo EC380 için hidrolik pompa",
          condition:   "new",
          inStock:     "true",
          weight:      "12.5",
          category:    "",
          notes:       "",
          internalStockCode: "NDG15189",
        },
        {
          partNumber:  "KOM708-1W",
          // `on_request` de kabul edilir; veritabanindaki deger `on_order`.
          stockStatus:      "on_request",
          partManufacturer: "",
          sourcingType:     "",
          shortDescription: "",
          longDescription:  "",
          metaTitle:        "",
          metaDescription:  "",
          name:        "Silindir Contası",
          description: "PC360 için silindir contası",
          condition:   "new",
          inStock:     "false",
          weight:      "0.8",
          category:    "",
          notes:       "Sipariş üzerine temin",
          // Bastaki sifirlar ve ic bosluklar AYNEN korunur.
          internalStockCode: "002 236 11 10",
        },
        {
          partNumber:  "CAT1R-0749",
          // Bos birakilirsa "unknown" olur — teyitsiz stok iddia edilmez.
          stockStatus:      "",
          partManufacturer: "",
          sourcingType:     "",
          shortDescription: "",
          longDescription:  "",
          metaTitle:        "",
          metaDescription:  "",
          name:        "Yağ Filtresi",
          description: "",
          condition:   "new",
          inStock:     "true",
          weight:      "0.5",
          category:    "",
          notes:       "",
          // Bos birakilabilir — stok kodu zorunlu degildir.
          internalStockCode: "",
        },
      ],
    },
  },

  machines: {
    filename: "makina_sablon.xlsx",
    spec: {
      sheetName: "Makineler",
      headers:   ["manufacturer", "model", "type", "yearFrom", "yearTo", "variantName", "engineModel", "serialFrom", "serialTo"],
      examples: [
        {
          manufacturer: "VOLVO",
          model:        "G720",
          type:         "GREYDER",
          yearFrom:     "1995",
          yearTo:       "2005",
          variantName:  "",
          engineModel:  "",
          serialFrom:   "",
          serialTo:     "",
        },
        {
          manufacturer: "VOLVO",
          model:        "G720",
          type:         "GREYDER",
          yearFrom:     "1995",
          yearTo:       "2005",
          variantName:  "G720B",
          engineModel:  "D6D",
          serialFrom:   "10000",
          serialTo:     "20000",
        },
        {
          manufacturer: "KOMATSU",
          model:        "PC360",
          type:         "EKSKAVATÖR",
          yearFrom:     "2010",
          yearTo:       "",
          variantName:  "",
          engineModel:  "",
          serialFrom:   "",
          serialTo:     "",
        },
        {
          manufacturer: "CAT",
          model:        "320",
          type:         "EKSKAVATÖR",
          yearFrom:     "2005",
          yearTo:       "2020",
          variantName:  "320D",
          engineModel:  "C6.4",
          serialFrom:   "",
          serialTo:     "",
        },
      ],
    },
  },

  fitments: {
    filename: "uyumluluk_sablon.xlsx",
    spec: {
      sheetName: "Uyumluluk",
      headers:   ["partNumber", "manufacturer", "model", "type", "variantName", "verified", "source", "notes"],
      examples: [
        {
          partNumber:   "VOE11709035",
          manufacturer: "VOLVO",
          model:        "G720",
          type:         "GREYDER",
          variantName:  "",
          // "true" yazilirsa KAYNAK ZORUNLUDUR.
          verified:     "true",
          source:       "Uretici katalogu 2024",
          notes:        "",
        },
        {
          partNumber:   "VOE11709035",
          manufacturer: "VOLVO",
          model:        "G720",
          type:         "GREYDER",
          variantName:  "G720B",
          verified:     "false",
          source:       "Tedarikci listesi (teyit bekliyor)",
          notes:        "Seri: 10000-20000",
        },
        {
          partNumber:   "KOM708-1W",
          manufacturer: "KOMATSU",
          model:        "PC360",
          type:         "EKSKAVATÖR",
          variantName:  "",
          verified:     "",
          source:       "",
          notes:        "",
        },
      ],
    },
  },
};

export async function GET(_req: NextRequest, { params }: Params) {
  const { type } = await params;
  const tpl = TEMPLATES[type];
  if (!tpl) {
    return NextResponse.json({ error: "Unknown template type" }, { status: 404 });
  }

  const buf = buildXlsxTemplate(tpl.spec);

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${tpl.filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
