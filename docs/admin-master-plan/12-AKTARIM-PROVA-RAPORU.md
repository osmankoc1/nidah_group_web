# 154 Ürün Aktarımı — PROVA RAPORU

**Tarih:** 2026-11-18 · **Durum:** ✅ prova geçti · **Gerçek aktarım: YAPILMADI**

> Production verisi **değiştirilmedi**. Ürün aktarılmadı, fotoğraf doğrulama
> bilgisi oluşturulmadı, katalog açılmadı. Commit, push, deploy yok.

---

## 1. Özet

Aktarım, **production'ın birebir kopyası** üzerinde çalıştırıldı, kanıtlandı
ve geri alındı.

| Kanıt | Sonuç |
|---|---|
| 154 ürünün tamamı **pasif** geldi | ✅ `aktif=2` **değişmedi** |
| Yeni ürünler **public API'de görünmüyor** | ✅ `/api/products` → yalnızca **76281, 90898** |
| Mevcut 3 ürün korundu | ✅ tam satır `md5` **canlı production ile birebir aynı** |
| Mevcut 2 fotoğraf korundu | ✅ `md5` **aynı** |
| 12 sentetik kayıt gitmedi | ✅ hedefte **0** |
| Hiçbir ürün yayına girmedi | ✅ `seo_ready = 0`, sitemap ürün URL'si **0** |
| Stok iddiası oluşmadı | ✅ **0** |
| Katalog kapalı kaldı | ✅ `page_parca_katalog = false` |
| Geri alma | ✅ tam dönüş: 3 ürün / 2 uyumluluk / 3 makine / 2 üretici |

---

## 2. Provada yakalanan defekt (düzeltildi)

İlk denemede makineler **(üretici, model, tip)** üçlüsüyle eşleştiriliyordu.

```
production : VOLVO G930  tip = GREYDER
development: VOLVO G930  tip = <boş>
```

Üçlü anahtar bunları farklı saydı ve **mükerrer bir VOLVO G930** oluştu.
`machines` tablosunda benzersizlik kısıtı olmadığı için veritabanı da
engellemedi — yani bu, canlıya sessizce sızabilecek bir hataydı.

**Düzeltme:** eşleştirme anahtarı **(üretici, model)** oldu; tip bir kategori
etiketidir, kimlik değildir. Ayrıca iki koruma eklendi:

- bir dev makinesi birden fazla production kaydıyla eşleşirse script
  **tahmin etmez, durur**;
- aktarım sonunda mükerrer (üretici, model) çifti kalırsa **durur**.

**Yeniden deneme:** 105 makinenin **104'ü eklendi**, VOLVO G930 mevcut kayda
**eşleşti**, mükerrer **0**. Mevcut kayıtların tipi değiştirilmedi.

---

## 3. İkinci bulgu: yedeklerin geri yüklenebilirliği

Migration'lardan **sonra** alınan `pg_dump` çıktısında Neon'a özgü
`ALTER TABLE … SET (pg_attver=…)` satırları var (yeni `admin_audit_log`
tablosunun kolonları için, 18 satır). Saf PostgreSQL bu parametreyi tanımıyor:

```
ERROR: unrecognized parameter "pg_attver"
```

- Migration **öncesi** alınan yedekte bu satır **yok** → sorunsuz yüklenir.
- Migration **sonrası** alınan yedekler Neon'a sorunsuz döner; **saf
  PostgreSQL'e** yüklenecekse satırlar ayıklanmalıdır:

```bash
sed '/pg_attver/d' yedek.sql > yedek_temiz.sql
```

Bu, verinin değil yalnızca Neon depolama ipuçlarının ayıklanmasıdır.
Koşu kitabına not düşülmesi önerilir.

---

## 4. Prova ortamı

| | |
|---|---|
| Ortam | Yerel Docker `postgres:17`, **ağ portu açılmadı** |
| Kaynak | Production'ın güncel kopyası (migration'lar uygulanmış hâli) |
| Kişisel veri | `rfq_submissions` **verisi kopyalanmadı** (yalnızca şema) |
| Temizlik | Konteyner ve production kopyası prova sonunda **silindi** |

---

## 5. Aktarım betiği

`scripts/aktarim-154-urun.sql` — tek işlem (`BEGIN … COMMIT`), staging
tabloları, eşleştirme, PREFLIGHT ve POST-CHECK.

**PREFLIGHT durdurucuları:** 12 sentetik kimlik · test deseni · varyantlı
uyumluluk · parça numarası çakışması.

**POST-CHECK durdurucuları:** ürün sayısı · aktarılanların **hepsi pasif** ·
**aktif ürün sayısı değişmemiş** · yayın 0 · sentetik 0 · stok iddiası 0 ·
yayınlı çeviri 0 · **mevcut ürünlerin parmak izi aynı**.

Herhangi biri tutmazsa işlem **tamamen geri alınır**.

---

## 6. Prova çıktısı (gerçek)

```
PREFLIGHT: hedefte 3 urun (2 aktif) · aktarilacak: 154 urun, 300 uyum, 154 ceviri
INSERT 0 8     ← üretici (9'un 8'i; VOLVO zaten vardı)
INSERT 0 104   ← makine  (105'in 104'ü; G930 eşleşti)
Makine eslestirme tamam: 105 kayit, mukerrer 0.
INSERT 0 154   ← ürün
INSERT 0 300   ← uyumluluk
INSERT 0 154   ← çeviri
AKTARIM TAMAM: 154 urun eklendi, hepsi PASIF.
KANIT: aktif urun sayisi DEGISMEDI (2) — public API'de yeni urun GORUNMEZ.
KANIT: yayinda 0 · sentetik 0 · stok iddiasi 0 · fotograf 2 (degismedi).
KANIT: mevcut urunlerin parmak izi AYNI.
```

**Aktarım sonrası ölçüm:**

```
SAYIM   | urun=157 | aktif=2 | pasif=155 | yayin=0 | sentetik=0 | stok=0 | gorsel=2
UYUM    | toplam=302 | dogrulanmis=300 | makine=107 | uretici=10
CEVIRI  | toplam=154 | yayinli=0
PUBLIC  | gorunen_urun=2 | 76281, 90898      ← 154 ürün GÖRÜNMÜYOR
SITEMAP | urun_url=0
SENTETIK_KIMLIK | 0
DESEN   | DENEMEE32424                        ← yalnızca mevcut kayıt
MUKERRER_MAKINE | 0
```

**Canlı production ile karşılaştırma** (aynı `md5`):

| | Prova kopyası (aktarımdan sonra) | Canlı production |
|---|---|---|
| Mevcut 3 ürün | `4cf4f8b95b788b7163dd091604590718` | `4cf4f8b95b788b7163dd091604590718` |
| 2 fotoğraf | `3dc9ba3169915e9132bdfb5ca8c941f0` | `3dc9ba3169915e9132bdfb5ca8c941f0` |

---

## 7. Geri alma provası

```
DELETE 154 (çeviri) · 300 (uyumluluk) · 154 (ürün) · 104 (makine) · 8 (üretici)
GERI ALMA SONRASI: urun=3 uyum=2 ceviri=0 makine=3 uretici=2
```

Mevcut 3 ürünün ve 2 fotoğrafın parmak izi **hâlâ canlıyla aynı**.
Eklenen makine/üretici kayıtları yalnızca **başka hiçbir uyumluluk
kullanmıyorsa** silinir.

---

## 8. Gerçek aktarım için kalanlar

1. **Güncel yedek** (aktarımdan hemen önce) + geri yükleme testi
2. TSV dosyalarının **taze** üretilmesi (dev o ana kadar değişmiş olabilir)
3. `scripts/aktarim-154-urun.sql`'in production'da çalıştırılması — **ayrı onay**
4. Doğrulama: §6'daki ölçümlerin aynısı + canlı `/api/products` yanıtının
   **değişmediğinin** teyidi
5. Panel kontrolü: listede **157** kayıt, 155 pasif
6. **Aktifleştirme ayrı ve açık onayla** — toplu işlemle (işlem kaydına girer)

---

## 9. Şu an değişmeyenler

Production: **3 ürün · 2 fotoğraf · 0 yayın · 0 stok iddiası · 0 doğrulanmış
fotoğraf · katalog kapalı**. 154 ürün aktarılmadı.
