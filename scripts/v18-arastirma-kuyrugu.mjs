/**
 * Kalan araştırmaların ÖNCELİK SIRALI kuyruğunu çıkarır. SALT OKUNUR.
 *
 *   A grubu : uyumluluk kanıtı bekleyen ürünler ("A Grubu Teknik Eksikler"te
 *             `Makine Modeli` boş olanlar)
 *   B grubu : "V18 Sonraki Araştırma" (katalog tarama sırası)
 *
 * Öncelik: Volvo ve Champion greyder ürünleri önce (kullanıcı kararı).
 *
 * ÇIKTI: scripts/veri/arastirma-kuyrugu.json  (+ ekrana özet)
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const S = (r, c) => String(r[c] ?? "").trim();
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });

const EKSIK = sh("A Grubu Teknik Eksikler");
const WK = sh("Web Katalog Adayları");
const SONRAKI = sh("V18 Sonraki Araştırma");
const UYUM = sh("Makine Uyumluluğu");

const uyumluKimlik = new Set(UYUM.map((u) => S(u, "Araştırma Kimliği")));

/*
 * A grubunda UYUMLULUK BEKLEYEN ürün = katalog referansı BULUNAN ama
 * kanıtlı makine uyumu OLMAYAN aday. Ölçüm "Web Katalog Adayları" üzerinden
 * yapılır: 580 adayın 476'sında uyum kanıtı var, 104'ünde YOK.
 *
 * ("A Grubu Teknik Eksikler" sayfasındaki `Makine Modeli` kolonu bu ayrımı
 * vermiyor — o kolona göre ölçüm 0 çıkıyor, yanıltıcı.)
 */
const eksikByKimlik = new Map(EKSIK.map((r) => [S(r, "Araştırma Kimliği"), r]));
const aUyumBekleyen = WK.filter(
  (r) =>
    S(r, "Katalog Referansı") &&
    !S(r, "Kanıtlı Makine Modelleri") &&
    !uyumluKimlik.has(S(r, "Araştırma Kimliği"))
);
console.log("A grubu toplam: " + EKSIK.length);
console.log("A grubu UYUMLULUK BEKLEYEN: " + aUyumBekleyen.length);
console.log("B grubu (V18 Sonraki Araştırma): " + SONRAKI.length);

const volvoMu = (s) => /volvo|champion/i.test(s);

const aKuyruk = aUyumBekleyen.map((r) => {
  const ek = eksikByKimlik.get(S(r, "Araştırma Kimliği"));
  return {
    grup: "A",
    kimlik: S(r, "Araştırma Kimliği"),
    logoKodu: S(r, "Orijinal Logo Stok Kodu"),
    partNumber: S(r, "Katalog Referansı"),
    ad: S(r, "Teknik Ad TR"),
    seviye: S(r, "Seviye"),
    markaIpucu: S(r, "Marka İpucu"),
    kategori: S(r, "Teknik Kategori"),
    eksik: "kanıtlı makine uyumluluğu",
    v18Eksik: S(r, "Eksik Bilgiler"),
    kaynakUrl: S(r, "Kaynak URL"),
    sonrakiKontrol: ek ? S(ek, "Sonraki Kontrol") : S(r, "Sonraki Kontrol"),
    oncelik: volvoMu(S(r, "Marka İpucu") + " " + S(r, "Teknik Ad TR") + " " + S(r, "Katalog Referansı")) ? 1 : 2,
  };
});
const aMarka = new Map();
for (const a of aKuyruk) aMarka.set(a.markaIpucu || "(bos)", (aMarka.get(a.markaIpucu || "(bos)") ?? 0) + 1);
console.log("A kuyrugu marka dagilimi:");
for (const [m, s2] of [...aMarka].sort((x, y) => y[1] - x[1])) console.log("  " + String(s2).padStart(4) + "  " + m);

const bKuyruk = SONRAKI.map((r) => ({
  grup: "B",
  sira: Number(S(r, "Sıra")) || 0,
  katalogGrubu: S(r, "Katalog Grubu"),
  kimlik: S(r, "Araştırma Kimliği"),
  logoKodu: S(r, "Orijinal Ürün Kodu"),
  ad: S(r, "Orijinal Ürün Adı"),
  markaIpucu: S(r, "Marka İpucu"),
  kategori: S(r, "Teknik Kategori"),
  arananReferans: S(r, "Aranacak Referans"),
  dayanak: S(r, "Öncelik Dayanağı"),
  oncelik: volvoMu(S(r, "Marka İpucu") + " " + S(r, "Katalog Grubu")) ? 1 : 2,
}));

const bMarka = new Map();
for (const b of bKuyruk) bMarka.set(b.markaIpucu || "(bos)", (bMarka.get(b.markaIpucu || "(bos)") ?? 0) + 1);
console.log("\nB grubu marka dagilimi:");
for (const [m, s] of [...bMarka].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log("  " + String(s).padStart(5) + "  " + m);
}
console.log("\nVolvo/Champion onceligi: A " + aKuyruk.filter((x) => x.oncelik === 1).length +
  " | B " + bKuyruk.filter((x) => x.oncelik === 1).length);

const kuyruk = {
  uretildi: new Date().toISOString(),
  kaynak: "NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx",
  a: aKuyruk.sort((x, y) => x.oncelik - y.oncelik),
  b: bKuyruk.sort((x, y) => x.oncelik - y.oncelik || x.sira - y.sira),
};
writeFileSync("scripts/veri/arastirma-kuyrugu.json", JSON.stringify(kuyruk, null, 1), "utf-8");
console.log("\nyazildi: scripts/veri/arastirma-kuyrugu.json (A " + aKuyruk.length + " + B " + bKuyruk.length + ")");
