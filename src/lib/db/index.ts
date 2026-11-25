import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

/**
 * `DB_QUERY_LOG=1` → her SQL sorgusu sunucu loguna yazılır.
 *
 * Önbellek çalışmalarını ÖLÇMEK için eklendi (2026-11-24, bulgu B1): bir
 * sayfanın isteğinin veritabanına gerçekten inip inmediği ancak sorgu
 * sayılarak kanıtlanabilir. Üretimde AÇILMAZ — sorgu metinleri log hacmini
 * şişirir. Varsayılan kapalı, davranış değişmez.
 */
const sorguLoglama = process.env.DB_QUERY_LOG === "1";

export const db = sql ? drizzle(sql, { schema, logger: sorguLoglama }) : null;
