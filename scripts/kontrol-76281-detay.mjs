/** 76281 / 90898 — gorsel ve uyumluluk detayi. SALT OKUNUR. */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
function baglanti(d, a) {
  for (const s of readFileSync(join(homedir(), ".osko", d), "utf-8").split(/\r?\n/)) {
    const i = s.indexOf("=");
    if (i > 0 && s.slice(0, i).trim() === a) return s.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("yok");
}
const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));
const ik = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='product_images' ORDER BY ordinal_position`;
console.log("product_images: " + ik.map((x) => x.column_name).join(", "));
const fk = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='fitments' ORDER BY ordinal_position`;
console.log("fitments: " + fk.map((x) => x.column_name).join(", "));
for (const pn of ["76281", "90898"]) {
  const p = await sql`SELECT id, part_number, name, category_id, notes, internal_stock_code, in_stock, condition, weight, description FROM products WHERE part_number = ${pn}`;
  const x = p[0];
  console.log("\n### " + pn + " | kategori=" + x.category_id + " | stokKodu=" + x.internal_stock_code + " | durum=" + x.condition + " | inStock=" + x.in_stock);
  console.log("    notes=" + JSON.stringify(x.notes) + " | description=" + JSON.stringify(x.description) + " | weight=" + x.weight);
  const g = await sql`SELECT id, cloudinary_url AS url, alt_text, verified, is_primary, source_note, created_at FROM product_images WHERE product_id = ${x.id}`;
  for (const i of g) console.log("    GORSEL verified=" + i.verified + " primary=" + i.is_primary + " alt=" + JSON.stringify(i.alt_text) + "\n      url=" + i.url);
  const f = await sql`SELECT f.verified, f.notes, m.model, mf.name AS marka FROM fitments f
    JOIN machines m ON m.id = f.machine_id JOIN manufacturers mf ON mf.id = m.manufacturer_id
    WHERE f.product_id = ${x.id}`;
  for (const i of f) console.log("    UYUM verified=" + i.verified + " | " + i.marka + " " + i.model + " | notes=" + JSON.stringify(i.notes));
  if (x.category_id) {
    const c = await sql`SELECT name, slug FROM categories WHERE id = ${x.category_id}`;
    console.log("    KATEGORI: " + JSON.stringify(c[0]));
  }
}
