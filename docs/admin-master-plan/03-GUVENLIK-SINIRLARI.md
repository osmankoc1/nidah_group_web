# Güvenlik Sınırları ve Geri Alma — DEĞİŞMEZ

> Bu dosya çalışmanın **anayasasıdır**. Her oturumda ÖNCE okunur.
> İçeriği yalnızca kullanıcının açık talimatıyla değişir.

## 1. Ortam

| | |
|---|---|
| Çalışılan ortam | **YALNIZCA development** |
| Dev veritabanı kimliği | `neondb_owner` (owner) / `nidah_dev` (uygulama) · `site_settings = 0` |
| Dev sunucusu | `http://localhost:3001` (`.claude/launch.json` → `nidah-dev`) |
| Owner bağlantısı | `~/.osko/a3-dev.env` → `DEV_OWNER_URL` (migration için) |
| Uygulama bağlantısı | `.env.local` → `DATABASE_URL` |
| Production | **DOKUNULMAZ** |

**Her DB işleminden önce hedef doğrulaması zorunlu:**

```sql
select current_user, (select count(*) from products), (select count(*) from site_settings);
-- Beklenen DEV imzası: urun >= 100 VE site_settings = 0
-- site_settings > 0 görülürse DUR — bu production olabilir.
```

## 2. Kesin yasaklar

- ❌ Production veritabanına dokunma
- ❌ `git commit`, `git push`, deploy
- ❌ Production'a migration uygulama
- ❌ Gerçek ürün içeriklerini, stoklarını, fotoğraflarını, uyumluluklarını değiştirme
- ❌ Ürünleri otomatik yayına alma (`seo_ready = true` yazma)
- ❌ SEO yayın kapısını gevşetme
- ❌ Placeholder görselleri doğrulanmış fotoğraf sayma
- ❌ Stok durumunu varsayımla değiştirme
- ❌ Şifre, token, gizli anahtar, bağlantı dizesi yazdırma/loglama
- ❌ Geri alınamaz veya kapsam dışı işlem (onaysız)

## 3. Korunacak değişmezler

| Değişmez | Referans değer (2026-11-17, Faz 0) |
|---|---|
| Toplam ürün | **166** |
| Gerçek ürün adayı | **154** |
| Sentetik test kaydı | **12** (hepsi `is_active = false`; `0012` sonrası `is_synthetic = true`) |
| Doğrulanmış ürün fotoğrafı | **0** |
| Toplam fotoğraf | **0** |
| SEO yayın onayı (`seo_ready`) | **0** |
| Stok iddiası (`stock_status <> 'unknown'`) | **0** |
| `in_stock = true` | **0** |
| Makine uyumluluğu | **305** (305'i doğrulanmış) |
| Çeviri | **156** (yayınlanmış: **0**) |
| Makine / üretici | **108 / 11** |
| OEM numarası | **1** |
| Kategori | **0** (hiçbir ürün kategorili değil) |
| Açıklaması <300 karakter (gerçek ürün) | **42** |

**Her faz sonunda bu sorgu tekrar çalıştırılır ve karşılaştırılır:**

```js
// node -e ile, .osko/a3-dev.env → DEV_OWNER_URL ile
select current_user rol,
  (select count(*)::int from products) urun,
  (select count(*)::int from products where is_synthetic) sentetik_kolon,
  (select count(*)::int from product_images) gorsel,
  (select count(*)::int from product_images where verified) dogrulanmis_gorsel,
  (select count(*)::int from products where seo_ready) seo_ready,
  (select count(*)::int from products where stock_status <> 'unknown') stok_iddiali,
  (select count(*)::int from products where in_stock) in_stock,
  (select count(*)::int from fitments) uyum,
  (select count(*)::int from product_translations where published) yayinli_ceviri
```

## 3b. Faz 4 sonu ölçümü (2026-11-18) — DEĞİŞMEDİ

| Değişmez | Referans | Faz 4 sonu | Durum |
|---|---|---|---|
| Toplam ürün | 166 | **166** | aynı |
| Gerçek ürün adayı | 154 | **154** | aynı |
| Sentetik kayıt | 12 | **12** | aynı |
| Toplam fotoğraf | 0 | **0** | aynı |
| Doğrulanmış fotoğraf | 0 | **0** | aynı |
| `seo_ready` | 0 | **0** | aynı |
| Stok iddiası | 0 | **0** | aynı |
| Aktif ürün | 153 | **153** | aynı |
| Makine uyumluluğu | 305 | **305** | aynı |
| Yayınlı çeviri | 0 | **0** | aynı |
| Kategori | 0 | **0** | aynı (araç hazır, ağaç kurulmadı) |
| Kategorili ürün | 0 | **0** | aynı |
| `admin_audit_log` kaydı | — | **0** | yeni tablo, boş |

Faz 4'te veritabanına **hiçbir ürün yazması yapılmadı**; tek değişiklik yeni
ve BOŞ `admin_audit_log` tablosudur.

## 4. Test referansı (Faz 0 başlangıcı)

| Kontrol | Referans |
|---|---|
| `npx tsc --noEmit` | **0 hata** |
| `npm test` | **339 geçti** |
| `npm run lint` | **34 sorun** (19 hata, 15 uyarı) |
| `npm run build` | **başarılı**, 62/62 statik sayfa |

Kural: test sayısı **azalmaz**, lint **artmaz**, tsc ve build **temiz kalır**.

**Faz 4 sonu (2026-11-18):** tsc **0 hata** · test **510 geçti** (+171) ·
lint **34 sorun** (artış yok) · build **exit 0**, 65/65 statik sayfa.

> Statik sayfa sayısı 62 → 65 oldu. Bir tanesi yeni `/admin/categories`
> sayfasıdır. Kalan artışın kaynağı **ölçülmedi**; Faz 3 build'i dev
> sunucusu açıkken çalıştığı ve bağlantı limiti gürültüsü ürettiği için
> karşılaştırma birebir değil. Bu build temiz ortamda, 0 TS hatası ve
> 0 dosya kilidi hatasıyla tamamlandı.

## 5. Yedekler

| Dosya | Tarih | İçerik |
|---|---|---|
| `~/.osko/backups/dev_faz0_2026-11-17.sql` | 2026-11-17 | 292 KB · 18 tablo · 166 ürün satırı · Faz 0 başlangıcı |
| `~/.osko/backups/dev_0012_oncesi.sql` | 2026-11-17 | 292 KB · 166 ürün satırı · `0012` migration ÖNCESİ |
| `~/.osko/backups/dev_0013_oncesi.sql` | 2026-11-18 | 293 KB · 18 COPY · 166 ürün satırı · `0013` migration ÖNCESİ (stderr boş) |

## 5b. PRODUCTION DURUMU (2026-11-18)

`0010`, `0011p`, `0012p`, `0013p` **production'a uygulandı** ve veri birebir
korundu (`09-PRODUCTION-MIGRATION-RAPORU.md`). Production'da artık:
19 tablo · 79 index · `admin_audit_log` var · 3 ürün · 2 fotoğraf ·
`seo_ready` 0 · stok iddiası 0 · katalog **kapalı**.

**Kod HENÜZ deploy edilmedi** — canlıda eski kod + yeni şema çalışıyor.

Yedekler: `~/.osko/backups/prod_tam_20261118-153302.sql` ve
`prod_migration_oncesi_20261118-154511.sql` (ikisi de kişisel veri içerir).

## 6. Migration kuralı

Her migration şu sırayla uygulanır — **istisnasız**:

1. Hedef kimliği doğrula (§1 sorgusu)
2. `pg_dump` yedeği al ve içeriğini doğrula (satır sayısı)
3. **Dry-run**: dosyanın kopyasında `COMMIT;` → `ROLLBACK;` ile çalıştır
4. Geri alındığını sorguyla doğrula (kolon/tablo yok)
5. Asıl dosyayı değiştirmeden uygula
6. POST-CHECK blokunun geçtiğini gör
7. §3 sorgusuyla veri bütünlüğünü doğrula

**Yalnızca development.** Production uygulaması ayrı onaya tabidir.

## 7. Geri alma

| Katman | Yöntem |
|---|---|
| Kod | Commit edilmedi → `git checkout -- <dosya>` |
| Tüm kod | `git stash -u` (dikkat: başka oturumların değişiklikleri de var) |
| Migration | Her `.sql` dosyasının başlığında geri alma SQL'i yazılı |
| Veri | `~/.osko/backups/dev_faz0_2026-11-17.sql` |

## 8. Onaylanan mimari kararlar

| # | Karar | Kullanıcı yanıtı (2026-11-17) |
|---|---|---|
| K8 | `products.is_synthetic` kolonu | **Onaylandı.** 12 sentetik kayıt kesin doğrulanacak; gerçek ürün yanlış sınıflandırılmayacak |
| K9 | `admin_audit_log` tablosu | **Onaylandı.** Hassas bilgi, şifre, token, gizli anahtar **loglanmaz** |
| K10 | Toplu yayın | **Şartlı onay.** Yalnızca **açık operatör onayıyla**; her ürün sunucu kapısından **ayrı ayrı** geçer; otomatik yayın **yok** |
| K11 | Kapsam | **Yalnızca Y3** (liste sıralama). Y1 (kategori ağacı) ve Y2 (admin splash) **ertelendi** |

### K9 ve K10'un kodda nerede uygulandığı (Faz 4)

| Şart | Uygulama yeri | Testi |
|---|---|---|
| K10 — açık operatör onayı | `parseBulkRequest`: `confirm !== true` → 400 | `bulk-actions.spec.ts` |
| K10 — kayıt başına kapı | `bulk/route.ts`: `evaluatePublishEligibility()` döngü içinde | `bulk-actions.spec.ts` |
| K10 — otomatik yayın yok | hiçbir eylem varsayılan değil; `action` zorunlu | `bulk-actions.spec.ts` |
| K10 — toplu doğrulama yok | eylem beyaz listesinde yok; uç `product_images`'a dokunmaz | `bulk-actions.spec.ts` |
| K9 — gizli değer yok | `audit-log.ts` BEYAZ LİSTE + `ck_admin_audit_no_secrets` | `bulk-actions.spec.ts` + migration kanıtı |
| K9 — kayıt işlemi düşürmez | `recordAdminAudit` hata yutar, `false` döner | `bulk-actions.spec.ts` |
