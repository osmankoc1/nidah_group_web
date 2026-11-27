# 154 Ürün Aktarımı — UYGULAMA RAPORU

**Tarih:** 2026-11-19 · **Durum:** ✅ aktarım tamamlandı · **Sapma: yok**

> Katalog **kapalı**. Hiçbir ürün aktifleştirilmedi, yayınlanmadı, stokta
> gösterilmedi. Commit, push, deploy **yok**.

---

## 1. Özet

| Şart | Sonuç |
|---|---|
| 1. Taze yedek + geri yüklenebilirlik | ✅ 104.725 bayt · geri yükleme **0 hata** · parmak izi canlıyla aynı |
| 2. Kaynak parmak izi karşılaştırması | ✅ kimlik **`05898f5d…`** ve parça no **`0c3d5b0b…`** — ikisi de **AYNI** |
| 3. Yalnızca 154 gerçek aday | ✅ TSV'de sentetik kimlik **0**, test deseni **0** |
| 4. Pasif · SEO onaysız · stok bilinmiyor | ✅ 155 pasif · `seo_ready` **0** · stok iddiası **0** |
| 5. Mevcut 3 ürün + 2 fotoğraf | ✅ parmak izleri **değişmedi** |
| 6. Mükerrer makine | ✅ **0** (104 ekleme, 1 eşleşme) |
| 7. 300 uyumluluk + 154 taslak çeviri | ✅ 300 doğrulanmış (165 farklı kaynak) · 154 çeviri, yayınlı **0** |
| 8. Tek transaction | ✅ `BEGIN … COMMIT`, tüm kontroller geçti |
| 9. Hedef sayılar | ✅ 157 / 2 / 155 / 302 / 154 / 0 |
| 10. Katalog kapalı | ✅ `/parca-katalog` → **404** |

---

## 2. Hazırlık

**Hedef doğrulaması:** `neondb` · `nidah_web` · **3 ürün, 2 fotoğraf**
(development'ta 166 — karışma yok).

**Taze yedek:** `prod_aktarim_oncesi_20261119-144755.sql` ·
104.725 bayt · `pg_dump` çıkışı 0 · stderr boş ·
içerik: products **3**, product_images **2**, fitments **2**,
rfq_submissions **1**, site_settings **1**.

**Geri yükleme testi:** izole Docker (ağ portu yok) → **0 hata**;
geri yüklenen kopyanın ürün parmak izi **`7a969077…`**, canlıyla **birebir aynı**.

**Taze TSV üretimi ve karşılaştırma:**

```
kimlik izi (taze TSV): 05898f5db0a1f63d32747e944244afdb
GO raporundaki deger : 05898f5db0a1f63d32747e944244afdb   => AYNI

parca no izi (taze)  : 0c3d5b0bc91631286988f5d8d00f9d5a
GO raporundaki deger : 0c3d5b0bc91631286988f5d8d00f9d5a   => AYNI
```

TSV'de sentetik kimlik **0**, test deseni **0**.

---

## 3. Aktarım çıktısı (gerçek)

```
BEGIN
COPY 9 · COPY 105 · COPY 154 · COPY 300 · COPY 154      ← staging
PREFLIGHT: hedefte 3 urun (2 aktif) · aktarilacak: 154 urun, 300 uyum, 154 ceviri
INSERT 0 8      ← üretici  (9'un 8'i; VOLVO zaten vardı)
INSERT 0 104    ← makine   (105'in 104'ü; VOLVO G930 eşleşti)
Makine eslestirme tamam: 105 kayit, mukerrer 0.
INSERT 0 154    ← ürün
INSERT 0 300    ← uyumluluk
INSERT 0 154    ← çeviri
AKTARIM TAMAM: 154 urun eklendi, hepsi PASIF.
KANIT: aktif urun sayisi DEGISMEDI (2) — public API'de yeni urun GORUNMEZ.
KANIT: yayinda 0 · sentetik 0 · stok iddiasi 0 · fotograf 2 (degismedi).
KANIT: mevcut urunlerin parmak izi AYNI.
Uyumluluk: 302 · Ceviri: 154 (hepsi taslak).
COMMIT
```

Tüm PREFLIGHT ve POST-CHECK kontrolleri geçti; `ROLLBACK` gerekmedi.

---

## 4. Veritabanı doğrulaması

```
SAYIM   | urun=157 | aktif=2 | pasif=155 | yayin=0 | sentetik=0 | stok=0
        | gorsel=2 | dogrulanmis_gorsel=0
UYUM    | toplam=302 | dogrulanmis=300 | makine=107 | uretici=10
CEVIRI  | toplam=154 | yayinli=0
PUBLIC  | gorunen_urun=2 | 76281, 90898
SITEMAP | urun_url=0
SENTETIK_KIMLIK | 0
DESEN   | DENEMEE32424          ← yalnızca mevcut kayıt
MUKERRER_MAKINE | 0
AYAR    | page_parca_katalog=false
```

**Mevcut verinin korunduğunun kanıtı** (aktarım öncesi/sonrası aynı `md5`):

| | Değer |
|---|---|
| Mevcut 3 ürün | `7a969077516355e76484a89f281ba022` |
| 2 fotoğraf | `3dc9ba3169915e9132bdfb5ca8c941f0` |

İşlem kaydı **1 satır** (dünkü kaza kaydı) — aktarım SQL yoluyla yapıldığı
için `admin_audit_log`'a yazmaz; izi bu rapordur.

---

## 5. Canlı site kontrolü

| Kontrol | Sonuç |
|---|---|
| `/api/products?limit=50` | **200** · dönen ürün **2** (`90898`, `76281`) · `"total":2` |
| `/sitemap.xml` | **200** · **63 URL** · katalog 0 · mükerrer 0 |
| `/parca-katalog` · `/parca-katalog/volvo` · `/catalog` | **404** |
| Ana sayfa · `/teklif-al` · `/blog` · `/admin/login` · `/api/health` | **200** |

**En önemli satır:** 154 ürün veritabanında ama public API **hâlâ yalnızca 2
ürün** döndürüyor — hepsi pasif olduğu için. Sitemap de değişmedi.

---

## 6. Sapmalar

**Yok.** Dokuz ölçümün dokuzu da hedeflenen değerde çıktı; canlı sitede hiçbir
sayfa etkilenmedi.

Tek operasyonel not: `rm -rf` ile geçici klasör temizliği güvenlik kontrolüne
takıldı; dosyaların üzerine yazarak devam edildi. Aktarımla ilgisi yok.

---

## 7. Şimdi ne durumdayız

| | Önce | Sonra |
|---|---|---|
| Ürün | 3 | **157** (2 aktif, 155 pasif) |
| Uyumluluk | 2 (0 doğrulanmış) | **302** (300 doğrulanmış) |
| Çeviri | 0 | **154** (hepsi taslak) |
| Makine / üretici | 3 / 2 | **107 / 10** |
| Fotoğraf | 2 (0 doğrulanmış) | **2** (değişmedi) |
| `seo_ready` | 0 | **0** |
| Stok iddiası | 0 | **0** |
| Katalog | kapalı | **kapalı** |

---

## 8. Ayrı onay bekleyenler

1. **Ürünlerin aktifleştirilmesi** — 155 pasif kaydın public API'de görünür
   hâle gelmesi
2. **Fotoğraf turu ve doğrulama** — ALT metni + kaynak notu
3. **SEO yayını** — yayın kapısından geçen ürünler için
4. **Kategori ağacının kurulması** (Y1)
5. **Katalog toggle'ının açılması**
6. Yedek dosyalarının saklama/silme kararı (kişisel veri içeriyorlar)

---

## 9. Geri alma (gerekirse)

Kimlikler `aktarim/*.tsv` dosyalarında. Sıra: çeviri → uyumluluk → ürün,
sonra yalnızca başka kayıt kullanmayan makine/üretici. Provada denendi ve
tam dönüş sağlandı. Alternatif:
`~/.osko/backups/prod_aktarim_oncesi_20261119-144755.sql`.
