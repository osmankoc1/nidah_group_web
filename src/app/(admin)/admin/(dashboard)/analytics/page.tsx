"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Users, TrendingUp, TrendingDown, Eye, Globe2, Loader2,
  RefreshCw, Activity, BarChart3, FileText, Smartphone,
  Monitor, Tablet, Clock, Download, MousePointerClick,
  UserCheck, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Metric    { current: number; previous: number; pct: number }
interface FltMetric { current: number; previous: number; pct: number }
interface Summary {
  users7d: Metric; sessions7d: Metric; newUsers7d: Metric;
  engRate7d: FltMetric; avgDuration7d: FltMetric;
  users30d: Metric; sessions30d: Metric; pageviews30d: Metric;
  newUsers30d: Metric; engRate30d: FltMetric; avgDuration30d: FltMetric;
}
interface Channel     { channel: string; users: number; sessions: number; pageviews: number }
interface Page        { page: string; pageviews: number; users: number; avgDuration: number; engRate: number }
interface Country     { country: string; users: number; sessions: number; pageviews: number }
interface DayPoint    { date: string; users: number; newUsers: number; sessions: number }
interface Device      { device: string; users: number; sessions: number }
interface Browser     { browser: string; users: number; sessions: number }
interface HourPoint   { hour: number; users: number; sessions: number }
interface LandingPage { page: string; sessions: number; users: number; bounceRate: number }
interface RealtimePage { page: string; users: number }
interface AnalyticsData {
  summary: Summary; channels: Channel[]; topPages: Page[];
  countries: Country[]; dailyUsers: DayPoint[]; devices: Device[];
  browsers: Browser[]; hourlyToday: HourPoint[]; landingPages: LandingPage[];
}

// ── Country name → ISO2 flag ──────────────────────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  "Turkey": "tr", "United States": "us", "United Arab Emirates": "ae",
  "Germany": "de", "United Kingdom": "gb", "France": "fr", "Italy": "it",
  "Netherlands": "nl", "Spain": "es", "Russia": "ru", "Kazakhstan": "kz",
  "Uzbekistan": "uz", "Saudi Arabia": "sa", "Iraq": "iq", "Kuwait": "kw",
  "Qatar": "qa", "Bahrain": "bh", "Oman": "om", "Jordan": "jo",
  "Lebanon": "lb", "Egypt": "eg", "South Africa": "za", "Nigeria": "ng",
  "Kenya": "ke", "India": "in", "Pakistan": "pk", "Bangladesh": "bd",
  "Sri Lanka": "lk", "China": "cn", "Japan": "jp", "South Korea": "kr",
  "Canada": "ca", "Mexico": "mx", "Brazil": "br", "Argentina": "ar",
  "Paraguay": "py", "Australia": "au", "New Zealand": "nz",
  "Belgium": "be", "Sweden": "se", "Norway": "no", "Denmark": "dk",
  "Finland": "fi", "Poland": "pl", "Romania": "ro", "Greece": "gr",
  "Bulgaria": "bg", "Ukraine": "ua", "Azerbaijan": "az", "Georgia": "ge",
  "Israel": "il", "Iran": "ir", "Afghanistan": "af", "Indonesia": "id",
  "Malaysia": "my", "Thailand": "th", "Vietnam": "vn", "Philippines": "ph",
  "Singapore": "sg", "Hong Kong": "hk", "Taiwan": "tw",
};

function flagUrl(country: string) {
  const code = COUNTRY_FLAGS[country];
  return code ? `https://flagcdn.com/w20/${code}.png` : null;
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtN   = (n: number) => n.toLocaleString("tr-TR");
const fmtPct = (n: number) => `%${Math.round(n * 100)}`;
const fmtDur = (s: number) => {
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return m > 0 ? `${m}d ${sec}s` : `${sec}s`;
};

// ── Trend badge ───────────────────────────────────────────────────────────────
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

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, pct, sub, icon: Icon, accent, format = "number" }: {
  label: string; value: number; pct: number; sub: string;
  icon: React.ElementType; accent: string;
  format?: "number" | "pct" | "duration";
}) {
  const display = format === "pct" ? fmtPct(value) : format === "duration" ? fmtDur(value) : fmtN(value);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="size-4" />
        </div>
        <Trend pct={pct} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{display}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

// ── SVG Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#F59E0B" }: { data: { v: number }[]; color?: string }) {
  if (!data.length) return null;
  const W = 900; const H = 100; const P = 8;
  const max = Math.max(...data.map(d => d.v), 1);
  const pts = data.map((d, i) => {
    const x = P + (i / Math.max(data.length - 1, 1)) * (W - P * 2);
    const y = P + (1 - d.v / max) * (H - P * 2);
    return `${x},${y}`;
  });
  const fill = `M${pts[0]} L${pts.join(" L")} L${W - P},${H} L${P},${H} Z`;
  const line = `M${pts.join(" L")}`;
  const id   = `grad-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-24">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color = "bg-nidah-yellow", prefix }: {
  label: string; value: number; max: number; color?: string; prefix?: React.ReactNode;
}) {
  const p = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-36 shrink-0">
        {prefix}
        <span className="text-xs text-gray-600 truncate">{label}</span>
      </div>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${p}%` }} />
      </div>
      <div className="text-xs font-semibold text-gray-700 w-12 text-right">{fmtN(value)}</div>
    </div>
  );
}

// ── Channel translations ──────────────────────────────────────────────────────
const CH_TR: Record<string, string> = {
  "Organic Search": "Organik Arama", "Direct": "Direkt",
  "Organic Social": "Organik Sosyal", "Referral": "Referral",
  "Paid Search": "Ücretli Arama", "Email": "E-posta",
  "Unassigned": "Tanımsız", "Organic Video": "Organik Video",
};
const CH_COLOR: Record<string, string> = {
  "Organic Search": "bg-green-400", "Direct": "bg-blue-400",
  "Organic Social": "bg-pink-400",  "Referral": "bg-purple-400",
  "Paid Search": "bg-orange-400",   "Email": "bg-teal-400",
};

// ── Device icon ───────────────────────────────────────────────────────────────
function DeviceIcon({ device }: { device: string }) {
  const d = device.toLowerCase();
  if (d === "mobile")  return <Smartphone className="size-4 text-blue-500"  />;
  if (d === "tablet")  return <Tablet     className="size-4 text-purple-500"/>;
  return                      <Monitor    className="size-4 text-gray-500"  />;
}

const DEVICE_TR: Record<string, string> = { mobile: "Mobil", desktop: "Masaüstü", tablet: "Tablet" };
const DEVICE_COLOR: Record<string, string> = { mobile: "bg-blue-400", desktop: "bg-gray-400", tablet: "bg-purple-400" };

// ── html2canvas only supports rgb/rgba/hsl/hsla ───────────────────────────────
// Tailwind v4 / shadcn use oklch() CSS variables everywhere. When html2canvas
// reads computed styles it can't parse oklch and throws "unsupported color
// function 'lab'". Fix: inject hex overrides into the cloned document via onclone.
const OKLCH_OVERRIDES = `
:root, * {
  --background: #fafafa; --foreground: #0a0a0a;
  --card: #ffffff; --card-foreground: #0a0a0a;
  --popover: #ffffff; --popover-foreground: #0a0a0a;
  --primary: #13284b; --primary-foreground: #fafafa;
  --secondary: #f5f5f5; --secondary-foreground: #171717;
  --muted: #f5f5f5; --muted-foreground: #636363;
  --accent: #edb417; --accent-foreground: #171717;
  --destructive: #e7000b;
  --border: #dedede; --input: #dedede; --ring: #13284b;
  --chart-1: #f54900; --chart-2: #009689;
  --chart-3: #104e64; --chart-4: #ffb900; --chart-5: #fe9a00;
  --sidebar: #fafafa; --sidebar-foreground: #0a0a0a;
  --sidebar-primary: #171717; --sidebar-primary-foreground: #fafafa;
  --sidebar-accent: #f5f5f5; --sidebar-accent-foreground: #171717;
  --sidebar-border: #e5e5e5; --sidebar-ring: #a1a1a1;
}`;

// ── PDF export ────────────────────────────────────────────────────────────────
async function exportToPdf(ref: React.RefObject<HTMLDivElement | null>, title: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");
  if (!ref.current) return;

  const canvas = await html2canvas(ref.current, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#F8FAFC",
    ignoreElements: (el) => (el as HTMLElement).classList?.contains("no-pdf") ?? false,
    onclone: (clonedDoc) => {
      const style = clonedDoc.createElement("style");
      style.textContent = OKLCH_OVERRIDES;
      clonedDoc.head.appendChild(style);
    },
  });

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  // pixels that fit in one A4 landscape page height
  const pageHeightPx = Math.floor(canvas.width * (pdfH / pdfW));
  let srcY = 0;

  while (srcY < canvas.height) {
    const sliceH = Math.min(pageHeightPx, canvas.height - srcY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width  = canvas.width;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) break;
    // copy the correct slice from the full canvas
    ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    const pageImg = pageCanvas.toDataURL("image/png");
    if (srcY > 0) pdf.addPage();
    const imgH = (sliceH / canvas.width) * pdfW;
    pdf.addImage(pageImg, "PNG", 0, 0, pdfW, imgH);
    srcY += sliceH;
  }

  pdf.save(`${title}.pdf`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data,       setData]       = useState<AnalyticsData | null>(null);
  const [realtime,   setRealtime]   = useState<{ activeUsers: number; pages: RealtimePage[] }>({ activeUsers: 0, pages: [] });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tab,        setTab]        = useState<"7d" | "30d">("7d");
  const [exporting,  setExporting]  = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Hata");
      setData(json); setLastUpdate(new Date());
    } catch (e) { setError(e instanceof Error ? e.message : "Veri alınamadı"); }
    finally { setLoading(false); }
  }, []);

  const fetchRealtime = useCallback(async () => {
    try {
      const res  = await fetch("/api/admin/analytics?type=realtime");
      const json = await res.json();
      setRealtime({ activeUsers: json.activeUsers ?? 0, pages: json.pages ?? [] });
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    fetchRealtime();
    const id = setInterval(fetchRealtime, 30_000);
    return () => clearInterval(id);
  }, [fetchRealtime]);

  const handlePdf = async () => {
    setExporting(true);
    try {
      const d = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
      await exportToPdf(printRef, `NidahGroup-Analytics-${d}`);
    } finally { setExporting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <Loader2 className="size-6 animate-spin" />
      <span>Analytics yükleniyor…</span>
    </div>
  );
  if (error) return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-red-700 text-sm">
      <strong>Hata:</strong> {error}
      <p className="mt-1 text-xs text-red-500">GA4 ortam değişkenlerini kontrol edin.</p>
    </div>
  );
  if (!data) return null;

  const { summary, channels, topPages, countries, dailyUsers, devices, browsers, hourlyToday, landingPages } = data;
  const s = summary;

  const maxCh  = Math.max(...channels.map(c => c.users), 1);
  const maxCo  = Math.max(...countries.map(c => c.users), 1);
  const maxPg  = Math.max(...topPages.map(p => p.pageviews), 1);
  const maxBr  = Math.max(...browsers.map(b => b.users), 1);
  const maxHr  = Math.max(...hourlyToday.map(h => h.users), 1);
  const maxLP  = Math.max(...landingPages.map(l => l.sessions), 1);
  const totalDevUsers = devices.reduce((a, d) => a + d.users, 0);

  return (
    <div className="space-y-6" ref={printRef}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {lastUpdate ? `Son güncelleme: ${lastUpdate.toLocaleTimeString("tr-TR")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap no-pdf">
          {/* Realtime badge */}
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-green-500" />
            </span>
            <span className="text-xs font-semibold text-green-700">
              {realtime.activeUsers} aktif kullanıcı
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="size-4 mr-1" />Yenile
          </Button>
          <Button size="sm" className="bg-nidah-dark text-white hover:bg-nidah-navy" onClick={handlePdf} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin mr-1" /> : <Download className="size-4 mr-1" />}
            PDF İndir
          </Button>
        </div>
      </div>

      {/* ── Period tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit no-pdf">
        {(["7d", "30d"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "7d" ? "Son 7 Gün" : "Son 30 Gün"}
          </button>
        ))}
      </div>

      {/* ── Metric cards ── */}
      {tab === "7d" ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard label="Kullanıcı"          value={s.users7d.current}       pct={s.users7d.pct}       sub="önceki 7 gün"   icon={Users}           accent="bg-amber-50 text-amber-600"   />
          <MetricCard label="Oturum"              value={s.sessions7d.current}    pct={s.sessions7d.pct}    sub="önceki 7 gün"   icon={Activity}        accent="bg-blue-50 text-blue-600"     />
          <MetricCard label="Yeni Kullanıcı"      value={s.newUsers7d.current}    pct={s.newUsers7d.pct}    sub="önceki 7 gün"   icon={UserCheck}       accent="bg-green-50 text-green-600"   />
          <MetricCard label="Etkileşim Oranı"     value={s.engRate7d.current}     pct={s.engRate7d.pct}     sub="önceki 7 gün"   icon={MousePointerClick} accent="bg-purple-50 text-purple-600" format="pct" />
          <MetricCard label="Ort. Süre"           value={s.avgDuration7d.current} pct={s.avgDuration7d.pct} sub="önceki 7 gün"   icon={Clock}           accent="bg-rose-50 text-rose-600"     format="duration" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard label="Kullanıcı (30g)"     value={s.users30d.current}       pct={s.users30d.pct}       sub="önceki 30 gün"  icon={Users}           accent="bg-amber-50 text-amber-600"   />
          <MetricCard label="Oturum (30g)"        value={s.sessions30d.current}    pct={s.sessions30d.pct}    sub="önceki 30 gün"  icon={Activity}        accent="bg-blue-50 text-blue-600"     />
          <MetricCard label="Sayfa Görüntüleme"   value={s.pageviews30d.current}   pct={s.pageviews30d.pct}   sub="önceki 30 gün"  icon={Eye}             accent="bg-sky-50 text-sky-600"       />
          <MetricCard label="Yeni Kullanıcı"      value={s.newUsers30d.current}    pct={s.newUsers30d.pct}    sub="önceki 30 gün"  icon={UserCheck}       accent="bg-green-50 text-green-600"   />
          <MetricCard label="Etkileşim Oranı"     value={s.engRate30d.current}     pct={s.engRate30d.pct}     sub="önceki 30 gün"  icon={MousePointerClick} accent="bg-purple-50 text-purple-600" format="pct" />
        </div>
      )}

      {/* ── Daily chart ── */}
      {dailyUsers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="size-4 text-amber-500" />
              Günlük Trafik — Son 30 Gün
            </h2>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block" /> Kullanıcı</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-300 inline-block" /> Yeni</span>
            </div>
          </div>
          <div className="relative">
            <Sparkline data={dailyUsers.map(d => ({ v: d.users }))} color="#F59E0B" />
            <div className="absolute inset-0 pointer-events-none opacity-50">
              <Sparkline data={dailyUsers.map(d => ({ v: d.newUsers }))} color="#93C5FD" />
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-300 mt-1">
            <span>{dailyUsers[0]?.date?.replace(/(\d{4})(\d{2})(\d{2})/, "$3.$2")}</span>
            <span className="text-gray-500 font-medium">Toplam: {fmtN(dailyUsers.reduce((s, d) => s + d.users, 0))} kullanıcı</span>
            <span>{dailyUsers.at(-1)?.date?.replace(/(\d{4})(\d{2})(\d{2})/, "$3.$2")}</span>
          </div>
        </div>
      )}

      {/* ── Realtime aktif sayfalar ── */}
      {realtime.pages.length > 0 && (
        <div className="bg-white rounded-2xl border border-green-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="relative flex size-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full size-2 bg-green-500" /></span>
            Şu An Aktif Sayfalar
          </h2>
          <div className="space-y-2">
            {realtime.pages.map(p => (
              <div key={p.page} className="flex items-center justify-between text-sm">
                <span className="font-mono text-gray-600 truncate">{p.page}</span>
                <span className="font-bold text-green-600 ml-4">{p.users} kişi</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Hourly today ── */}
      {hourlyToday.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Zap className="size-4 text-amber-500" /> Bugünün Saatlik Trafiği
          </h2>
          <div className="flex items-end gap-1 h-20">
            {Array.from({ length: 24 }, (_, h) => {
              const d = hourlyToday.find(x => x.hour === h);
              const v = d?.users ?? 0;
              const hp = maxHr > 0 ? (v / maxHr) * 100 : 0;
              return (
                <div key={h} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {h}:00 — {v}
                  </div>
                  <div
                    className="w-full bg-amber-400 rounded-t-sm transition-all duration-300"
                    style={{ height: `${Math.max(hp, v > 0 ? 4 : 0)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-300 mt-1">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </div>
      )}

      {/* ── Row: Channels + Devices ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Channels */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Globe2 className="size-4 text-blue-500" /> Trafik Kaynakları — 30 Gün
          </h2>
          <div className="space-y-3">
            {channels.map(c => (
              <HBar key={c.channel} label={CH_TR[c.channel] ?? c.channel}
                value={c.users} max={maxCh} color={CH_COLOR[c.channel] ?? "bg-gray-400"} />
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Smartphone className="size-4 text-purple-500" /> Cihaz Dağılımı — 30 Gün
          </h2>
          {/* Donut-style bar */}
          <div className="flex rounded-full overflow-hidden h-4 mb-4">
            {devices.map(d => {
              const p = totalDevUsers > 0 ? (d.users / totalDevUsers) * 100 : 0;
              const color = DEVICE_COLOR[d.device.toLowerCase()] ?? "bg-gray-300";
              return <div key={d.device} className={`${color} transition-all`} style={{ width: `${p}%` }} title={`${DEVICE_TR[d.device.toLowerCase()] ?? d.device}: ${Math.round(p)}%`} />;
            })}
          </div>
          <div className="space-y-3">
            {devices.map(d => {
              const pctVal = totalDevUsers > 0 ? Math.round((d.users / totalDevUsers) * 100) : 0;
              return (
                <div key={d.device} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <DeviceIcon device={d.device} />
                    <span className="text-gray-700">{DEVICE_TR[d.device.toLowerCase()] ?? d.device}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">%{pctVal}</span>
                    <span className="font-semibold text-gray-800">{fmtN(d.users)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row: Countries + Browsers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Countries */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Globe2 className="size-4 text-amber-500" /> Ülkelere Göre Kullanıcılar
          </h2>
          <div className="space-y-2.5">
            {countries.map((c, i) => {
              const flag = flagUrl(c.country);
              return (
                <div key={c.country} className="flex items-center gap-3">
                  <span className="text-xs text-gray-300 w-4 text-right shrink-0">{i + 1}</span>
                  <div className="flex items-center gap-2 w-36 shrink-0">
                    {flag
                      ? <img src={flag} alt={c.country} width={20} height={14} className="rounded-sm object-cover" />
                      : <span className="w-5 h-3.5 bg-gray-100 rounded-sm block" />
                    }
                    <span className="text-xs text-gray-600 truncate">{c.country}</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-amber-400 h-2 rounded-full transition-all" style={{ width: `${Math.round((c.users / maxCo) * 100)}%` }} />
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <div className="text-xs font-bold text-gray-800">{fmtN(c.users)}</div>
                    <div className="text-[10px] text-gray-400">{fmtN(c.sessions)} oturum</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Browsers */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Monitor className="size-4 text-gray-500" /> Tarayıcı Dağılımı — 30 Gün
          </h2>
          <div className="space-y-3">
            {browsers.map(b => (
              <HBar key={b.browser} label={b.browser} value={b.users} max={maxBr} color="bg-gray-400" />
            ))}
          </div>
        </div>
      </div>

      {/* ── Top pages table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Eye className="size-4 text-purple-500" />
          <h2 className="text-sm font-bold text-gray-800">En Çok Görüntülenen Sayfalar — 30 Gün</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">#</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Sayfa</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Görüntüleme</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Kullanıcı</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Ort. Süre</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">Etkileşim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topPages.map((p, i) => (
                <tr key={p.page} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-300 font-bold">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-mono text-xs text-gray-700 truncate max-w-xs">{p.page}</div>
                    <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5">
                      <div className="bg-purple-400 h-1 rounded-full" style={{ width: `${Math.round((p.pageviews / maxPg) * 100)}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-gray-800 text-xs">{fmtN(p.pageviews)}</td>
                  <td className="px-3 py-3 text-right text-gray-500 text-xs">{fmtN(p.users)}</td>
                  <td className="px-3 py-3 text-right text-gray-500 text-xs">{fmtDur(p.avgDuration)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs font-semibold ${p.engRate > 0.6 ? "text-green-600" : p.engRate > 0.3 ? "text-amber-600" : "text-red-500"}`}>
                      {fmtPct(p.engRate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Landing pages table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="size-4 text-teal-500" />
          <h2 className="text-sm font-bold text-gray-800">Giriş Sayfaları (Landing Pages) — 30 Gün</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">#</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Sayfa</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Oturum</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Kullanıcı</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">Hemen Çıkma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {landingPages.map((p, i) => (
                <tr key={p.page} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-xs text-gray-300 font-bold">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-mono text-xs text-gray-700 truncate max-w-xs">{p.page}</div>
                    <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5">
                      <div className="bg-teal-400 h-1 rounded-full" style={{ width: `${Math.round((p.sessions / maxLP) * 100)}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-gray-800 text-xs">{fmtN(p.sessions)}</td>
                  <td className="px-3 py-3 text-right text-gray-500 text-xs">{fmtN(p.users)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs font-semibold ${p.bounceRate < 0.3 ? "text-green-600" : p.bounceRate < 0.6 ? "text-amber-600" : "text-red-500"}`}>
                      {fmtPct(p.bounceRate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="text-center text-xs text-gray-300 pb-4">
        NİDAH GROUP Analytics — {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
      </div>
    </div>
  );
}
