"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, Star, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // must match server route

interface ProductImage {
  id: string;
  cloudinaryId: string;
  cloudinaryUrl: string;
  sortOrder: number;
  isPrimary: boolean;
}

export default function ImagesManager({ productId }: { productId: string }) {
  const [images, setImages]     = useState<ProductImage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchImages() {
    const res  = await fetch(`/api/admin/products/${productId}/images`);
    const json = await res.json();
    setImages(json.data ?? []);
    setLoading(false);
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
    await fetch(`/api/admin/products/${productId}/images/${imageId}`, { method: "DELETE" });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Fotoğraflar ({images.length}/10)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
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
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Image grid */}
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Henüz fotoğraf eklenmedi.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative group rounded-lg border overflow-hidden bg-gray-50"
                draggable
                onDragStart={() => { dragId.current = img.id; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDragEnd(img.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.cloudinaryUrl}
                  alt=""
                  className="w-full aspect-square object-cover"
                />

                {img.isPrimary && (
                  <span className="absolute top-1 left-1 bg-[#F59E0B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    ANA
                  </span>
                )}

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  {!img.isPrimary && (
                    <button
                      type="button"
                      title="Ana fotoğraf yap"
                      className="p-1.5 rounded bg-white/20 hover:bg-white/40 text-yellow-300"
                      onClick={() => setAsPrimary(img.id)}
                    >
                      <Star className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Sil"
                    className="p-1.5 rounded bg-white/20 hover:bg-white/40 text-red-400"
                    onClick={() => deleteImage(img.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <span className="p-1.5 rounded bg-white/10 text-white/60 cursor-grab" title="Sürükle">
                    <GripVertical className="size-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Sıralamayı değiştirmek için fotoğrafları sürükleyin. İlk fotoğraf varsayılan olarak ana fotoğraftır. Maksimum dosya boyutu: 50 MB.
        </p>
      </CardContent>
    </Card>
  );
}
