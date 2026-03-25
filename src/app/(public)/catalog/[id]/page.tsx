import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRightLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Package,
  Truck,
} from "lucide-react";
import { getPart } from "@/lib/prosis";
import type {
  CrossRefEntry,
  DocumentEntry,
  FitmentEntry,
  SupersessionEntry,
} from "@/lib/prosis";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const part = await getPart(decodeURIComponent(id));
    if (!part) return { title: "Parça Bulunamadı | NİDAH GROUP" };
    const desc = part.description
      ? `${part.part_number} — ${part.description}`
      : `${part.part_number} parça numaralı ürün detayları.`;
    return {
      title: `${part.part_number} | NİDAH GROUP Parça Kataloğu`,
      description: desc,
    };
  } catch {
    return { title: "Parça Kataloğu | NİDAH GROUP" };
  }
}

// ── Tab definitions ───────────────────────────────────────────────────────────
type TabId = "genel" | "uyumluluk" | "supersesyon" | "dokumanlar";

interface Tab {
  id: TabId;
  label: string;
  count?: number;
}

// ── Section components (rendered server-side, no JS required for tabs) ─────────
// We use anchor-based "tabs" via CSS :target or a simpler approach: render all
// sections and rely on anchor links. For a clean server-component approach we
// render all tabs always and use anchor IDs.

// ── Main Page ─────────────────────────────────────────────────────────────────
export default async function CatalogDetailPage({ params }: PageProps) {
  const { id } = await params;

  let part;
  try {
    part = await getPart(decodeURIComponent(id));
  } catch {
    return <ConnectorUnavailable />;
  }

  if (!part) notFound();

  const d = part.details;
  const annotations   = d.annotations  ?? [];
  const fitments      = (d.fitments    ?? []) as FitmentEntry[];
  const supersession  = d.supersession ?? { replaces: [], replaced_by: [] };
  const crossRefs     = (d.cross_refs  ?? []) as CrossRefEntry[];
  const documents     = (d.documents   ?? []) as DocumentEntry[];
  const imageIds      = d.image_ids    ?? [];
  const brandName     = d.brand_name   ?? d.brand_prefix ?? "";

  const replaces    = (supersession.replaces    ?? []) as SupersessionEntry[];
  const replacedBy  = (supersession.replaced_by ?? []) as SupersessionEntry[];
  const supersessionTotal = replaces.length + replacedBy.length;

  const firstDesc = annotations[0] ?? part.description ?? "";
  const whatsappMsg = `Merhaba, ${part.part_number} parçası hakkında fiyat almak istiyorum.`;

  const tabs: Tab[] = [
    { id: "genel",       label: "Genel Bilgi" },
    { id: "uyumluluk",   label: "Uyumluluk",          count: fitments.length },
    { id: "supersesyon", label: "Değişen Numaralar",   count: supersessionTotal + crossRefs.length },
    { id: "dokumanlar",  label: "Dokümanlar",          count: documents.length },
  ];

  return (
    <main>
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <section className="bg-nidah-light border-b py-3">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1 text-sm text-nidah-gray flex-wrap">
            <Link href="/" className="hover:text-nidah-dark transition-colors">Ana Sayfa</Link>
            <ChevronRight className="w-4 h-4 shrink-0" />
            <Link href="/catalog" className="hover:text-nidah-dark transition-colors">
              Parça Kataloğu
            </Link>
            <ChevronRight className="w-4 h-4 shrink-0" />
            <span className="text-nidah-dark font-mono font-medium truncate max-w-[220px]">
              {part.part_number}
            </span>
          </nav>
        </div>
      </section>

      {/* ── Hero / Top section ──────────────────────────────────────────── */}
      <section className="bg-white py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">

            {/* Left: Visual panel (sticky on large screens) */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl bg-gradient-to-br from-nidah-navy to-nidah-steel aspect-square flex flex-col items-center justify-center p-8 lg:sticky lg:top-24">
                <Package className="w-20 h-20 text-nidah-yellow mb-4" />
                {imageIds.length > 0 && (
                  <div className="flex items-center gap-1.5 text-white/50 text-xs mb-3">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{imageIds.length} diyagram</span>
                  </div>
                )}
                <span className="text-white/60 text-xs font-mono uppercase tracking-widest mb-1">
                  {brandName}
                </span>
                <span className="text-white text-xl font-mono font-bold text-center break-all">
                  {part.part_number}
                </span>
                {fitments.length > 0 && (
                  <span className="text-white/50 text-xs mt-3">
                    {fitments.length} makine ile uyumlu
                  </span>
                )}
              </div>
            </div>

            {/* Right: Info + Tabs */}
            <div className="lg:col-span-2">
              {/* Badges row */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-nidah-navy text-white font-mono">
                  {part.part_number}
                </Badge>
                {brandName && (
                  <Badge variant="outline" className="text-nidah-steel">
                    {brandName}
                  </Badge>
                )}
                {supersessionTotal > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    {supersessionTotal} süpersesyon
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-2 break-words">
                {firstDesc || "Parça Detayı"}
              </h1>
              <p className="text-nidah-gray font-mono text-sm mb-6">
                Parça No: {part.part_number}
              </p>

              <Separator className="mb-6" />

              {/* ── Tab nav ─────────────────────────────────────────────── */}
              <div className="flex gap-0 border-b mb-8 overflow-x-auto">
                {tabs.map((tab) => (
                  <a
                    key={tab.id}
                    href={`#${tab.id}`}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-nidah-gray border-b-2 border-transparent hover:text-nidah-dark hover:border-nidah-steel transition-colors whitespace-nowrap"
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="text-[10px] bg-nidah-light text-nidah-gray rounded-full px-1.5 py-0.5 min-w-[1.2rem] text-center">
                        {tab.count}
                      </span>
                    )}
                  </a>
                ))}
              </div>

              {/* ── TAB: Genel Bilgi ────────────────────────────────────── */}
              <div id="genel" className="scroll-mt-24 mb-12">
                <h2 className="text-base font-semibold text-nidah-dark mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-nidah-steel" />
                  Teknik Bilgiler
                </h2>

                {annotations.length > 0 ? (
                  <ul className="space-y-2 mb-6">
                    {annotations.map((note, i) => (
                      <li
                        key={i}
                        className="text-sm text-nidah-gray bg-nidah-light rounded-md px-4 py-2.5"
                      >
                        {note}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-nidah-gray mb-6">
                    Bu parça için ek teknik not bulunmamaktadır.
                  </p>
                )}

                {/* Quick info cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="bg-nidah-light border-none">
                    <CardContent className="flex items-start gap-3 py-4">
                      <Package className="w-5 h-5 text-nidah-yellow-dark shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-nidah-dark">Parça Numarası</p>
                        <p className="text-sm text-nidah-gray font-mono">{part.part_number}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-nidah-light border-none">
                    <CardContent className="flex items-start gap-3 py-4">
                      <Truck className="w-5 h-5 text-nidah-yellow-dark shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-nidah-dark">Stok & Teslimat</p>
                        <p className="text-sm text-nidah-gray">Bilgi için iletişime geçin</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* ── TAB: Uyumluluk ──────────────────────────────────────── */}
              <div id="uyumluluk" className="scroll-mt-24 mb-12">
                <h2 className="text-base font-semibold text-nidah-dark mb-4 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-nidah-steel" />
                  Uyumlu Makineler
                  {fitments.length > 0 && (
                    <span className="text-nidah-gray font-normal">({fitments.length})</span>
                  )}
                </h2>

                {fitments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {fitments.map((m, i) => (
                      <Badge key={i} variant="outline" className="text-xs py-1 px-3">
                        <span className="font-semibold">{m.name}</span>
                        {m.model && (
                          <span className="text-nidah-gray ml-1">— {m.model}</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-nidah-gray">
                    Bu parça için uyumluluk bilgisi bulunamadı.
                  </p>
                )}
              </div>

              {/* ── TAB: Değişen Numaralar ───────────────────────────────── */}
              <div id="supersesyon" className="scroll-mt-24 mb-12">
                <h2 className="text-base font-semibold text-nidah-dark mb-4 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-nidah-steel" />
                  Değişen Parça Numaraları
                </h2>

                {replaces.length === 0 && replacedBy.length === 0 && crossRefs.length === 0 ? (
                  <p className="text-sm text-nidah-gray">
                    Bu parça için değişim bilgisi bulunmamaktadır.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {/* This part replaces old parts */}
                    {replaces.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-nidah-gray uppercase tracking-wide mb-2">
                          Bu parça şunların yerine kullanılır:
                        </p>
                        <div className="space-y-2">
                          {replaces.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 bg-nidah-light rounded-md px-4 py-2.5">
                              <Link
                                href={`/catalog/${encodeURIComponent(r.part_number)}`}
                                className="font-mono text-sm font-semibold text-nidah-steel hover:text-nidah-dark underline"
                              >
                                {r.part_number}
                              </Link>
                              {r.note && (
                                <span className="text-sm text-nidah-gray">— {r.note}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Newer parts replace this part */}
                    {replacedBy.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-nidah-gray uppercase tracking-wide mb-2">
                          Bu parçanın yerine kullanılır:
                        </p>
                        <div className="space-y-2">
                          {replacedBy.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5">
                              <Link
                                href={`/catalog/${encodeURIComponent(r.part_number)}`}
                                className="font-mono text-sm font-semibold text-amber-700 hover:text-amber-900 underline"
                              >
                                {r.part_number}
                              </Link>
                              {r.note && (
                                <span className="text-sm text-nidah-gray">— {r.note}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exchange cross-references */}
                    {crossRefs.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-nidah-gray uppercase tracking-wide mb-2">
                          Çapraz Referans (Muadil):
                        </p>
                        <div className="space-y-2">
                          {crossRefs.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 bg-nidah-light rounded-md px-4 py-2.5">
                              <span className="font-mono text-sm font-semibold text-nidah-dark">
                                {r.part_number}
                              </span>
                              {r.note && (
                                <span className="text-sm text-nidah-gray">— {r.note}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── TAB: Dokümanlar ─────────────────────────────────────── */}
              <div id="dokumanlar" className="scroll-mt-24 mb-12">
                <h2 className="text-base font-semibold text-nidah-dark mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-nidah-steel" />
                  Servis Dokümanları
                  {documents.length > 0 && (
                    <span className="text-nidah-gray font-normal">({documents.length})</span>
                  )}
                </h2>

                {documents.length > 0 ? (
                  <ul className="space-y-2">
                    {documents.map((doc, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 bg-nidah-light rounded-md px-4 py-3"
                      >
                        <FileText className="w-4 h-4 text-nidah-steel shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-nidah-dark">{doc.title}</p>
                          {doc.typename && (
                            <p className="text-xs text-nidah-gray mt-0.5">{doc.typename}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-nidah-gray">
                    Bu makine serisi için doküman bulunamadı.
                  </p>
                )}
              </div>

              {/* ── CTA / Quote panel ───────────────────────────────────── */}
              <div className="rounded-xl border border-nidah-yellow/40 bg-nidah-yellow/5 p-6 mt-4">
                <h3 className="text-base font-bold text-nidah-dark mb-1">Fiyat Teklifi Alın</h3>
                <p className="text-sm text-nidah-gray mb-4">
                  <span className="font-mono font-semibold text-nidah-dark">{part.part_number}</span>{" "}
                  için stok ve fiyat bilgisi talep edin. En kısa sürede dönüş yapılır.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    asChild size="lg"
                    className="bg-nidah-yellow hover:bg-nidah-yellow-dark text-nidah-dark font-semibold flex-1"
                  >
                    <Link href={`/teklif-al?partNumber=${encodeURIComponent(part.part_number)}`}>
                      Bu Parça İçin Teklif Al
                    </Link>
                  </Button>
                  <Button
                    asChild size="lg" variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold"
                  >
                    <a
                      href={WHATSAPP_URL(CONTACTS.mustafa.phoneRaw, whatsappMsg)}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-5 h-5" />
                      WhatsApp ile Sorun
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-nidah-gray mt-3">
                  ←{" "}
                  <Link href="/catalog" className="underline hover:text-nidah-dark transition-colors">
                    Kataloğa geri dön
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="bg-nidah-light py-12 border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-nidah-dark mb-3">
            Aradığınız Parçayı Bulamadınız mı?
          </h2>
          <p className="text-nidah-gray mb-6 max-w-lg mx-auto">
            Katalogda bulunmayan parçalar için de tedarik hizmeti sunuyoruz.
          </p>
          <Button asChild size="lg" className="bg-nidah-dark hover:bg-nidah-navy text-white font-semibold">
            <Link href="/iletisim">İletişime Geçin</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

// ── Fallback ───────────────────────────────────────────────────────────────────
function ConnectorUnavailable() {
  return (
    <main className="bg-nidah-light min-h-[60vh] flex items-center justify-center">
      <div className="container mx-auto px-4 text-center py-20">
        <Package className="w-16 h-16 text-nidah-gray/40 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-nidah-dark mb-3">
          Katalog Servisi Kullanılamıyor
        </h1>
        <p className="text-nidah-gray max-w-md mx-auto mb-6">
          Parça bilgisi yüklenemiyor. Lütfen daha sonra tekrar deneyin veya
          bizimle iletişime geçin.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/catalog">← Kataloğa Dön</Link>
          </Button>
          <Button
            asChild
            className="bg-nidah-yellow hover:bg-nidah-yellow-dark text-nidah-dark font-semibold"
          >
            <Link href="/iletisim">İletişime Geçin</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
