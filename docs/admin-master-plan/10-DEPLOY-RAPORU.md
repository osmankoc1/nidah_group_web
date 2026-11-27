# Production Deploy — RAPOR

**Tarih:** 2026-11-18 · **Yayınlanan sürüm:** `3a13485` · **Durum:** ✅ başarılı

---

## 1. Özet

| | |
|---|---|
| Branch / remote | `main` → `origin/main` (`osmankoc1/nidah_group_web`) |
| Gönderilen commit | **`3a13485`** (tek commit) · `5497e9b..3a13485` |
| Gönderilmeyen | `scripts/` altındaki **33 yardımcı dosya** (izlenmiyor) |
| Vercel deploy | otomatik · **~80 saniyede** yayında |
| Kesinti | **yok** |
| Geri dönüş gerekti mi | **hayır** |

---

## 2. Yayına çıkanın kanıtı

Release marker (`/api/health` → `version`) bu projede tanımlı olmadığı için
davranış farkıyla doğrulandı. Deploy öncesi `/api/products` **doğrulanmamış
2 fotoğrafın Cloudinary URL'sini** döndürüyordu; yeni kodda doğrulanmamış
fotoğraf public yüzeye çıkmaz (karar K2):

```
deploy öncesi : "imageUrl":"https://res.cloudinary.com/…"   (2 üründe)
deploy sonrası: "imageUrl":null                              (0 üründe)
```

Yanıta ayrıca yeni `stockStatus` alanı eklendi (`"stockStatus":"unknown"`).

> **Düzeltme (2026-11-18):** Bu raporun ilk hâlinde `/api/admin/categories`
> ve `/api/admin/products/bulk` uçlarının **401** dönmesini "yeni rotalar
> yayında" kanıtı saymıştım. **Bu çıkarım yanlıştı:** `src/proxy.ts`
> `/api/admin/**` altındaki her isteği rotalamadan ÖNCE kesiyor, bu yüzden
> VAR OLMAYAN bir admin ucu da 401 döner (ölçüldü:
> `/api/admin/boyle-bir-uc-yok` → 401). Aynı şekilde `/admin/**` altındaki
> her yol — olmayanlar dahil — 307 ile giriş sayfasına yönlendiriliyor.
> Deploy'un kanıtı yalnızca yukarıdaki **public davranış değişikliğidir**.

---

## 3. Canlı site kontrolleri

| Sayfa / uç | Durum | Süre |
|---|---|---|
| Ana sayfa `/` | **200** | 0,79 s |
| Admin paneli `/admin/login` | **200** | 0,59 s |
| Ürün API `/api/products?limit=3` | **200** | 0,21 s |
| `/sitemap.xml` | **200** | 0,19 s |
| Teklif `/teklif-al` | **200** | 0,51 s |
| Blog `/blog` | **200** | 1,53 s |
| Blog EN `/blog/en` | **200** | 2,47 s |
| `/hizmetler` · `/iletisim` | **200** | — |
| `/robots.txt` | **200** | — |
| `/api/health` | **200** · `database: ok` | 0,31 s |

**Yönlendirmeler:** `/blog/tr` → **308** · `/en/blog` → **308** (korundu).

**Sitemap:** 200 · `application/xml` · **63 URL** · katalog URL **0** ·
mükerrer **0** · görsel girdisi **0** (doğrulanmış fotoğraf olmadığı için —
beklenen davranış).

**Yetkilendirme:** `/api/admin/**` altındaki tüm uçlar → **401**;
`/admin/**` altındaki tüm sayfalar → **307** (giriş sayfasına). Koruma
çalışıyor; ancak bu kodlar rotanın VAR OLDUĞUNU kanıtlamaz (yukarıdaki
düzeltme).

---

## 4. Katalog kapalı (doğrulandı)

| URL | Durum |
|---|---|
| `/parca-katalog` | **404** |
| `/parca-katalog/volvo` | **404** |
| `/parca-katalog/ch-76281` | **404** |
| `/catalog` | **404** |

Veritabanında `page_parca_katalog = false` — değişmedi.

---

## 5. Veritabanı (deploy sonrası, salt okunur)

Migration öncesi yedekle karşılaştırma:

```
URUN   | 3 | 3acacb6be7eaf82ecbe42e71a5750259   ← aynı
GORSEL | 2 | d41da976722967b5f0942f0413d2d8b9   ← aynı
UYUM   | 2 | 6e1355b8fd5e8ac11de4223f1aafb01e   ← aynı
RFQ    | 1 | 9d16fe75064da0310a60e662ed04001b   ← aynı
AYAR   | 1 | f5ba3a24190c252cfbf566315b808870   ← aynı
DURUM  | aktif=2 | yayin=0 | stok=0
KATALOG| false

KANIT: deploy sonrasi da veri BIREBIR AYNI
```

| Kontrol | Değer |
|---|---|
| Doğrulanmış fotoğraf | **0** |
| Sentetik işaretli ürün | **0** |
| İşlem kaydı (`admin_audit_log`) | **0** |
| Yeni migration / veri değişikliği | **YOK** |

---

## 6. Sorunlar

**Kritik hata yok.** Deploy sırasında ve sonrasında hiçbir sayfa bozulmadı.

| # | Gözlem | Değerlendirme |
|---|---|---|
| 1 | `/api/health` → `version: "unknown"` | Release marker ortam değişkeni tanımlı değil. Önceden de böyleydi; doğrulama davranış farkıyla yapıldı |
| 2 | `/api/health` → `prosis: "error"` | **Önceden mevcut**; Prosis connector erişilemez (proje CLAUDE.md §3'te yazılı) |
| 3 | Sitemap'te görsel girdisi 0 | Beklenen: doğrulanmış fotoğraf yok |
| 4 | Production'daki 2 fotoğraf artık public yüzeyde görünmez | **Tasarım gereği** (K2). Katalog kapalı olduğu için bugün görünür etkisi yok. Katalog açılmadan önce ALT metni + kaynak notu girilip doğrulanmalı |

---

## 7. Değişmeyenler

- 154 geliştirme ürünü **aktarılmadı** (production'da ürün sayısı **3**)
- Hiçbir ürün **yayına alınmadı** (`seo_ready` = 0)
- Stok bilgisi **değiştirilmedi** (stok iddiası = 0)
- Fotoğraf doğrulama bilgileri **değiştirilmedi** (doğrulanmış = 0)
- Katalog **kapalı**
- Production veritabanında **yeni migration veya veri değişikliği yok**

---

## 8. Geri dönüş (gerekirse)

Gerekmedi. Gerekirse: Vercel'de önceki deployment'a rollback yeterlidir —
şema geriye dönük uyumludur, eski kod yeni kolonları seçmez. Şemayı geri
almak **gerekmez**; gerekirse sırası `07-GECIS-KOSU-KITABI.md` §9'da.
