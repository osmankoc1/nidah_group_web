/** 7 O-ring kaydinin makine ve cizim haritasi — SALT OKUNUR. */
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
const OR = ["60463-00400","C5563-70144","C5563-70280","N3150-02800","N3153-05500","N3153-06500","N3153-13000"];
for (const pn of OR) {
  const [p] = await sql`SELECT id, part_number, length(btrim(coalesce(long_description,'')))::int AS uz FROM products WHERE part_number = ${pn}`;
  const m = await sql`
    SELECT mf.name AS uretici, mc.model, f.verified
    FROM fitments f JOIN machines mc ON mc.id = f.machine_id
    LEFT JOIN manufacturers mf ON mf.id = mc.manufacturer_id
    WHERE f.product_id = ${p.id} ORDER BY mc.model`;
  console.log(String(pn).padEnd(14) + "| aciklama " + String(p.uz).padStart(3) + " kar | " +
    m.map((x) => `${x.uretici ?? "?"} ${x.model}${x.verified ? "+" : "-"}`).join(" , "));
}
