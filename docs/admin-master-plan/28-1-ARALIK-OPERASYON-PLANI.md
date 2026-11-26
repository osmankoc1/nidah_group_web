# 1 Aralık Sonrası Yayın Operasyon Planı

**Tarih:** 2026-11-26 · **Durum:** plan · **hiçbir adım uygulanmadı**

> Bu bir **plan** belgesidir. 1 Aralık'tan önce production migration, toplu
> ürün aktarımı ve toplu önbellekleme **başlatılmaz**. Her adımın başında
> hangi onayın gerektiği yazılıdır.
>
> Planın hedefi: **5.000 ürünü güvenilir şekilde, en kısa sürede yayınlamak.**
> Bu yüzden adımlar "önce kanıt, sonra hacim" sırasına dizildi: küçük bir
> grup yayınlanıp ölçülmeden toplu yayına geçilmez.

---

## 0. Önkoşul — kota yenilenmesinin DOĞRULANMASI

Neon ücretsiz paketinde 100 CU-saat **proje başına** ve **faturalama dönemi
başına**dır. Kota bitince compute **askıya alınır** (veri silinmez). Son
ölçüm (2026-11-25): kalan **3,14 CU-saat**.

**Adım 0.1 — kullanıcı yapar.** Neon panelinde **Billing → Usage** açılır ve
şu üçü not edilir: dönem başlangıç tarihi, kullanılan CU-saat, kalan CU-saat.

**Geçiş koşulu:** kalan CU-saat **≥ 80**. Bu sağlanmadan 1. adıma geçilmez.

> Neden 80: aşağıdaki bütün adımların toplam tahmini maliyeti **1–4 CU-saat**
> aralığındadır (ölçülen ısıtma: 0,04–0,31; migration: saniyeler; içe aktarım:
> **ölçülmedi**). 80 CU-saat, ölçülmemiş kalemler 10 kat yanılsa bile ayın
> kalanını güvenle taşır.

**Adım 0.2 — ölçülebilir başlangıç çizgisi.** Kullanıcı **Monitoring →
Compute (son 24 saat)** ekran görüntüsünü alır. Bu, aktarım ve ısıtmanın
gerçek maliyetini ölçmenin tek yoludur; sonradan alınamaz.

---

## 1. Trigram migration `0014` — production'a uygulama

**Onay:** canlı DB şema değişikliği → **ayrı ve açık onay** (global CLAUDE.md §2).

### 1.1 Neden ve ne zaman

Ölçüldü (yerel `postgres:17`, production Neon PG 17.11 ile birebir):

| Senaryo | 157 satır (bugün) | 5.000 | 50.000 |
|---|---|---|---|
| Tam parça no | önemsiz | 5,54 → **0,43 ms** | 57,12 → **0,84 ms** |
| Kısmi / infix | önemsiz | 5,46 → **0,42 ms** | 58,59 → **0,57 ms** |
| Ad benzerliği | önemsiz | 5,76 → **1,22 ms** | 57,25 → **12,08 ms** |

**5.000 ürün için trigram zorunlu değildir** (5,5 ms kabul edilebilir), ama
`0014` yalnızca indeks ekler, geri alınması tek adımdır ve 50.000'e giden
yolda tek seferde yapılacak iştir. **Toplu aktarımdan ÖNCE** uygulanması
tercih edilir: 157 satırda indeks kurulumu saniyenin altındadır, 50.000
satırda **1.602 ms** ölçüldü.

**Not:** `0014` yalnızca indeks ekler, kolon/kısıt/veri değiştirmez. Bu yüzden
projedeki "migration önce, kod sonra" zorunluluğu bu dosya için geçerli
değildir — kod bu indeks olmadan da **doğru** çalışır, yalnızca yavaş olur.

### 1.2 Yedek ve geri dönüş

| | |
|---|---|
| Yedek | `pg_dump` ile tam yedek; bayt sayısı ve tablo sayısı rapora yazılır |
| Geri yüklenebilirlik | izole Docker konteynerine (ağ portu yok) geri yükleme, **0 hata** şartı |
| Geri dönüş | `DROP INDEX IF EXISTS` × **4** — tek adım, veri kaybı yok |

Geri alma komutları (dosyanın kendi yorumunda **üç** indeks sayılmış; dördüncü
atlanmış, buraya tamamı yazıldı):

```sql
DROP INDEX IF EXISTS idx_products_pn_norm_trgm;
DROP INDEX IF EXISTS idx_products_name_trgm;
DROP INDEX IF EXISTS idx_products_pn_raw_trgm;
DROP INDEX IF EXISTS idx_oem_number_norm_trgm;
```

`pg_trgm` eklentisi bırakılır (başka indeks kullanıyor olabilir); kaldırmak
gerekirse `DROP EXTENSION IF EXISTS pg_trgm;`.

### 1.3 Uygulama

`CREATE EXTENSION` **owner bağlantısı** gerektirir — sınırlı `nidah_web`
rolüyle çalışmaz (dosyanın kendi notu). Bağlantı `~/.osko/*.env` dosyasından
okunur, hiçbir çıktıya yazdırılmaz. Hedef uç nokta çalıştırmadan önce
doğrulanır:

```sql
SELECT current_database(), current_user, (SELECT COUNT(*) FROM products);
-- beklenen: neondb · owner rolü · 157
```

Sonra idempotent dosya elle çalıştırılır (`drizzle-kit push` **kullanılmaz**):

```bash
docker run --rm -i -e DATABASE_URL -e PGCLIENTENCODING=UTF8 postgres:17 \
  sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f -' < drizzle/0014_part_search_trgm.sql
```

### 1.4 Doğrulama

| Kontrol | Beklenen |
|---|---|
| `pg_indexes` içinde 4 trigram indeksi | **4/4** |
| `pg_extension` içinde `pg_trgm` | **var** |
| `EXPLAIN` — `part_number_normalized LIKE '%…%'` | Bitmap Index Scan (az satırda Seq Scan normaldir) |
| Mevcut verinin parmak izi | migration **öncesi = sonrası** |
| Canlı site | sitemap **63 URL**, katalog **0**, katalog yolları **404** |
| Depolama artışı | 50.000 satırda ölçülen **+11,4 MB**; 157 satırda önemsiz |

**Durma kuralı:** herhangi bir kontrol beklenenden saparsa indeksler düşürülür
ve rapor yazılır. Yeni commit oluşturulmaz, kod değiştirilmez.

---

## 2. Doğrulanmış ürünlerin kontrollü içe aktarılması

**Onay:** canlı DB'ye veri yazma → **ayrı ve açık onay**.

### 2.1 Ön şart: ürünler zaten production'da

**Önemli:** 154 ürün 2026-11-19'da production'a **zaten aktarıldı**
(`14-AKTARIM-RAPORU.md`). Production'da **157 ürün** var; **155'i pasif**,
`seo_ready` **0**. Yani bu adım yeni veri taşımak değil, **mevcut pasif
kayıtları yayına hazırlamak**tır.

5.000 ürün hedefi için kalan asıl iş: **yeni kaynak verinin** aynı denetim
zincirinden geçirilmesi (parmak izi karşılaştırması → pasif aktarım → açıklama
→ fotoğraf doğrulama → SEO onayı).

### 2.2 Her içe aktarım partisinin değişmez kuralları

`14-AKTARIM-RAPORU.md`'de uygulanan ve işe yaradığı kanıtlanan on şart
korunur:

1. Taze tam yedek + izole geri yükleme testi (**0 hata**)
2. Kaynak parmak izi karşılaştırması (kimlik ve parça no ayrı ayrı)
3. Sentetik/test kaydı **0** doğrulaması
4. Aktarım **pasif**, `seo_ready = false`, stok iddiası **yok**
5. Mevcut kayıtların parmak izi **değişmedi** kontrolü
6. Mükerrer makine **0**
7. Tek `BEGIN … COMMIT` — kısmi aktarım yok
8. Hedef sayıların önceden yazılması, sonra karşılaştırılması
9. Katalog **kapalı** kalır (`/parca-katalog` → 404)
10. Commit/push/deploy **yok**

### 2.3 Parti büyüklüğü ve ölçüm

| Parti | Ürün | Neden |
|---|---|---|
| P0 | **mevcut 155 pasif** | Yeni veri yok; yalnızca açıklama + SEO onayı işi |
| P1 | 250 | İlk gerçek ölçüm partisi: CU-saat, süre, hata oranı |
| P2 | 1.000 | P1'in ölçümü sapmasız çıkarsa |
| P3 | kalan | P2 sonrası karar |

Her partiden sonra **ölçülen** değerler yazılır: geçen süre, Neon CU-saat
farkı, eklenen satır sayısı, depolama farkı (`pg_total_relation_size`).

> **Ölçülmedi:** içe aktarımın CU-saat maliyeti. Tek `COMMIT` içinde 250–1.000
> satırlık yazma Neon'da saniyeler sürer, ama **tahmin edilmeyecek** — P1
> sonrası ölçülüp buraya yazılacak.

---

## 3. Ürünlerin kademeli yayınlanması

**Onay:** katalog toggle'ının açılması → **ayrı ve açık onay** (proje
CLAUDE.md §2: katalog bilinçli olarak KAPALI).

### 3.1 Yayın kapısı zaten var

Bir ürün public yüzeye yalnızca `isActive && seoReady` ise çıkar
(`src/app/sitemap.ts`). Yani **toggle açılsa bile** SEO onayı verilmemiş
ürünler sitemap'e girmez. Kademeli yayının mekanizması budur: toggle bir kez
açılır, ürünler `seo_ready` ile parça parça yayına alınır.

### 3.2 Sıra

| Adım | İçerik | Doğrulama |
|---|---|---|
| 3.2.1 | **10 ürünlük pilot** — `seo_ready = true` | 10 ürün sayfası 200, canonical 1, JSON-LD geçerli, sitemap 63 → **73** |
| 3.2.2 | Katalog toggle'ı **admin panelinden** aç | `/parca-katalog` 404 → **200**; `revalidateTag` + `revalidatePath` çalıştı mı |
| 3.2.3 | Pilotun ısıtılması (§4) | 10 URL, `prova` sonra gerçek |
| 3.2.4 | **48 saat bekle**, ölç | Neon CU-saat, Vercel ISR yazma, GSC taranma |
| 3.2.5 | **Toplu yayın kararı** (§6) | 3.2.4'ün sayılarına göre |

> **Toggle yalnızca admin panelinden değiştirilir.** Elle SQL ile değiştirilirse
> önbellek kendiliğinden tazelenmez (proje CLAUDE.md "Önbellek mimarisi"); bu
> 2026-11-26 ölçümünde **doğrulandı**: DB'de `false` yazıldığı hâlde statik
> `/parca-katalog` sayfası 200 dönmeye devam etti.

---

## 4. Kontrollü önbellek ısıtma

**Onay:** production'da toplu önbellekleme → **ayrı ve açık onay**.

### 4.1 Ne zaman

Yayın anından **hemen sonra** — ama 3.2.2'den önce değil. Isıtma sitemap'i
okur; sitemap'te olmayan URL ısıtılmaz.

### 4.2 Komut sırası

```powershell
node scripts/onbellek-isitma.mjs --taban https://www.nidahgroup.com.tr --prova
```

Prova çıktısı kontrol edilir (URL sayısı, tahmini süre, tahmini CU-saat),
sonra gerçek koşu:

```powershell
node scripts/onbellek-isitma.mjs --taban https://www.nidahgroup.com.tr
```

Varsayılanlar bilinçli olarak **en güvenli** değerlerdedir: eşzamanlılık **1**,
istek aralığı 200 ms, hata oranı tavanı %2, süre tavanı 90 dk, CU-saat tavanı
1,5. Kesilirse `--devam` kaldığı yerden sürer.

### 4.3 Ölçülen beklentiler

| | 5.000 sayfa | 50.000 sayfa |
|---|---|---|
| Süre (ölçülen ~20 istek/sn) | **~4,2 dk** | **~41,7 dk** |
| CU-saat (ölçülen aralık) | **0,04 – 0,31** | **0,19 – 1,56** |
| Vercel ISR yazma | 5.000 | 50.000 |

### 4.4 Durma kuralları

Script dört tavandan biri aşılınca kendiliğinden durur. Ek olarak **elle
durdurma** şartları:

- `/api/health` `database: "error"` dönerse
- Neon panelinde CU kullanımı dakikada 0,05 CU-saatten hızlı artıyorsa
- 404 oranı %2'yi geçerse (bu durumda sebep **araştırılır**, eşzamanlılık
  artırılmaz)

---

## 5. Neon tüketiminin ölçülmesi

Her adımın başında ve sonunda **kullanıcı** şunu not eder (Claude Neon
paneline erişemez):

| Zaman | Ne | Nereden |
|---|---|---|
| Adım öncesi | kalan CU-saat | Billing → Usage |
| Adım sonrası | kalan CU-saat | Billing → Usage |
| Adım sonrası | compute eğrisi | Monitoring → Compute (son 24 saat) |

Fark = o adımın **gerçek** maliyeti. Bu, planın bütün CU-saat tahminlerini
ölçüme çevirir ve bir sonraki parti büyüklüğü kararının tek dayanağıdır.

**Depolama ayrı izlenir:** ücretsiz paket **1 GB/proje** ve aşılırsa
**yazma durur**. 50.000 ürün için ölçülen tablo boyutu **170 MB** (trigram
dahil) — sınırın %17'si. Fotoğraf Cloudinary'de, DB'de değil.

---

## 6. Sitemap ve SEO doğrulaması

Her yayın adımından sonra, aynı sırayla:

| Kontrol | Beklenen |
|---|---|
| `/sitemap.xml` | 200, `application/xml`, **URL sayısı = 63 + yayınlanan ürün**, tekrar **0** |
| Katalog URL'leri sitemap'te | toggle açıkken yayınlanan ürün sayısı kadar |
| Ürün sayfası | 200, `X-Nextjs-Prerender: 1` |
| Ürün sayfası (2. istek) | `X-Vercel-Cache: HIT`, `Age` > 0 |
| Canonical | her sayfada **tam 1** |
| `Organization` | **tam 1** |
| hreflang (blog) | **5** (tr, en, ru, ar, x-default) |
| JSON-LD | `JSON.parse` ile geçerli, `Product` şeması dolu |
| `/blog/tr` · `/en/blog` | **308** |
| Yayınlanmamış ürün | sitemap'te **yok**, sayfası **404** |

> `s-maxage=31536000` **canlıda görülmez** — o yerel `next start` başlığıdır.
> Vercel tarayıcıya `public, max-age=0, must-revalidate` gönderir; ISR kanıtı
> `X-Nextjs-Prerender: 1` + `X-Vercel-Cache: HIT` + `Age > 0` üçlüsüdür.

**48 saat sonra, kullanıcı:** Google Search Console → Sayfalar → "Dizine
eklendi" sayısı ve "Taranan ama dizine eklenmeyen" sayısı. Bu, pilotun
gerçekten indekslendiğinin tek kanıtıdır.

---

## 7. İlk küçük gruptan sonra toplu yayın kararı

Karar **ölçüme** bağlanır. 10 ürünlük pilot + 48 saat sonunda:

| Ölçüt | Eşik | Sağlanmazsa |
|---|---|---|
| Pilot ürün sayfaları | 10/10 → 200 | Sapma araştırılır, yayın durur |
| Yanlış 404 | **0** | `site_settings` okuma hatası loglarına bakılır |
| Neon CU-saat (48 s) | pilot öncesine göre artış **< 2 CU-saat** | Parti büyüklüğü düşürülür |
| Vercel ISR yazma | beklenen = yayınlanan sayfa sayısı ± %10 | Zaman tabanlı ISR sızıntısı aranır |
| Sitemap | 73 URL, tekrar 0 | Yayın durur |
| GSC | taranmaya başladı | Beklenir, hacim artırılmaz |
| Arama kapısı | `X-Arama-Kapi` başlığında `bos:` oranı makul | Sözlük boyutu kontrol edilir |

**Beşi birden** sağlanırsa 250 → 1.000 → kalan sırasıyla devam edilir; her
basamakta aynı tablo yeniden doldurulur.

---

## 8. Bu plandaki ölçülmemiş kalemler (dürüstlük notu)

1. **İçe aktarım CU-saat maliyeti** — P1 (250 ürün) sonrası ölçülecek.
2. **Vercel ISR yazma kotası** — Hobby/Pro için dahil edilen ISR yazma miktarı
   resmî belgede **belirtilmiyor**. Runtime Cache için Hobby: 1M okuma /
   200K yazma. Isıtma 50.000 yazma üretir, yani tek koşu kotanın %25'i.
3. **Vercel ISR deposunun 404 davranışı** — geçici arızada üretilen 404'ün
   Vercel'de kalıcı önbelleğe yazılıp yazılmadığı **yerelde** ölçüldü
   (yazılmıyor), Vercel'de doğrulanamadı (katalog kapalı).
4. **LCP / CLS / INP ve Lighthouse** — bu projede hiç ölçülmedi.
5. **Prosis canlı katalog** (`/catalog`) — connector erişilemez
   (`/api/health` → `prosis: "error"`). Bu plan onu kapsamıyor.
