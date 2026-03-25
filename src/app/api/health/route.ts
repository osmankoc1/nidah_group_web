import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error" | "unconfigured"> = {};
  let overallOk = true;

  // DB check
  if (!db) {
    checks.database = "unconfigured";
  } else {
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = "ok";
    } catch {
      checks.database = "error";
      overallOk = false;
    }
  }

  // Prosis connector check (optional — only if configured)
  const prosisUrl = process.env.PROSIS_CONNECTOR_URL;
  if (prosisUrl) {
    try {
      const res = await fetch(`${prosisUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      checks.prosis = res.ok ? "ok" : "error";
    } catch {
      checks.prosis = "error";
      // Prosis is optional — don't fail overall health
    }
  }

  const status = overallOk ? 200 : 503;

  return NextResponse.json(
    {
      status: overallOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
      checks,
    },
    { status }
  );
}
