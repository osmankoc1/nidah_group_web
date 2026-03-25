import { NextRequest, NextResponse } from "next/server";
import { buildXlsxTemplate } from "@/lib/import-xlsx";

type Params = { params: Promise<{ type: string }> };

const TEMPLATES: Record<string, { filename: string; spec: Parameters<typeof buildXlsxTemplate>[0] }> = {
  products: {
    filename: "urun_sablon.xlsx",
    spec: {
      sheetName: "Ürünler",
      headers:   ["partNumber", "name", "description", "condition", "inStock", "weight", "category", "notes"],
      examples: [
        {
          partNumber:  "VOE11709035",
          name:        "Hidrolik Pompa",
          description: "Volvo EC380 için hidrolik pompa",
          condition:   "new",
          inStock:     "true",
          weight:      "12.5",
          category:    "",
          notes:       "",
        },
        {
          partNumber:  "KOM708-1W",
          name:        "Silindir Contası",
          description: "PC360 için silindir contası",
          condition:   "new",
          inStock:     "false",
          weight:      "0.8",
          category:    "",
          notes:       "Sipariş üzerine temin",
        },
        {
          partNumber:  "CAT1R-0749",
          name:        "Yağ Filtresi",
          description: "",
          condition:   "new",
          inStock:     "true",
          weight:      "0.5",
          category:    "",
          notes:       "",
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
      headers:   ["partNumber", "manufacturer", "model", "type", "variantName", "notes"],
      examples: [
        {
          partNumber:   "VOE11709035",
          manufacturer: "VOLVO",
          model:        "G720",
          type:         "GREYDER",
          variantName:  "",
          notes:        "",
        },
        {
          partNumber:   "VOE11709035",
          manufacturer: "VOLVO",
          model:        "G720",
          type:         "GREYDER",
          variantName:  "G720B",
          notes:        "Seri: 10000-20000",
        },
        {
          partNumber:   "KOM708-1W",
          manufacturer: "KOMATSU",
          model:        "PC360",
          type:         "EKSKAVATÖR",
          variantName:  "",
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
