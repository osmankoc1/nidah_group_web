"use client";

import { useState, useEffect, memo } from "react";
import Image from "next/image";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/lib/queries/product";

interface ProductGalleryProps {
  images: ProductImage[];
  partNumber: string;
}

const ProductGallery = memo(function ProductGallery({ images, partNumber }: ProductGalleryProps) {
  const sorted = [...images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [images]);

  if (images.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#0F3460] aspect-square flex flex-col items-center justify-center gap-4">
        <Package className="w-24 h-24 text-[#F59E0B] opacity-60" />
        <span className="text-gray-400 text-sm tracking-wide">Görsel Yok</span>
      </div>
    );
  }

  const active = sorted[idx];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
        <Image
          key={active.cloudinaryUrl}
          src={active.cloudinaryUrl}
          alt={`${partNumber} - görsel ${idx + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 44vw"
          className="object-contain transition-opacity duration-200"
          priority={idx === 0}
        />
        {/* Prev / Next arrows */}
        {sorted.length > 1 && (
          <>
            <button
              onClick={() => setIdx((i) => (i - 1 + sorted.length) % sorted.length)}
              aria-label="Önceki görsel"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setIdx((i) => (i + 1) % sorted.length)}
              aria-label="Sonraki görsel"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-all"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {sorted.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Görsel ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-[#F59E0B]" : "w-1.5 bg-gray-300"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setIdx(i)}
              aria-label={`${partNumber} - görsel ${i + 1}`}
              className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all
                ${i === idx ? "border-[#F59E0B] shadow-md" : "border-transparent hover:border-gray-300 opacity-70 hover:opacity-100"}`}
            >
              <Image
                src={img.cloudinaryUrl}
                alt={`${partNumber} - görsel ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default ProductGallery;
