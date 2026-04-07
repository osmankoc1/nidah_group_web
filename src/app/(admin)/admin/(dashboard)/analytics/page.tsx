"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, TrendingUp, TrendingDown, Eye, Globe2,
  Loader2, RefreshCw, Activity, BarChart3, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Metric { current: number; previous: number; pct: number }
interface Summary {
  users7d: Metric; sessions7d: Metric;
  users30d: Metric; pageviews30d: Metric;
}
interface Channel  { channel: string; users: number; sessions: number }
interface Page     { page: string; pageviews: number; users: number }
interface Country  { country: string; users: number }
interface DayPoint { date: string; users: number }
interface AnalyticsData {
  summary: Summary;
  channels: Channel[];
  topPages: Page[];
  countries: Country[];
  dailyUsers: DayPoint[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("tr-TR");

function Trend({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs text-gray-400">—</span>;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

function MetricCard({ label, value, pct, sub, icon: Icon, accent }: {
  label: string; value: number; pct: number; sub: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="size-4" />
        </div>
        <Trend pct={pct} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{fmt(value)}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

// ── Sparkline (SVG) ───────────────────────────────────────────────────────────
function Sparkline({ data }: { data: DayPoint[] }) {
  if (!data.length) return null;
  const W = 900; const H = 120; const PAD = 10;
  const max   = Math.max(...data.map(d => d.users), 1);
  const pts   = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - d.users / max) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const area  = `M${pts[0]} L${pts.join(" L")} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`;
  const line  = `M${pts.join(" L")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-28">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F59E0B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color = "bg-nidah-yellow" }: {
  label: string; value: number; max: number; color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs text-gray-600 truncate shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs font-semibold text-gray-700 w-14 text-right">{fmt(value)}</div>
    </div>
  );
}

// ── Channel name translator ───────────────────────────────────────────────────
const CHANNEL_TR: Record<string, string> = {
  "Organic Search":  "Organik Arama",
  "Direct":          "Direkt",
  "Organic Social":  "Organik Sosyal",
  "Referral":        "Referral",
  "Paid Search":     "Ücretli Arama",
  "Email":           "E-posta",
  "Unassigned":      "Diğer",
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data,       setData]       = useState<AnalyticsData | null>(null);
  const [realtime,   setRealtime]   = useState<number | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Hata");
      setData(json);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veri alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRealtime = useCallback(async () => {
    try {
      const res  = await fetch("/api/admin/analytics?type=realtime");
      const json = await res.json();
      setRealtime(json.activeUsers ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: refresh every 30s
  useEffect(() => {
    fetchRealtime();
    const id = setInterval(fetchRealtime, 30_000);
    return () => clearInterval(id);
  }, [fetchRealtime]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <Loader2 className="size-6 animate-spin" />
      <span>Analytics yükleniyor…</span>
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-red-700 text-sm">
      <strong>Hata:</strong> {error}
      <p className="mt-1 text-xs text-red-500">GA4_PROPERTY_ID, GA4_CLIENT_EMAIL ve GA4_PRIVATE_KEY değişkenlerini kontrol edin.</p>
    </div>
  );

  if (!data) return null;

  const { summary, channels, topPages, countries, dailyUsers } = data;
  const maxChannel = Math.max(...channels.map(c => c.users), 1);
  const maxCountry = Math.max(...countries.map(c => c.users), 1);
  const maxPage    = Math.max(...topPages.map(p => p.pageviews), 1);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {lastUpdate ? `Son güncelleme: ${lastUpdate.toLocaleTimeString("tr-TR")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Realtime badge */}
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-green-500" />
            </span>
            <span className="text-xs font-semibold text-green-700">
              {realtime !== null ? `${realtime} aktif` : "—"}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="size-4 mr-1" />
            Yenile
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Kullanıcı (7 gün)"   value={summary.users7d.current}     pct={summary.users7d.pct}     sub="önceki 7 gün ile"   icon={Users}     accent="bg-amber-50 text-amber-600" />
        <MetricCard label="Oturum (7 gün)"       value={summary.sessions7d.current}  pct={summary.sessions7d.pct}  sub="önceki 7 gün ile"   icon={Activity}  accent="bg-blue-50 text-blue-600"   />
        <MetricCard label="Kullanıcı (30 gün)"   value={summary.users30d.current}    pct={summary.users30d.pct}    sub="önceki 30 gün ile"  icon={TrendingUp} accent="bg-green-50 text-green-600" />
        <MetricCard label="Sayfa Görüntüleme"    value={summary.pageviews30d.current} pct={summary.pageviews30d.pct} sub="son 30 gün"        icon={Eye}       accent="bg-purple-50 text-purple-600" />
      </div>

      {/* Daily sparkline */}
      {dailyUsers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="size-4 text-nidah-yellow-dark" />
                Günlük Kullanıcılar — Son 30 Gün
              </h2>
            </div>
            <span className="text-xs text-gray-400">
              Toplam: {fmt(dailyUsers.reduce((s, d) => s + d.users, 0))}
            </span>
          </div>
          <Sparkline data={dailyUsers} />
          <div className="flex justify-between text-[10px] text-gray-300 mt-1 px-0.5">
            <span>{dailyUsers[0]?.date?.replace(/(\d{4})(\d{2})(\d{2})/, "$3.$2")}</span>
            <span>{dailyUsers.at(-1)?.date?.replace(/(\d{4})(\d{2})(\d{2})/, "$3.$2")}</span>
          </div>
        </div>
      )}

      {/* Channels + Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Channels */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Globe2 className="size-4 text-blue-500" />
            Trafik Kaynakları — Son 30 Gün
          </h2>
          <div className="space-y-3">
            {channels.map(c => (
              <HBar
                key={c.channel}
                label={CHANNEL_TR[c.channel] ?? c.channel}
                value={c.users}
                max={maxChannel}
                color="bg-blue-400"
              />
            ))}
          </div>
        </div>

        {/* Countries */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Globe2 className="size-4 text-nidah-yellow-dark" />
            Ülkelere Göre Kullanıcılar
          </h2>
          <div className="space-y-3">
            {countries.map(c => (
              <HBar key={c.country} label={c.country} value={c.users} max={maxCountry} />
            ))}
          </div>
        </div>
      </div>

      {/* Top pages */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="size-4 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-800">En Çok Görüntülenen Sayfalar — Son 30 Gün</h2>
        </div>
        <div className="divide-y">
          {topPages.map((p, i) => (
            <div key={p.page} className="px-5 py-3 flex items-center gap-4">
              <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-mono text-gray-700 truncate block">{p.page}</span>
                <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5">
                  <div className="bg-purple-400 h-1 rounded-full" style={{ width: `${Math.round((p.pageviews / maxPage) * 100)}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-gray-800">{fmt(p.pageviews)}</div>
                <div className="text-xs text-gray-400">{fmt(p.users)} kişi</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
