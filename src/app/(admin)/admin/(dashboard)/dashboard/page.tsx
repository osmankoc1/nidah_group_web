import Link from "next/link";
import { db } from "@/lib/db";
import { rfqSubmissions } from "@/lib/db/schema";
import { count, desc, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TrendingUp, Clock, AlertCircle, ArrowRight } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface StatsData {
  total: number;
  today: number;
  last30Days: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byBrand: { brand: string; count: number }[];
  recent: {
    id: string;
    fullName: string;
    company: string | null;
    partNumber: string | null;
    brand: string | null;
    status: string;
    priority: string;
    createdAt: Date;
  }[];
}

// ── Status / priority display config ────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-800" },
  contacted: { label: "İletişime Geçildi", className: "bg-blue-100 text-blue-800" },
  quoted: { label: "Teklif Verildi", className: "bg-purple-100 text-purple-800" },
  closed: { label: "Kapandı", className: "bg-green-100 text-green-800" },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Düşük", className: "bg-gray-100 text-gray-600" },
  normal: { label: "Normal", className: "bg-gray-100 text-gray-700" },
  high: { label: "Yüksek", className: "bg-orange-100 text-orange-800" },
  urgent: { label: "Acil", className: "bg-red-100 text-red-800" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? { label: priority, className: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Data fetch ───────────────────────────────────────────────────────────────

async function fetchStats(): Promise<StatsData> {
  const [
    [totalResult],
    statusBreakdown,
    priorityBreakdown,
    brandBreakdown,
    recentSubmissions,
    [last30Result],
    [todayResult],
  ] = await Promise.all([
    db!.select({ total: count() }).from(rfqSubmissions),

    db!
      .select({ status: rfqSubmissions.status, count: count() })
      .from(rfqSubmissions)
      .groupBy(rfqSubmissions.status),

    db!
      .select({ priority: rfqSubmissions.priority, count: count() })
      .from(rfqSubmissions)
      .groupBy(rfqSubmissions.priority),

    db!
      .select({ brand: rfqSubmissions.brand, count: count() })
      .from(rfqSubmissions)
      .groupBy(rfqSubmissions.brand)
      .orderBy(desc(count()))
      .limit(8),

    db!
      .select({
        id: rfqSubmissions.id,
        fullName: rfqSubmissions.fullName,
        company: rfqSubmissions.company,
        partNumber: rfqSubmissions.partNumber,
        brand: rfqSubmissions.brand,
        status: rfqSubmissions.status,
        priority: rfqSubmissions.priority,
        createdAt: rfqSubmissions.createdAt,
      })
      .from(rfqSubmissions)
      .orderBy(desc(rfqSubmissions.createdAt))
      .limit(5),

    db!
      .select({ total: count() })
      .from(rfqSubmissions)
      .where(sql`${rfqSubmissions.createdAt} >= now() - interval '30 days'`),

    db!
      .select({ total: count() })
      .from(rfqSubmissions)
      .where(sql`${rfqSubmissions.createdAt} >= current_date`),
  ]);

  const defaultStatus = { pending: 0, contacted: 0, quoted: 0, closed: 0 };
  const byStatus = { ...defaultStatus };
  for (const row of statusBreakdown) {
    byStatus[row.status as keyof typeof byStatus] = row.count;
  }

  return {
    total: totalResult.total,
    today: todayResult.total,
    last30Days: last30Result.total,
    byStatus,
    byPriority: Object.fromEntries(
      priorityBreakdown.map((r) => [r.priority, r.count])
    ),
    byBrand: brandBreakdown.map((r) => ({
      brand: r.brand ?? "Belirtilmemiş",
      count: r.count,
    })),
    recent: recentSubmissions,
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  if (!db) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="mb-4 size-10 text-red-400" />
        <h2 className="text-lg font-semibold text-gray-800">
          Veritabanı Bağlantısı Yok
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          <code className="rounded bg-gray-100 px-1">DATABASE_URL</code>{" "}
          değişkenini <code className="rounded bg-gray-100 px-1">.env.local</code>{" "}
          dosyasına ekleyin.
        </p>
      </div>
    );
  }

  let stats: StatsData;
  try {
    stats = await fetchStats();
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="mb-4 size-10 text-red-400" />
        <h2 className="text-lg font-semibold text-gray-800">
          İstatistikler Yüklenemedi
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Veritabanı bağlantısını kontrol edin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Teklif talepleri genel bakış
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Toplam Teklif
            </CardTitle>
            <FileText className="size-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Bugün
            </CardTitle>
            <Clock className="size-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.today}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Son 30 Gün
            </CardTitle>
            <TrendingUp className="size-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">
              {stats.last30Days}
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">
              Bekleyen
            </CardTitle>
            <AlertCircle className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-800">
              {stats.byStatus.pending ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status + Priority breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Duruma Göre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const val = stats.byStatus[status] ?? 0;
              const pct = stats.total > 0 ? Math.round((val / stats.total) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-36 text-sm text-gray-600">
                    {cfg.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#F59E0B]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium text-gray-700">
                    {val}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Markalar</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byBrand.length === 0 ? (
              <p className="text-sm text-gray-400">Henüz veri yok.</p>
            ) : (
              <ol className="space-y-2">
                {stats.byBrand.map((item, i) => (
                  <li key={item.brand} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-700">
                      {item.brand}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent submissions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Son Talepler</CardTitle>
          <Link
            href="/admin/rfq"
            className="flex items-center gap-1 text-sm text-[#F59E0B] hover:underline"
          >
            Tümünü gör
            <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-gray-400">Henüz teklif talebi yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-gray-400">
                    <th className="pb-2 pr-4">Kişi</th>
                    <th className="pb-2 pr-4">Parça / Marka</th>
                    <th className="pb-2 pr-4">Durum</th>
                    <th className="pb-2 pr-4">Öncelik</th>
                    <th className="pb-2">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recent.map((rfq) => (
                    <tr key={rfq.id} className="py-2">
                      <td className="py-2 pr-4">
                        <p className="font-medium text-gray-900">
                          {rfq.fullName}
                        </p>
                        {rfq.company && (
                          <p className="text-xs text-gray-400">{rfq.company}</p>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <p className="font-mono text-xs text-gray-700">
                          {rfq.partNumber ?? "—"}
                        </p>
                        {rfq.brand && (
                          <p className="text-xs text-gray-400">{rfq.brand}</p>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={rfq.status} />
                      </td>
                      <td className="py-2 pr-4">
                        <PriorityBadge priority={rfq.priority} />
                      </td>
                      <td className="py-2 text-xs text-gray-400">
                        {new Date(rfq.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
