"use client";

import { useState, useRef, useCallback, memo } from "react";
import {
  Upload, Download, Loader2, CheckCircle, XCircle,
  AlertCircle, RefreshCw, FileSpreadsheet, Package,
  Cpu, Link2, Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RowResult {
  row:    number;
  // products
  partNumber?: string;
  name?:       string;
  // machines
  label?:  string;
  detail?: string;
  // fitments
  machine?: string;
  // shared
  action:  "insert" | "update" | "skip" | "error";
  reason?: string;
}

interface ImportSummary {
  total:  number;
  insert: number;
  update: number;
  skip:   number;
  error:  number;
  dryRun: boolean;
}

interface ImportResult {
  summary: ImportSummary;
  results: RowResult[];
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryBar({ s, applied }: { s: ImportSummary; applied: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl border bg-green-50 border-green-200 p-4 text-center">
        <p className="text-2xl font-bold text-green-700">{s.insert}</p>
        <p className="text-xs text-green-600 font-semibold mt-0.5">
          {applied ? "Eklendi" : "Eklenecek"}
        </p>
      </div>
      <div className="rounded-xl border bg-blue-50 border-blue-200 p-4 text-center">
        <p className="text-2xl font-bold text-blue-700">{s.update}</p>
        <p className="text-xs text-blue-600 font-semibold mt-0.5">
          {applied ? "Güncellendi" : "Güncellenecek"}
        </p>
      </div>
      <div className="rounded-xl border bg-gray-50 border-gray-200 p-4 text-center">
        <p className="text-2xl font-bold text-gray-600">{s.skip}</p>
        <p className="text-xs text-gray-500 font-semibold mt-0.5">Atlandı</p>
      </div>
      <div className="rounded-xl border bg-red-50 border-red-200 p-4 text-center">
        <p className="text-2xl font-bold text-red-700">{s.error}</p>
        <p className="text-xs text-red-600 font-semibold mt-0.5">Hata</p>
      </div>
    </div>
  );
}

// ── Result table ──────────────────────────────────────────────────────────────

const ACTION_CFG = {
  insert: { label: "Ekle",      cls: "bg-green-100 text-green-800" },
  update: { label: "Güncelle",  cls: "bg-blue-100  text-blue-800"  },
  skip:   { label: "Atla",      cls: "bg-gray-100  text-gray-700"  },
  error:  { label: "Hata",      cls: "bg-red-100   text-red-700"   },
} as const;

interface TableCol { header: string; render: (r: RowResult) => React.ReactNode }

const ResultTable = memo(function ResultTable({
  results, cols,
}: {
  results: RowResult[];
  cols: TableCol[];
}) {
  const errorsFirst = [...results].sort((a, b) =>
    (a.action === "error" ? -1 : 1) - (b.action === "error" ? -1 : 1)
  );

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              <th className="px-3 py-2.5 text-left text-gray-500 font-semibold w-12">#</th>
              {cols.map((c) => (
                <th key={c.header} className="px-3 py-2.5 text-left text-gray-500 font-semibold">{c.header}</th>
              ))}
              <th className="px-3 py-2.5 text-left text-gray-500 font-semibold w-20">Durum</th>
              <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">Açıklama</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {errorsFirst.map((r) => {
              const cfg = ACTION_CFG[r.action];
              return (
                <tr key={r.row} className={r.action === "error" ? "bg-red-50" : "hover:bg-gray-50"}>
                  <td className="px-3 py-2 text-gray-400">{r.row}</td>
                  {cols.map((c) => (
                    <td key={c.header} className="px-3 py-2 font-medium">{c.render(r)}</td>
                  ))}
                  <td className="px-3 py-2">
                    <Badge className={`${cfg.cls} text-[11px] hover:${cfg.cls}`}>
                      {cfg.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{r.reason ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500">
        {results.length} satır gösteriliyor
      </div>
    </div>
  );
});

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({
  onFile,
  loading,
  accept,
}: {
  onFile: (f: File) => void;
  loading: boolean;
  accept: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && ref.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
        ${dragging ? "border-[#F59E0B] bg-amber-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
        ${loading ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { onFile(f); e.target.value = ""; }
        }}
      />
      {loading ? (
        <Loader2 className="size-8 animate-spin text-gray-300 mx-auto mb-2" />
      ) : (
        <FileSpreadsheet className="size-8 text-gray-300 mx-auto mb-2" />
      )}
      <p className="text-sm font-semibold text-gray-600">
        {loading ? "Yükleniyor…" : "Excel veya CSV dosyası sürükleyin"}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {loading ? "Lütfen bekleyin" : "veya seçmek için tıklayın (.xlsx, .csv)"}
      </p>
    </div>
  );
}

// ── Import panel ─────────────────────────────────────────────────────────────

interface PanelProps {
  endpoint:    string;
  templateType: string;
  columns:     TableCol[];
  description: React.ReactNode;
}

function ImportPanel({ endpoint, templateType, columns, description }: PanelProps) {
  const [mode,    setMode]    = useState<"dry-run" | "apply">("dry-run");
  const [result,  setResult]  = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setResult(null);
    setApplied(false);
    setLoading(true);

    const form = new FormData();
    form.append("file", file);

    try {
      const res  = await fetch(`${endpoint}?mode=${mode}`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Import başarısız.");
        return;
      }
      setResult(json);
      setApplied(mode === "apply");
      if (mode === "apply") {
        const s = json.summary as ImportSummary;
        const msg = [
          s.insert > 0 && `${s.insert} eklendi`,
          s.update > 0 && `${s.update} güncellendi`,
          s.skip   > 0 && `${s.skip} atlandı`,
          s.error  > 0 && `${s.error} hata`,
        ].filter(Boolean).join(", ");
        if (s.error > 0) toast.warning(`Import tamamlandı: ${msg}`);
        else toast.success(`Import başarılı: ${msg}`);
      } else {
        const errCount = (json.summary as ImportSummary).error;
        if (errCount > 0) toast.warning(`${errCount} satırda hata var. Düzeltin ve tekrar deneyin.`);
        else toast.info("Önizleme hazır. Uygunsa 'Uygula' moduna geçin.");
      }
    } catch {
      toast.error("Sunucu bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, mode]);

  function downloadTemplate() {
    window.open(`/api/admin/import/template/${templateType}`, "_blank");
  }

  return (
    <div className="space-y-5">
      {/* Description */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex gap-3">
        <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1">{description}</div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Mode toggle */}
        <div className="flex rounded-lg border overflow-hidden text-sm shadow-sm">
          {(["dry-run", "apply"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setResult(null); }}
              className={`px-4 py-2 font-medium transition-colors
                ${mode === m
                  ? m === "apply"
                    ? "bg-[#1A1A2E] text-white"
                    : "bg-[#F59E0B] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {m === "dry-run" ? "👁 Önizleme" : "⚡ Uygula"}
            </button>
          ))}
        </div>

        {/* Template download */}
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
          <Download className="size-4" />
          Excel Şablonu İndir
        </Button>

        {/* Reset */}
        {result && (
          <Button variant="ghost" size="sm" onClick={() => { setResult(null); setApplied(false); }}>
            <RefreshCw className="size-4 mr-1" />Sıfırla
          </Button>
        )}
      </div>

      {/* Mode hint */}
      {mode === "dry-run" && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <AlertCircle className="size-4 shrink-0" />
          <span>Önizleme modunda veritabanına hiçbir şey yazılmaz. Sonuçları gözden geçirip &quot;Uygula&quot; moduna geçin.</span>
        </div>
      )}
      {mode === "apply" && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <XCircle className="size-4 shrink-0" />
          <span><strong>Uygula modu:</strong> Dosya yüklendiğinde veriler doğrudan veritabanına yazılır. Hatalı satır varsa import yapılmaz.</span>
        </div>
      )}

      {/* Drop zone */}
      <DropZone
        onFile={handleFile}
        loading={loading}
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
      />

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            {applied ? (
              <CheckCircle className="size-5 text-green-600" />
            ) : (
              <AlertCircle className="size-5 text-amber-500" />
            )}
            <h3 className="font-semibold text-gray-800">
              {applied ? "Import Tamamlandı" : "Önizleme Sonucu"}
            </h3>
            <Badge variant="outline" className="ml-auto text-xs">
              {result.summary.total} satır işlendi
            </Badge>
          </div>

          {/* Summary cards */}
          <SummaryBar s={result.summary} applied={applied} />

          {/* Row table */}
          {result.results.length > 0 && (
            <ResultTable results={result.results} cols={columns} />
          )}

          {/* Apply CTA (only show if in dry-run, no errors, has items to import) */}
          {!applied && mode === "dry-run" && result.summary.error === 0 && (result.summary.insert + result.summary.update) > 0 && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-green-800">Önizleme temiz!</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {result.summary.insert + result.summary.update} kayıt uygulanmaya hazır.
                  &quot;Uygula&quot; moduna geçip dosyayı tekrar yükleyin.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                onClick={() => setMode("apply")}
              >
                Uygula Moduna Geç →
              </Button>
            </div>
          )}

          {/* Error summary */}
          {result.summary.error > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm font-semibold text-red-800 mb-1">
                {result.summary.error} satırda hata var
              </p>
              <p className="text-xs text-red-700">
                {applied
                  ? "Hatalı satırlar atlandı. Diğerleri başarıyla işlendi."
                  : "Import uygulanmayacak. Hataları düzeltip tekrar deneyin."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PRODUCT_COLS: TableCol[] = [
  { header: "Parça No",  render: (r) => <span className="font-mono">{r.partNumber ?? "—"}</span> },
  { header: "Ad",        render: (r) => <span className="truncate max-w-[180px] inline-block">{r.name ?? "—"}</span> },
];

const MACHINE_COLS: TableCol[] = [
  { header: "Makine",    render: (r) => <span>{r.label ?? "—"}</span> },
  { header: "Varyant",   render: (r) => <span className="text-gray-500">{r.detail ?? "—"}</span> },
];

const FITMENT_COLS: TableCol[] = [
  { header: "Parça No",  render: (r) => <span className="font-mono">{r.partNumber ?? "—"}</span> },
  { header: "Makine",    render: (r) => <span>{r.machine ?? "—"}</span> },
];

export default function ImportPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Toplu Veri İçe Aktarma</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Excel veya CSV dosyalarıyla ürün, makine ve uyumluluk verilerini toplu yükleyin.
          UPSERT mantığı: mevcut kayıt varsa günceller, yoksa ekler.
        </p>
      </div>

      {/* Quick guide */}
      <Card className="border-[#F59E0B]/40 bg-[#F59E0B]/5">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[#F59E0B] text-white text-xs font-bold w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">1</div>
              <div>
                <p className="font-semibold text-gray-800">Makine Import</p>
                <p className="text-xs text-gray-500 mt-0.5">Önce üreticiler ve modelleri yükleyin.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[#F59E0B] text-white text-xs font-bold w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">2</div>
              <div>
                <p className="font-semibold text-gray-800">Ürün Import</p>
                <p className="text-xs text-gray-500 mt-0.5">Sonra ürünleri ve parça numaralarını yükleyin.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[#F59E0B] text-white text-xs font-bold w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">3</div>
              <div>
                <p className="font-semibold text-gray-800">Uyumluluk Import</p>
                <p className="text-xs text-gray-500 mt-0.5">Son olarak hangi parçanın hangi makineye gittiğini bağlayın.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="products">
        <TabsList className="bg-gray-100 p-1 gap-1">
          <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow">
            <Package className="size-4" /> Ürün Import
          </TabsTrigger>
          <TabsTrigger value="machines" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow">
            <Cpu className="size-4" /> Makina Import
          </TabsTrigger>
          <TabsTrigger value="fitments" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow">
            <Link2 className="size-4" /> Uyumluluk Import
          </TabsTrigger>
        </TabsList>

        {/* ── Ürün Import ── */}
        <TabsContent value="products" className="mt-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4 text-[#F59E0B]" />
                Ürün İçe Aktarma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImportPanel
                endpoint="/api/admin/import/products"
                templateType="products"
                columns={PRODUCT_COLS}
                description={
                  <div className="space-y-2">
                    <p className="font-semibold">Zorunlu kolonlar: <code className="bg-blue-100 px-1 rounded">partNumber</code>, <code className="bg-blue-100 px-1 rounded">name</code></p>
                    <p>Opsiyonel: <code className="bg-blue-100 px-1 rounded">description</code> · <code className="bg-blue-100 px-1 rounded">condition</code> (new/used/remanufactured) · <code className="bg-blue-100 px-1 rounded">inStock</code> (true/false) · <code className="bg-blue-100 px-1 rounded">weight</code> (kg) · <code className="bg-blue-100 px-1 rounded">category</code> · <code className="bg-blue-100 px-1 rounded">notes</code></p>
                    <p className="text-blue-600">✦ Mevcut partNumber varsa: name, description, condition, weight, inStock, notes güncellenir.</p>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Makina Import ── */}
        <TabsContent value="machines" className="mt-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="size-4 text-[#F59E0B]" />
                Makina İçe Aktarma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImportPanel
                endpoint="/api/admin/import/machines"
                templateType="machines"
                columns={MACHINE_COLS}
                description={
                  <div className="space-y-2">
                    <p className="font-semibold">Zorunlu kolonlar: <code className="bg-blue-100 px-1 rounded">manufacturer</code>, <code className="bg-blue-100 px-1 rounded">model</code></p>
                    <p>Opsiyonel: <code className="bg-blue-100 px-1 rounded">type</code> (GREYDER, EKSKAVATÖR…) · <code className="bg-blue-100 px-1 rounded">yearFrom</code> · <code className="bg-blue-100 px-1 rounded">yearTo</code> · <code className="bg-blue-100 px-1 rounded">variantName</code> · <code className="bg-blue-100 px-1 rounded">engineModel</code></p>
                    <p className="text-blue-600">✦ Üretici yoksa otomatik oluşturulur. Aynı manufacturer+model+type kombinasyonu varsa yıl aralığı güncellenir. Varyant yoksa eklenir.</p>
                    <p className="text-blue-600">✦ Bir makinenin birden fazla varyantı varsa her varyant için ayrı satır ekleyin; makine tekrar oluşturulmaz.</p>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Uyumluluk Import ── */}
        <TabsContent value="fitments" className="mt-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="size-4 text-[#F59E0B]" />
                Uyumluluk İçe Aktarma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImportPanel
                endpoint="/api/admin/import/fitments"
                templateType="fitments"
                columns={FITMENT_COLS}
                description={
                  <div className="space-y-2">
                    <p className="font-semibold">Zorunlu: <code className="bg-blue-100 px-1 rounded">partNumber</code>, <code className="bg-blue-100 px-1 rounded">manufacturer</code>, <code className="bg-blue-100 px-1 rounded">model</code></p>
                    <p>Opsiyonel: <code className="bg-blue-100 px-1 rounded">type</code> · <code className="bg-blue-100 px-1 rounded">variantName</code> · <code className="bg-blue-100 px-1 rounded">notes</code></p>
                    <p className="text-blue-600">✦ Ürün ve makine önceden yüklenmiş olmalı. Aynı uyumluluk zaten varsa atlanır (duplicate oluşmaz).</p>
                    <p className="text-amber-700">⚠ Önce Makine Import → sonra Ürün Import → en son Uyumluluk Import yapın.</p>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
