#!/usr/bin/env node
/**
 * ISR yazma koruması — build sonrası çalışır, `npm run build` zincirinde.
 *
 * NEDEN VAR
 * ---------
 * 2026-11 tarihinde Vercel Hobby planındaki 200.000/ay ISR Writes kotası
 * aşıldı (30 günde 275.768 yazma, tek projeden). Sebep tek bir satırdı:
 * `src/lib/site-settings.ts` içindeki `unstable_cache`'e verilen
 * `{ revalidate: 60 }`. Next 16 bu değeri render eden ROTANIN revalidate
 * süresine de taşıyor; fonksiyon `(public)/layout.tsx` içinden çağrıldığı
 * için tüm public sayfalar ve `/sitemap.xml` 60 saniyelik ISR sayfasına
 * dönüştü. Build çıktısında 31 prerender rotasının 28'i
 * `initialRevalidateSeconds: 60` idi.
 *
 * Bu koruma, aynı regresyonun sessizce geri gelmesini engeller.
 *
 * NEDEN KAYNAK KODU DEĞİL DE MANIFEST TARANIYOR
 * ---------------------------------------------
 * Kaynakta `revalidate` aramak yanıltıcı olurdu: `blog/[slug]` sayfaları
 * `export const revalidate = 60` taşıyor ama `(public)/blog/loading.tsx`
 * streaming sınırı yüzünden ISR'ye hiç girmiyorlar (canlıda `MISS`).
 * Yani niyet değil SONUÇ ölçülmeli. `prerender-manifest.json` tam olarak
 * sonucu verir: hangi rota, kaç saniyede bir yeniden yazılacak.
 *
 * KURAL
 * -----
 * Prerender edilen her rota `false` (süreyle eskimez) olmalıdır.
 * Sayısal bir değer = o rota zamanla yeniden üretilir = günde
 * 86400/saniye kadar ISR yazma üst sınırı (60 sn → 1.440/gün/rota).
 *
 * Bilinçli bir istisna gerekiyorsa aşağıdaki listeye rotayı ve beklenen
 * saniyeyi yaz. Bu bir maliyet kararıdır, yorum satırıyla gerekçelendir.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Bilinçli olarak zaman tabanlı yenilenmesine izin verilen rotalar.
 * Biçim: "rota yolu": beklenen saniye (tam eşleşme aranır).
 * Şu an boş olması doğrudur: sitenin tamamı olay tabanlı yenileniyor.
 * @type {Record<string, number>}
 */
const IZINLI_REVALIDATE = {};

const MANIFEST = path.join(process.cwd(), ".next", "prerender-manifest.json");

/** @param {unknown} deger */
function sayisalMi(deger) {
  return typeof deger === "number" && Number.isFinite(deger);
}

function manifestOku() {
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf8"));
  } catch (err) {
    const neden = err instanceof Error ? err.message : String(err);
    console.error(
      `\n[isr-koruma] HATA: prerender manifest okunamadı.\n  Dosya: ${MANIFEST}\n  Neden: ${neden}\n` +
        "  Bu script 'next build' SONRASINDA çalışmalıdır.\n"
    );
    process.exit(1);
  }
}

const manifest = manifestOku();
const routes = manifest.routes ?? {};
const dynamicRoutes = manifest.dynamicRoutes ?? {};

/** @type {Array<{ rota: string, alan: string, saniye: number }>} */
const ihlaller = [];

for (const [rota, kayit] of Object.entries(routes)) {
  const saniye = kayit?.initialRevalidateSeconds;
  if (sayisalMi(saniye) && IZINLI_REVALIDATE[rota] !== saniye) {
    ihlaller.push({ rota, alan: "initialRevalidateSeconds", saniye });
  }
}

// Dinamik rotaların fallback'i de zaman tabanlı yenilenebilir.
for (const [rota, kayit] of Object.entries(dynamicRoutes)) {
  const saniye = kayit?.fallbackRevalidate;
  if (sayisalMi(saniye) && IZINLI_REVALIDATE[rota] !== saniye) {
    ihlaller.push({ rota, alan: "fallbackRevalidate", saniye });
  }
}

const toplamRota = Object.keys(routes).length + Object.keys(dynamicRoutes).length;

if (toplamRota === 0) {
  // Kontrol edilecek bir şey yok. Deploy'u bu yüzden düşürmek yanlış olur;
  // ama sessiz geçmek de yanlış — koruma işlevsiz kalmış olabilir.
  console.warn(
    "[isr-koruma] UYARI: manifest'te prerender edilmiş rota yok, kontrol atlandı."
  );
  process.exit(0);
}

if (ihlaller.length > 0) {
  const satirlar = ihlaller
    .map(
      (i) =>
        `  ${i.rota}  →  ${i.alan}: ${i.saniye} sn  (~${Math.round(
          86400 / i.saniye
        )} ISR yazma/gün üst sınırı)`
    )
    .join("\n");

  console.error(
    [
      "",
      "═══════════════════════════════════════════════════════════════",
      " BUILD DURDURULDU — ISR yazma regresyonu",
      "═══════════════════════════════════════════════════════════════",
      "",
      `${ihlaller.length} rota zaman tabanlı yeniden üretime ayarlanmış:`,
      "",
      satirlar,
      "",
      "Bu, Vercel ISR Writes kotasını tüketen davranıştır (bkz. bu",
      "dosyanın başındaki not). Olası sebepler:",
      "",
      "  1) Bir sayfada/layout'ta  export const revalidate = <sayı>",
      "  2) unstable_cache(..., { revalidate: <sayı> })  — değer rotaya taşınır",
      "  3) fetch(..., { next: { revalidate: <sayı> } })  — aynı etki",
      "",
      "Doğru yaklaşım zaman değil OLAY tabanlı yenilemedir:",
      "etiketli önbellek + revalidateTag / revalidatePath.",
      "Örnek: src/lib/site-settings.ts ve src/app/api/admin/settings/route.ts",
      "",
      "Gerçekten bilinçli bir istisna ise rotayı scripts/isr-yazma-korumasi.mjs",
      "içindeki IZINLI_REVALIDATE listesine gerekçesiyle ekle.",
      "═══════════════════════════════════════════════════════════════",
      "",
    ].join("\n")
  );
  process.exit(1);
}

const izinliSayisi = Object.keys(IZINLI_REVALIDATE).length;
console.log(
  `[isr-koruma] TAMAM — ${toplamRota} prerender rotasının tamamı süreyle eskimiyor` +
    (izinliSayisi > 0 ? ` (${izinliSayisi} bilinçli istisna hariç).` : ".")
);
