# 300 Karakter Değişikliği — Deploy ve Canlı Doğrulama Raporu

**Tarih:** 2026-11-20 · **Commit:** `d91764a` · **Durum:** canlıda

> Veritabanında **hiçbir yazma** yapılmadı. Hiçbir ürün aktifleştirilmedi,
> SEO onayı verilmedi, katalog açılmadı. Tüm veritabanı sorguları salt okunur.

---

## 1. Commit ve dağıtım

| | |
|---|---|
| Commit | **`d91764a`** — `feat(seo-gate): 300 karakter yayin sartini kaldir, bos aciklama engelini koru` |
| Push | `5cb1279..d91764a  main -> main` |
| Local `HEAD` = `origin/main` | **eşleşiyor** (`d91764a`) |
| Dağıtım | GitHub → Vercel otomatik; `vercel --prod` çalıştırılmadı |
| Canlıya iniş kanıtı | `/` üzerinde `Age: 97667` → **`Age: 0`, `X-Vercel-Cache: PRERENDER`** (13:15 UTC) |
| Sitemap `lastmod` | `2026-11-19T10:04:53Z` → **`2026-11-20T13:14:36Z`** (yeni build) |

### Commit kapsamı — 13 dosya

Kod (5): `seo-gate.ts`, `bulk-actions.ts`, ürün düzenleme ekranı,
`api/admin/products/route.ts`, `ProductFilterBar.tsx`
Test (5): `seo-gate`, `admin-tabs`, `category-tree`, `translation-gate`,
`bulk-actions`
Belge (3): `01-BULGU-DURUM.md` (yalnızca P8 satırı), `18-` plan, `19-` rapor

**Bilinçli olarak commit DIŞINDA bırakılanlar** (önceki aşamalara ait,
ilgisiz):

- `01-BULGU-DURUM.md` içindeki **Y4 bölümü** (2026-11-19 panel turundan).
  Dosyanın yalnızca P8 satırı stage edildi; Y4 çalışma ağacında duruyor.
- `docs/admin-master-plan/10-` … `17-` (8 belge)
- `scripts/` altındaki 44 geçici betik (`faz3-*`, `aktarim-154-urun.sql` vb.)

### Deploy öncesi kontroller — hepsi geçerli

| Kontrol | Sonuç |
|---|---|
| Stage dışı kod farkı | **yok** (commit edilen kod = test edilen kod) |
| `npx tsc --noEmit` | temiz |
| `npm test` | **514 geçti / 0 başarısız** |
| `npm run lint` | 34 sorun (19 hata, 15 uyarı) — baseline 38, **artış yok** |
| `npm run build` | başarılı, 15.3 s |
| ISR yazma koruması | **31/31 rota süreyle eskimiyor** |
| Şema değişikliği / migration | **yok** — gerekmedi |

---

## 2. Canlı doğrulama sonuçları

### 2.1 Site sağlığı — ✅

`/api/health` → `{"status":"ok","checks":{"database":"ok","prosis":"error"}}`

`prosis: "error"` **önceden de böyleydi** (connector erişilemez, bilinen
durum — proje CLAUDE.md §3).

| Sayfa | Kod |
|---|---|
| `/` · `/hakkimizda` · `/iletisim` · `/teklif-al` | 200 |
| `/blog` · `/sss` · `/hizmetler` · `/robots.txt` | 200 |

### 2.2 Public API yalnızca 2 aktif ürün — ✅

```
GET /api/products → 200
meta: {"page":1,"limit":24,"total":2,"pages":1}
  - 90898 | GAUDE
  - 76281 | KIT
```

Deploy öncesi yanıtla **byte bazında birebir aynı**.

### 2.3 154 yeni ürün pasif — ✅

Production `neondb`, salt okunur:

| | Sayı |
|---|---|
| Toplam ürün | 157 |
| Aktif | **2** (aktarımdan önce de 2) |
| Pasif | 155 |
| **Aktarılan 154 üründen aktif olan** | **0** |
| Aktarılan 154'ten `seo_ready` | **0** |
| Aktarılan 154'ten `in_stock` | **0** |
| Aktarılan 154'ten stok iddiası (`stock_status <> 'unknown'`) | **0** |
| Aktarımdan önceki 3 kayıt | 3 (bozulmadı) |

### 2.4 SEO onaylı ürün sayısı 0 — ✅

`count(*) FILTER (WHERE seo_ready)` → **0** (157 ürünün hiçbiri).

Yeni yayın kapısının tamamı simüle edildiğinde geçen ürün: **0**.

### 2.5 Katalog kapalı, sitemap değişmedi — ✅

| URL | Kod |
|---|---|
| `/parca-katalog` | **404** |
| `/parca-katalog/hidromek` · `/cat` · `/volvo` | **404** |
| `/parca-katalog/ch-76281` | **404** |
| `/catalog` | **404** |

Toggle: `page_parca_katalog = false` · `page_catalog` satırı yok
(varsayılan kapalı).

**Sitemap:**

| | Önce | Sonra |
|---|---|---|
| HTTP / tip | 200 · `application/xml` | 200 · `application/xml` |
| URL sayısı | 63 | **63** |
| Katalog URL | 0 | **0** |
| Mükerrer | 0 | **0** |
| URL kümesi | — | **birebir aynı** (fark yok) |
| `lastmod` | `2026-11-19T10:04:53Z` | `2026-11-20T13:14:36Z` |

`lastmod` dışında **tek bayt fark yok**. Bu damga her build'de yeniden
üretilir; regresyon değil, yeni dağıtımın kanıtı.

**Diğer SEO değişmezleri:**

| Kontrol | Sonuç |
|---|---|
| canonical sayısı (`/`, `/hakkimizda`, `/iletisim`) | her sayfada **1** |
| `Organization` JSON-LD | her sayfada **1** |
| `/blog/tr` | **308** → `/blog` |
| `/en/blog` | **308** → `/blog/en` |

### 2.6 Admin panelinde 300 karakterin tavsiye olarak gösterilmesi — ✅

Kullanıcı canlı panelde iki durumu da doğruladı:

| Ürün | Açıklama | Beklenen | Doğrulandı |
|---|---|---|---|
| `76281` | boş | kehribar: *"yayın için açıklama boş olamaz"* | ✅ |
| `714-12-19320` | 142 karakter | nötr gri: *"önerilen hedef 300 karakter (zorunlu değil)"* | ✅ |

`714-12-19320` kontrolünde ürünün **pasif** ve **SEO yayınının kapalı**
olduğu da teyit edildi.

> İlk denemede seçilen `60335-00200` ürününün açıklaması 469 karakter
> olduğu için 300-altı durumunu göstermiyordu. Salt okunur sorguyla
> aktarılan 154 üründen **42'sinin** 1–299 aralığında olduğu (dağılım
> **142–177 karakter**) belirlendi ve en kısası seçildi.

---

## 3. Düzeltme — önceki raporda hata

`19-ESIK-KALDIRMA-UYGULAMA-RAPORU.md` ilk sürümünde *"hiçbir üründe
doğrulanmış fotoğraf ve uyumluluk yok"* yazıyordu. **Yanlıştı.** Deploy
sonrası ölçüm:

| Kanıt | Sayı |
|---|---|
| Doğrulanmış fotoğraf (`product_images.verified`) | **0** |
| Doğrulanmış uyumluluk (`fitments.verified`) | **300** |

Uyumluluk kanıtı zaten var. Yayın kapısını tek başına tutan şey
**doğrulanmış fotoğraf eksikliği**. Sonuç (0 ürün yayınlanabilir)
değişmiyor, ama gerekçe tek: **fotoğraf turu yayının tek kalan kapısı.**

`19-` raporu düzeltildi; düzeltme **henüz commit edilmedi** (commit ayrı
onay gerektirir).

---

## 4. Beklenmedik durum var mı?

**Hayır.** Dağıtım sırasında veya sonrasında beklenmedik değişiklik, hata
veya regresyon görülmedi. Tek sapmalar şunlar ve ikisi de açıklanabilir:

1. Sitemap `lastmod` damgası değişti — her build'de olur, URL kümesi aynı.
2. `prosis: "error"` — deploy öncesinde de aynı, bilinen connector durumu.

---

## 5. Sonuç

**6/6 doğrulama başarılı. `d91764a` dağıtımı TAMAMLANDI.**

Bu aşama kapatıldı. Katalog hâlâ kapalı, hiçbir ürün aktifleştirilmedi,
SEO onayı verilmedi, veritabanında yazma yapılmadı. Yedekler ve commit
edilmemiş çalışma belgeleri korundu.
