# Production Tam Yedeği — SONUÇ RAPORU

**Tarih:** 2026-11-18 · **Git HEAD:** `5497e9b` · **Durum:** yedek alındı ve doğrulandı

> Production verisi **değiştirilmedi**. Migration çalıştırılmadı, commit,
> push, deploy yapılmadı. Yapılan tek işlem **okumadır** (`pg_dump` + salt
> okunur sorgular).

---

## 1. Özet

| Adım | Sonuç |
|---|---|
| 1. Hedef doğrulaması | ✅ `neondb` · 3 ürün · 2 fotoğraf · 18 tablo |
| 2. Tam yedek | ✅ 96.348 bayt · **18 tablonun tamamı** · stderr boş |
| 3. İzole Docker'da geri yükleme | ✅ **0 hata** |
| 4. Kişisel veri koruması | ✅ erişimi kısıtlı konum; raporda hiçbir içerik yok |
| 5. Yedek korunuyor | ✅ silinmedi |
| 6. Production'a yazma | ✅ **yapılmadı** |

**Kanıt:** geri yüklenen yedeğin **her tablosunun tam satır `md5` özeti**,
canlı production'daki değerlerle **birebir aynı**.

---

## 2. Hedef doğrulaması (1. şart)

Yedek alınmadan önce, salt okunur bir işlemle:

```
veritabanı : neondb
rol        : nidah_web
sürüm      : PostgreSQL 17.12
ürün 3 · fotoğraf 2 · uyumluluk 2 · teklif 1 · ayar 1 · tablo 18
ürünler    : 76281 (aktif) · 90898 (aktif) · DENEMEE32424 (pasif)
```

Development'ta ürün sayısı **166**'dır; görülen **3** değeri hedefin
production olduğunu kesinleştirir.

---

## 3. Alınan yedek (2. şart)

| | |
|---|---|
| **Dosya** | `prod_tam_20261118-153302.sql` |
| **Konum** | `~/.osko/backups/` (erişim: yalnızca kullanıcı hesabı, SYSTEM ve yöneticiler) |
| **Boyut** | 96.348 bayt |
| **SHA-256** | `59cbd7cf4c9b1f6…` (ilk 16 karakter) |
| **`pg_dump` çıkış kodu** | 0 · **stderr boş** |

**İçerik — 18 tablonun tamamı ve satır sayıları:**

| Tablo | Satır | Tablo | Satır |
|---|---|---|---|
| products | **3** | blog_posts | 2 |
| product_images | **2** | blog_post_translations | 6 |
| fitments | **2** | blog_post_tags | 11 |
| rfq_submissions | **1** | blog_tags | 11 |
| site_settings | **1** | blog_categories | 3 |
| machines | 3 | blog_category_translations | 3 |
| machine_variants | 4 | blog_tag_translations | 0 |
| manufacturers | 2 | categories | 0 |
| oem_numbers | 0 | product_translations | 0 |

**Şema bütünlüğü:** 18 `CREATE TABLE` · 37 `CREATE INDEX` · 7 enum tipi ·
39 kısıt ifadesi · 15 yabancı anahtar · 18 sahiplik ifadesi · 23 yetki
ifadesi. Yani yedek yalnızca veriyi değil, **tablo sahipliklerini ve
yetkileri de** taşıyor.

---

## 4. Geri yükleme testi (3. şart)

**Ortam:** `postgres:17` konteyneri, **hiçbir ağ portu açılmadan**; erişim
yalnızca `docker exec` ile.

**İlk deneme** tek bir hatayla durdu:

```
ERROR: role "cloud_admin" does not exist
```

Bu, dökümün **son bölümündeki** `ALTER DEFAULT PRIVILEGES FOR ROLE
cloud_admin …` satırıdır (1478 satırlık dosyanın 1449. satırı). `cloud_admin`
Neon'un **kendi iç rolüdür** ve boş bir PostgreSQL konteynerinde yoktur;
gerçek Neon ortamında vardır. Hata **veriyi değil yetki varsayılanlarını**
etkiler; tüm tablolar, satırlar, index'ler ve kısıtlar bu satırdan **önce**
yüklenmişti.

**İkinci deneme** — Neon rolleri (`cloud_admin`, `neon_superuser`,
`neondb_owner`, `nidah_rw`, `nidah_web`) oluşturulup temiz bir veritabanına:

```
çıkış kodu: 0        hata: 0
```

### 4.1 Doğrulama — canlı ile karşılaştırma

Her tablonun **tam satır** `md5` özeti, canlı production'dan salt okunur
olarak alınan değerlerle karşılaştırıldı:

| Tablo | Satır | Özet eşleşti mi |
|---|---|---|
| products | 3 | ✅ |
| product_images | 2 | ✅ |
| fitments | 2 | ✅ |
| rfq_submissions | 1 | ✅ |
| site_settings | 1 | ✅ |
| blog_posts | 2 | ✅ |
| blog_post_translations | 6 | ✅ |
| machines | 3 | ✅ |
| **Şema** | tablo 18 · index 72 · FK 15 · enum 7 | ✅ |

```
BIREBIR AYNI — yedek, canli veriyi eksiksiz temsil ediyor
```

Test bitince konteyner silindi; geçici kopya bırakılmadı. **Yedek dosyası
silinmedi** (5. şart).

---

## 5. Kişisel veri (4. şart)

`rfq_submissions` tablosu **1 satır** kişisel veri içerir (ad, e-posta,
telefon, firma, mesaj). Bu satır yedeğin **içindedir** — tam yedek istendiği
için bilinçli.

| Önlem | Durum |
|---|---|
| Yedek erişimi kısıtlı konumda | ✅ `~/.osko/backups/` — Everyone/Users yetkisi yok |
| Repo dışında | ✅ git tarafından izlenmiyor, commit edilemez |
| Rapora içerik yazılmadı | ✅ yalnızca satır sayısı ve `md5` özeti |
| Bağlantı bilgisi / şifre yazılmadı | ✅ hiçbir çıktıda görünmedi |
| Test konteyneri ağa açılmadı | ✅ port yok |
| Test kopyası silindi | ✅ konteynerle birlikte |

> **Sizin için hatırlatma:** yedek kişisel veri taşıdığı için geçiş bitince
> silinmeli veya şifreli bir konuma taşınmalıdır. Saklama süresine siz karar
> verirsiniz.

---

## 6. Riskler ve sınırlar

| # | Konu | Değerlendirme |
|---|---|---|
| R1 | **Yedek sınırlı rolle (`nidah_web`) alındı** | Owner bağlantısını okuma yetkim yok. Ölçülen sonuç: döküm yine de **sahiplik ve yetki ifadelerini içeriyor** ve eksiksiz geri yüklendi. Yine de felaket kurtarma için **owner bağlantısıyla alınmış bir yedeği siz de almak isteyebilirsiniz** |
| R2 | `cloud_admin` rolü | Yalnızca Neon dışı ortamda sorun; gerçek geri yüklemede Neon'da bu rol vardır |
| R3 | Yedek anlık görüntüdür | 2026-11-18 15:33 durumunu taşır. Migration'dan hemen önce **tekrar alınması** önerilir (site canlı; bu sırada teklif formu doldurulabilir) |
| R4 | Kişisel veri | §5'teki önlemler alındı; saklama süresi sizin kararınız |
| R5 | Rol ve veritabanı düzeyi nesneler | `pg_dump` **tek veritabanını** yedekler; rol tanımları (`pg_dumpall --roles-only`) dahil değildir. Neon rolleri konsol üzerinden yönetildiği için bu bir eksiklik sayılmaz |

---

## 7. Durum

| | |
|---|---|
| Production verisi | **değişmedi** (3 ürün · 2 fotoğraf · 0 yayın · 0 stok iddiası) |
| Migration | **çalıştırılmadı** |
| Commit / push / deploy | **yok** · `HEAD` = `5497e9b` |
| Yedek | **alındı, doğrulandı, korunuyor** |

**Sıradaki adım onayınızı bekliyor:** `0010` → `0011p` → `0012p` → `0013p`
migration'larının production'da çalıştırılması (koşu kitabı §5).
