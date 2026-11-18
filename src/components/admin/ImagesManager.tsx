"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload,
  Trash2,
  Star,
  Loader2,
  GripVertical,
  ShieldCheck,
  HelpCircle,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IMAGE_STATE_LABEL,
  IMAGE_STATE_NOTE,
  resolveImageState,
  type ProductImageState,
} from "@/lib/product-image-state";
import { IMAGE_ALT_TEXT_MIN } from "@/lib/product-fields";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // must match server route

interface ProductImage {
  id: string;
  cloudinaryId: string;
  cloudinaryUrl: string;
  sortOrder: number;
  isPrimary: boolean;
  // drizzle/0011
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  altText: string | null;
  sourceNote: string | null;
}

const DURUM_STILI: Record<ProductImageState, string> = {
  missing: "bg-gray-100 text-gray-600 border-gray-200",
  placeholder: "bg-gray-100 text-gray-600 border-gray-200",
  pending_verification: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-green-50 text-green-700 border-green-200",
};

function DurumIkonu({ durum }: { durum: ProductImageState }) {
  if (durum === "verified") return <ShieldCheck className="w-3.5 h-3.5" />;
  if (durum === "pending_verification") return <HelpCircle className="w-3.5 h-3.5" />;
  return <ImageOff className="w-3.5 h-3.5" />;
}

export default function ImagesManager({
  productId,
  onStateChange,
}: {
  productId: string;
  /**
   * Fotoğraf sayıları değiştiğinde çağrılır. Yayın sekmesindeki ölçüt listesi
   * DOĞRULANMIŞ fotoğraf sayısına baktığı için bu bildirim gerekli: operatör
   * fotoğrafı doğruladığı anda ölçüt listesi güncellenir.
   */
  onStateChange?: (summary: { total: number; verified: number }) => void;
}) {
  const [images, setImages]     = useState<ProductImage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError]       = useState("");

  /** Doğrulama formu açık olan görselin kimliği. */
  const [dogrulanan, setDogrulanan] = useState<string | null>(null);
  const [altDraft, setAltDraft]       = useState("");
  const [kaynakDraft, setKaynakDraft] = useState("");
  const [busyId, setBusyId]           = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchImages() {
    const res  = await fetch(`/api/admin/products/${productId}/images`);
    const json = await res.json();
    const data: ProductImage[] = json.data ?? [];
    setImages(data);
    setLoading(false);
    onStateChange?.({
      total: data.length,
      verified: data.filter((i) => i.verified).length,
    });
  }

  useEffect(() => { fetchImages(); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFileUpload(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError(`Dosya boyutu 50 MB limitini aşıyor (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      return;
    }
    setError("");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Upload failed"); }
    else { await fetchImages(); }
    setUploading(false);
  }

  async function handleUrlUpload() {
    if (!urlInput.trim()) return;
    setError("");
    setUploading(true);
    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urlInput.trim() }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Upload failed"); }
    else { setUrlInput(""); await fetchImages(); }
    setUploading(false);
  }

  async function setAsPrimary(imageId: string) {
    await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    fetchImages();
  }

  async function deleteImage(imageId: string) {
    if (!confirm("Bu fotoğrafı silmek istediğinizden emin misiniz?")) return;
    const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    if (json?.seoReadyRevoked) {
      setError(
        "Son doğrulanmış fotoğraf silindiği için ürünün YAYIN ONAYI geri alındı " +
        "(artık noindex). Yeni bir fotoğraf doğrulandıktan sonra tekrar yayına alabilirsiniz."
      );
    }
    fetchImages();
  }

  /** Doğrulama formunu açar; mevcut taslak değerleri yükler. */
  function dogrulamayiAc(img: ProductImage) {
    setError("");
    setDogrulanan(img.id);
    setAltDraft(img.altText ?? "");
    setKaynakDraft(img.sourceNote ?? "");
  }

  async function dogrula(imageId: string) {
    setError("");
    setBusyId(imageId);
    const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verified: true,
        altText: altDraft,
        sourceNote: kaynakDraft,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(json.error ?? "Doğrulama kaydedilemedi.");
      return;
    }
    setDogrulanan(null);
    fetchImages();
  }

  async function dogrulamayiGeriAl(imageId: string) {
    setError("");
    setBusyId(imageId);
    const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: false }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(json.error ?? "İşlem başarısız.");
      return;
    }
    if (json?.seoReadyRevoked) {
      setError(
        "Ürünün doğrulanmış fotoğrafı kalmadığı için YAYIN ONAYI geri alındı (artık noindex)."
      );
    }
    fetchImages();
  }

  // Simple drag-reorder (no external library)
  const dragId = useRef<string | null>(null);

  async function handleDragEnd(overId: string) {
    if (!dragId.current || dragId.current === overId) return;
    const from = images.findIndex((i) => i.id === dragId.current);
    const to   = images.findIndex((i) => i.id === overId);
    if (from < 0 || to < 0) return;

    const reordered = [...images];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setImages(reordered);

    await fetch(`/api/admin/products/${productId}/images/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((i) => i.id) }),
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const dogrulanmisSayi = images.filter((i) => i.verified).length;
  // YÖNETİM görünümü: `missing` ve `pending_verification` burada ayrı ayrı
  // görünür. Public yüzeyde ikisi de aynı temsilî kartı basar.
  const durum = resolveImageState({
    imageCount: images.length,
    verifiedImageCount: dogrulanmisSayi,
    surface: "admin",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex flex-wrap items-center gap-2">
          <span>Fotoğraflar ({images.length}/10)</span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 border ${DURUM_STILI[durum]}`}
          >
            <DurumIkonu durum={durum} />
            {IMAGE_STATE_LABEL[durum]}
            {images.length > 0 && ` · ${dogrulanmisSayi}/${images.length}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground rounded-lg border bg-gray-50 p-3">
          {IMAGE_STATE_NOTE[durum]}
          <br />
          <span className="text-[11px]">
            Fotoğraf doğrulamak ürünü <strong>yayına açmaz</strong>; yayın onayı
            Yayın sekmesinde ayrı bir karardır.
          </span>
        </p>

        {/*
          ── DOĞRULAMA ŞARTLARI ÖNDEN GÖSTERİLİR (bulgu P10) ──────────────────

          ALT metni ve kaynak zorunluluğu eskiden YALNIZCA bir fotoğraf
          yüklenip "Doğrula" tıklandığında görünüyordu. Fotoğrafı olmayan
          üründe doğrulama formu da olmadığı için şart hiç okunmuyordu.

          Sonucu şuydu: depo turuna çıkan kişi fotoğrafı çekip dönüyor, ALT
          metni ve kaynak toplanmadığı için hiçbiri doğrulanamıyor ve İKİNCİ
          TUR gerekiyordu. 154 ürün için bu, haftalarca gecikme demek.

          Eşik `IMAGE_ALT_TEXT_MIN` sabitinden okunur; metin ile sunucudaki
          kural asla ayrışmaz.
        */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-900">
            Fotoğraf çekmeden önce: her fotoğraf için İKİ bilgi gerekir
          </p>
          <ul className="space-y-1 text-[11px] text-amber-900/90">
            <li>
              <strong>ALT metni</strong> — görseli tarif eden en az{" "}
              {IMAGE_ALT_TEXT_MIN} karakter. Parça numarasının tekrarı ALT
              metni değildir.
            </li>
            <li>
              <strong>Kaynak</strong> — fotoğrafın dayanağı: çekim tarihi,
              üretici katalogu sayfası veya tedarikçi teyidi.
            </li>
          </ul>
          <p className="text-[11px] text-amber-900/70">
            Bu ikisi olmadan fotoğraf <strong>doğrulanamaz</strong>;
            doğrulanmamış fotoğraf public sayfada gösterilmez ve ürün yayına
            giremez. Bilgileri fotoğrafla <strong>birlikte</strong> toplayın.
          </p>
        </div>

        {/* Upload controls */}
        <div className="space-y-3">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { handleFileUpload(file); e.target.value = ""; }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading || images.length >= 10}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <><Loader2 className="size-4 animate-spin mr-2" />Yükleniyor…</>
              ) : (
                <><Upload className="size-4 mr-2" />Bilgisayardan Yükle</>
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Veya fotoğraf URL'si yapıştır…"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleUrlUpload}
              disabled={uploading || !urlInput.trim() || images.length >= 10}
            >
              Ekle
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {/* Image list */}
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Henüz fotoğraf eklenmedi.
            <br />
            <span className="text-xs">
              Yüklenen her fotoğraf <strong>doğrulama bekliyor</strong> olarak
              başlar; ALT metni ve kaynak girilene kadar public yüzeye çıkmaz.
            </span>
          </p>
        ) : (
          <div className="space-y-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="flex gap-3 rounded-lg border p-3"
                draggable
                onDragStart={() => { dragId.current = img.id; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDragEnd(img.id)}
              >
                <div className="relative w-24 h-24 shrink-0 rounded-md overflow-hidden bg-gray-50 border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.cloudinaryUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {img.isPrimary && (
                    <span className="absolute top-1 left-1 bg-[#F59E0B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      ANA
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  {/* Durum satırı */}
                  <div className="flex flex-wrap items-center gap-2">
                    {img.verified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-200">
                        <ShieldCheck className="w-3 h-3" /> Doğrulandı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200">
                        <HelpCircle className="w-3 h-3" /> Doğrulama bekliyor
                      </span>
                    )}
                    {img.verified && img.verifiedAt && (
                      <span className="text-[11px] text-gray-500">
                        {new Date(img.verifiedAt).toLocaleString("tr-TR")}
                        {img.verifiedBy ? ` · ${img.verifiedBy}` : ""}
                      </span>
                    )}
                    {!img.verified && (
                      <span className="text-[11px] text-amber-700">
                        Public sayfada gösterilmez
                      </span>
                    )}
                  </div>

                  {img.verified && (
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p className="truncate"><strong>ALT:</strong> {img.altText}</p>
                      <p className="truncate"><strong>Kaynak:</strong> {img.sourceNote}</p>
                    </div>
                  )}

                  {/* Doğrulama formu */}
                  {dogrulanan === img.id && !img.verified && (
                    <div className="space-y-2 rounded-md border bg-gray-50 p-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                          ALT metni (görseli tarif eden metin, en az {IMAGE_ALT_TEXT_MIN} karakter)
                        </label>
                        <Input
                          value={altDraft}
                          onChange={(e) => setAltDraft(e.target.value)}
                          placeholder="Ör. Sökülmüş kavrama ayar pulu, üstten çekim"
                          maxLength={300}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Parça numarasının tekrarı ALT metni değildir. Google
                          görsel aramada bu metni kullanır.
                        </p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                          Kaynak / dayanak
                        </label>
                        <Input
                          value={kaynakDraft}
                          onChange={(e) => setKaynakDraft(e.target.value)}
                          placeholder="Ör. depo çekimi 2026-11-17 · üretici katalogu s.198"
                          maxLength={255}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={busyId === img.id}
                          onClick={() => dogrula(img.id)}
                        >
                          {busyId === img.id && <Loader2 className="size-3.5 animate-spin mr-1" />}
                          Bu fotoğrafı doğrula
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setDogrulanan(null)}
                        >
                          Vazgeç
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Eylemler */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!img.verified && dogrulanan !== img.id && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => dogrulamayiAc(img)}
                      >
                        <ShieldCheck className="size-3.5 mr-1" /> Doğrula
                      </Button>
                    )}
                    {img.verified && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        disabled={busyId === img.id}
                        onClick={() => dogrulamayiGeriAl(img.id)}
                      >
                        {busyId === img.id
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : "Doğrulamayı geri al"}
                      </Button>
                    )}
                    {!img.isPrimary && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        onClick={() => setAsPrimary(img.id)}
                      >
                        <Star className="size-3.5 mr-1" /> Ana fotoğraf yap
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] text-red-600 hover:text-red-700"
                      onClick={() => deleteImage(img.id)}
                    >
                      <Trash2 className="size-3.5 mr-1" /> Sil
                    </Button>
                    <span className="ml-auto text-gray-400 cursor-grab" title="Sürükleyerek sırala">
                      <GripVertical className="size-4" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Sıralamayı değiştirmek için satırları sürükleyin. İlk fotoğraf
          varsayılan olarak ana fotoğraftır. Maksimum dosya boyutu: 50 MB.
          <br />
          <strong>Yalnızca doğrulanmış fotoğraflar</strong> ürün sayfasında,
          yapısal veride (JSON-LD), paylaşım kartında ve sitemap&apos;te kullanılır.
        </p>
      </CardContent>
    </Card>
  );
}
