# NİDAH GROUP — Proje Talimatları

Global `~/.claude/CLAUDE.md` kuralları geçerlidir. Bu dosya yalnızca **bu projeye özel**, doğrulanmış kararları içerir. Çelişki olursa **daha kısıtlayıcı olan** uygulanır.

> Buradaki her madde kod veya canlı sistem üzerinde doğrulanmıştır. Doğrulanmamış hiçbir iddia eklenmez.

---

## 1. Yığın

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Drizzle ORM + Neon PostgreSQL 17 · Cloudinary · Resend · Sentry · Vercel

```
npm run dev      # next dev --webpack
npm run build    # next build
npm run lint     # eslint
npm test         # playwright test (birim/regresyon, TARAYICI GEREKMEZ)
```

**Test altyapısı VAR** (2026-11-26, ölçüldü — bu satır daha önce tersini söylüyordu):
`playwright.config.ts` + `tests/` altında 34 spec dosyası, **572 test 5,4 saniyede geçiyor**.
Koşucu `@playwright/test`'tir ama hiçbir test `page` fixture'ını kullanmaz: **tarayıcı
binary'si indirilmez/başlatılmaz**, testler saf fonksiyon testleridir. `tsconfig` `paths`
(`@/*`) çözümlüdür.

"Testleri çalıştır" denildiğinde çalıştırılacak sıra: `npm test` + `npx tsc --noEmit` + `npm run lint`.

> Sunucu/veritabanı gerektiren bir şey test edilecekse: testler DB'ye bağlanmaz.
> Veritabanına bağlı mantık, saf bir çekirdek modülüne ayrılıp öyle test edilir
> (örnek: `src/lib/search-gate-core.ts` ↔ `tests/search-gate.spec.ts`).

**Lint baseline: 38 sorun (19 error, 19 warning)** — `29f5ce8` HEAD'inde ölçüldü. (2026-11-26 ölçümü: **34** — 19 error, 15 warning.) Bunlar önceden vardır. Kural: **bu sayı artmamalı**; dokunulan dosyalarda 0 **yeni** bulgu hedeflenir. Baseline'ı temizlemek ayrı bir iştir.

> Baseline ölçerken `.claude/worktrees` kalıntısına dikkat: eski bir ölçüm (53) bu dizindeki dosyaları da saymıştı. Doğru yöntem `git stash -u` ile HEAD'de ölçüp karşılaştırmaktır.

---

## 2. Dokunulmayacak / özel izin gerektiren alanlar

| Alan | Kural |
|---|---|
| **Parça kataloğu toggle'ı** | Katalog **bilinçli olarak KAPALI**. Admin → Sayfalar → "Parça Kataloğu". Kod ile açılmaz, DB'den değiştirilmez |
| `src/lib/site-settings.ts` | Toggle otoritesi. Mekanizma değiştirilmez. Önbellek **etiket tabanlıdır** — aşağıdaki "Önbellek mimarisi"ne bak |
| `src/lib/catalog-access.ts` | CTA fallback zinciri. Değiştirilmez |
| `.env*`, `~/.osko/*.env` | İçerik hiçbir çıktıya yazdırılmaz. Yalnızca anahtar adı |
| `src/app/api/admin/**` | Auth arkasında (`src/proxy.ts`). Değişiklik ayrı onay |
| Canlı DB | Migration ve şema değişikliği **her zaman ayrı onay** |
| `drizzle/*.sql` | Yazılabilir; **çalıştırmak** ayrı onay |

### Önbellek mimarisi — `site_settings` etiket tabanlıdır (2026-11-18, doğrulandı)

**Kural: `site-settings.ts`'teki `unstable_cache`'e SAYISAL `revalidate` verilmez.**

`unstable_cache`'e sayısal bir `revalidate` verildiğinde Next 16 bu değeri yalnızca veri önbelleğine uygulamaz; onu render eden rotanın revalidate süresine de taşır (`next/dist/server/web/spec-extension/unstable-cache.js` → `workUnitStore.revalidate` minimuma çekilir). Bu fonksiyon `(public)/layout.tsx` içinden çağrıldığı için değer **tüm public sayfalara ve `/sitemap.xml`'e** yayılır: site zaman tabanlı ISR'ye döner ve her TTL dolumundan sonraki ilk istek bir yeniden üretim (= 1 Vercel "ISR write") tetikler.

Ölçülen fark (yerel `next build` + `next start`, aynı kod, tek satır):

| | `{ revalidate: 60 }` (eski) | `{ tags: [...], revalidate: false }` (şimdiki) |
|---|---|---|
| `prerender-manifest.json` | 31 rotanın **28'i** `initialRevalidateSeconds: 60` | **31/31** `false` |
| Sayfa `Cache-Control` | `s-maxage=60, stale-while-revalidate=31535940` | `s-maxage=31536000` |
| Yeniden üretim | zamanla, dakikada bir | yalnızca deploy + toggle değişimi |

Geçersiz kılma **olay tabanlıdır**. `site_settings`'in tek yazma yolu `/api/admin/settings` PATCH'idir ve orada **iki çağrı birlikte** bulunur:

- `revalidateTag(SITE_SETTINGS_CACHE_TAG, { expire: 0 })` → veri önbelleği kaydını düşürür. Next 16'da ikinci argüman zorunludur; `"max"` gibi bir profil verilirse Next bunu stale-while-revalidate sayar ve değişiklik ilk istekte **görünmez**. `{ expire: 0 }` anında düşürür.
- `revalidatePath("/", "layout")` → üretilmiş sayfa çıktılarını düşürür.

İkisinden biri kaldırılırsa admin toggle'ı canlıya yansımaz. Doğrulandı: statik sayfa `HIT` → geçersiz kılma → `MISS` (yeniden üretim) → `HIT`.

**Uyarı:** `site_settings` admin API'si dışında (elle SQL, script) değiştirilirse önbellek kendiliğinden tazelenmez; deploy ya da `revalidateTag` gerekir.

### Fail-closed varsayılanlar — `defaultEnabled` ≠ `fallbackEnabled`

`MANAGED_PAGES`'te **iki ayrı varsayılan** vardır ve karıştırılmamalıdır:

| Alan | Hangi durumda | Katalog değeri |
|---|---|---|
| `defaultEnabled` | Ayarlar okundu, bu anahtar için **satır yok** | `true` — yerel geliştirmede katalog açık görünür (§4). **Değiştirilmez.** |
| `fallbackEnabled` | Ayarlar **hiç okunamadı** (`DATABASE_URL` yok / sorgu hata verdi) | `false` — bilgi kaybı kapalı bir sayfayı asla açmaz |

Canlıda açık olan içerik sayfalarında `fallbackEnabled: true`'dur; geçici bir DB arızası tüm siteyi karartmasın diye. Yani kural şudur: **`fallbackEnabled`, sayfanın canlıdaki amaçlanan durumudur.** Bir sayfanın amaçlanan durumu kalıcı olarak değişirse (örn. katalog açılırsa) bu sabit de güncellenmelidir; yoksa bir DB arızası sırasında yapılan deploy sayfayı yanlış tarafta dondurur.

Hata durumu **önbelleğe alınmaz**: `unstable_cache` yalnızca başarılı sonucu yazar, bu yüzden `!db` ve sorgu hatası bilinçli olarak cache callback'i içinde `throw` edilir ve `readSettings()` içinde yakalanır. Aksi halde geçici bir arıza `revalidate: false` ile bir yıl donardı.

Loglama: eksik `DATABASE_URL` **süreç başına bir kez** loglanır (sabit yapılandırma hatası; her render'da yazmak bir build'de 179 satır üretiyordu). Sorgu hatası **her seferinde** loglanır (geçicidir, sıklığı önemlidir). Hiçbir durumda hata mesajı/bağlantı adresi loglanmaz — yalnızca hata **adı**.

Ölçülen davranış (`db = null`, aynı build, yalnızca `site-settings.ts` farkı):

| | Fail-closed ÖNCESİ | Şimdiki |
|---|---|---|
| `/parca-katalog`, `/parca-katalog/<marka>` | **200 — katalog açılıyordu** | **404** |
| `sitemap.xml` katalog URL | **12** | **0** |
| Ana sayfada katalog bağlantısı | **18** | **0** |
| `/hakkimizda`, `/sss`, `/iletisim`, `/teklif-al`, `/blog` | 200 | 200 (değişmedi) |

**Build zamanı sorgu hatası ise build'i düşürür** (`sitemap.ts` ürün sorgusu `if (!db)` ile korunmuyor, hata fırlatır) — ölçüldü: `Export encountered an error on /sitemap.xml/route`. Bu güvenli yöndür: bozuk bir deploy yayına çıkmaz.

---

## 3. Katalog OFF mimarisi

Admin toggle kapalıyken:

- `/parca-katalog`, `/parca-katalog/<marka>`, `/parca-katalog/<parçaNo>`, `/catalog` → **gerçek HTTP 404**
- Kapalı sayfa metadata'sı: tek yönlü `noindex`, canonical/OG **üretilmez** (`DISABLED_PAGE_METADATA` / `metadataForPage()`)
- `sitemap.xml` katalog URL'si **içermez** (63 URL, katalog 0)
- Ana sayfada katalog bağlantısı **0** — marka kartları link olmaktan çıkar
- Parça CTA'ları `/teklif-al?partNumber=…` ön-dolu forma gider

**Kritik:** `(public)/` köküne veya toggle korumalı herhangi bir bölümün ÜSTÜNE `loading.tsx` **EKLENMEZ**. Eklenirse Suspense sınırı oluşur, shell 200 ile flush olur ve `notFound()` artık durum kodunu değiştiremez → 404'ler sessizce **soft-404**'e döner. `loading.tsx` yalnızca `(public)/blog/` altındadır ve orada kalmalıdır.

**Prosis canlı katalog** (`/catalog`) ayrı bir toggle'dır (`page_catalog`, varsayılan kapalı) ve connector **erişilemez** durumdadır (`/api/health` → `prosis: "error"`).

---

## 4. Yerel ≠ Production veritabanı — DİKKAT

`.env.local` **ayrı ve boş bir dev veritabanına** bağlanır. Production'a bağlanmaz.

| | Yerel (`.env.local`) | Production |
|---|---|---|
| Rol | `nidah_dev` (bağlantı limiti **20**) | okunamıyor (Vercel ortamı) |
| Uç | pooler **değil**, doğrudan compute | okunamıyor |
| `products` | **0** | 2 aktif |
| `site_settings` | **0 satır** | katalog kapalı kaydı var |
| `/parca-katalog` | **200 — katalog AÇIK görünür** | **404 — katalog KAPALI** |

**Neden önemli:** `site_settings` boş olduğu için `isPageEnabled()` `MANAGED_PAGES`'teki `defaultEnabled` değerine düşer ve `page_parca_katalog` varsayılanı `true`'dur. Yani **yerel önizlemede katalog açık görünür** — bu bir regresyon değil, veri yokluğunun sonucudur. Yerelde gördüğün katalog sayfaları canlıda 404'tür.

**Sonuç:** Yerelden gönderilen bir form **production kaydı oluşturmaz**; canlı teklif akışını yerelden doğrulayamazsın.

**E-posta (2026-11-25, düzeltildi):** `.env.local` içinde `RESEND_API_KEY` ve `ADMIN_EMAIL` **BOŞ**. Yani yerelden **gerçek e-posta GİTMEZ** — `sendAdminNotification()` anahtar yoksa gönderimi atlar. (Bu satır daha önce tersini söylüyordu; ölçülerek düzeltildi: anahtar adları var, değerleri boş.)

Yerelde e-posta akışını sınamanın iki yolu vardır ve ikisi de dışarıya posta göndermez:
- `RESEND_BASE_URL` ile yerel bir saplama uca yönlendirmek (Resend SDK bu değişkeni okur),
- yalnızca `sent/reason` dönüşünü gözlemlemek.

Gerçek teslimat yalnızca production'da doğrulanabilir; test talebi **açıkça TEST olarak işaretlenir** ve alıcı şirketin kendi adresidir.

Bu ayrım `~/.claude/CLAUDE.md` §7'deki A1–A3 güvenlik çalışmasıyla kuruldu. 2026-09 tarihli oturumlarda `.env.local` production'ı görüyordu; **artık görmüyor.** Eski oturum notlarına güvenme, her seferinde doğrula:

```sql
SELECT current_database(), (SELECT COUNT(*) FROM products), (SELECT COUNT(*) FROM site_settings);
```

## 5. Migration iş akışı

Migration'lar **`drizzle-kit` ile üretilmez ve uygulanmaz.** Elle yazılmış, `IF NOT EXISTS` ile idempotent SQL dosyalarıdır.

**Yanıltıcı ayrıntı:** `drizzle/meta/_journal.json` yalnızca `0002`'ye kadar gider, dizinde `0007`'ye kadar dosya vardır. `drizzle-kit generate` journal'ı bozar ve şema drift'i üretir. **`drizzle-kit push` canlı veritabanına uygulanmaz.**

Yerel `psql` yoktur; Docker kullanılır (production Neon = PostgreSQL 17.11, `postgres:17` birebir eşleşir):

```bash
export DATABASE_URL=$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/^["'"'"']//; s/["'"'"']$//')
docker run --rm -i -e DATABASE_URL -e PGCLIENTENCODING=UTF8 postgres:17 \
  sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f -' < drizzle/000X_*.sql
```

**Deploy sırası ZORUNLU: migration ÖNCE, kod SONRA.** Drizzle sorguları `schema.ts`'teki kolonları açıkça listeler; kod migration'dan önce deploy edilirse `column … does not exist` → 500. Ters yön güvenlidir. Bu pencerede **admin ürün yazma işlemleri dondurulur** (yeni kolon NULL kalır).

`blog_posts` / `blog_categories` tablolarını hiçbir migration dosyası oluşturmaz — temiz bir DB'de `0003`–`0005` çalışmaz.

---

## 6. Parça numarası kimliği (Phase 5.1a, canlıda)

Üç temsil:

| | Örnek | Nerede |
|---|---|---|
| `partNumber` | `CH 76281` | Görünen kanonik değer — H1, `<title>`, `Product.sku` |
| `partNumberNormalized` | `CH76281` | Eşleştirme/benzersizlik anahtarı (`uq_products_pn_norm`) |
| URL segmenti | `ch-76281` | `toPartNumberUrlSegment()` — **henüz hiçbir public rotada kullanılmıyor** |

**Normalizasyon kuralı — SQL ve TS birebir aynı olmalı:** önce `[^A-Za-z0-9]` sil, sonra büyük harfe çevir. `src/lib/part-number.ts` ↔ `drizzle/0006`,`0007`. Sıra değişirse migration backfill'i ile uygulamanın yazdığı değer ayrışır.

`oem_numbers.type` enum'u: `oem` · `cross_ref` · `alternate` · `supersedes` · `superseded_by` · `prefixless`. **Bu tabloya yazan kod yolu henüz yoktur** (Phase 5.1b).

Prefix registry (`VOE`/`SA`/`RM`/`CH`) şu an yalnızca `catalog/CatalogClient.tsx` içinde **modül-özel** bir sabittir. **İkinci bir kopyası oluşturulmaz** — gerekirse tek kaynak olarak `part-number.ts`'e taşınır ve CatalogClient oradan import eder.

---

## 7. SEO değişmezleri

Bu değerler korunur; değişiyorsa regresyondur:

- `sitemap.xml` → 200, `application/xml`, **63 URL**, katalog URL 0, duplicate 0
- `/blog/tr` → **308** → `/blog` · `/en/blog` → **308** → `/blog/en`
- Her sayfada canonical **tam 1**, `Organization` **tam 1**
- `BreadcrumbList`'in **tek üreticisi** `components/ui/page-breadcrumb.tsx` — sayfalar kendi BreadcrumbList'ini tanımlamaz
- JSON-LD `components`/`lib/json-ld.tsx` üzerinden; `<` → `<` kaçışı korunur
- Kalıcı yönlendirmeler `next.config.ts` `redirects()` içinde (sayfa içi `redirect()` streaming nedeniyle gerçek 308 üretmez)

---

## 8. İçerik kuralları

- **Referans, sertifika, stok, teslimat süresi ve ülke sayısı iddiaları uydurulmaz.** Mevcut iddialar şirket teyidi olmadan **değiştirilmez de**.
- **Bilinen tutarsızlık (çözülmedi):** `HeroSection.tsx` `48h` değerini **"Ortalama Teslimat"**, sitedeki diğer 5 yer aynı sayıyı **"yanıt / teklif dönüşü"** olarak kullanır. ECU sayfası "24-48 saat teslimat", teklif formu "1-3 iş günü" der. Düzeltme **şirket teyidi bekliyor**.
- Public yüzey dili Türkçe; blog EN/RU/AR çevirileri `blogPostTranslations` üzerinden.
- `<html lang="tr">` **sabittir**; locale sayfaları yalnızca `<main>` üzerinde `lang`/`dir` ayarlar.

---

## 9. Form ve ölçüm kuralları (İP-1)

- Public form alanları **minimum 44px** (`h-11`). Paylaşılan `ui/input` varsayılanı 36px'tir ve **admin panelinde de kullanıldığı için değiştirilmez** — public formlarda `className` ile büyütülür.
- Her public form alanı `autoComplete` taşır; telefon `inputMode="tel"`, e-posta `inputMode="email"`, sayısal `inputMode="numeric"`.
- **`company` alanı zorunludur** — kullanıcı kararı, değiştirilmez.
- Çerez bandı **onay mantığına dokunulmaz**; yalnızca yerleşimi değiştirilebilir (KVKK).
- Yeni dönüşüm noktası eklenirse `src/lib/analytics.ts` olayı **bağlanır**. Ölü helper bırakılmaz.
- **Açık kalan:** `trackCatalogQuote`, `trackCatalogBrandFilter`, `trackProductDetailView` hâlâ çağrılmıyor (katalog kapalı olduğu için). 10 dosyadaki WhatsApp bağlantıları henüz izlenmiyor.

---

## 10. Ölçüm / izleme durumu

| Bileşen | Durum |
|---|---|
| GA4 | ✅ Canlı (`G-L2JFWQH2J6`), consent mode, `CookieConsentBanner` ile güncelleniyor |
| Sentry — sunucu | Config var; dışarıdan doğrulanamadı |
| Sentry — **istemci** | ❌ Pakette ingest/DSN host yok → **tarayıcı hataları yakalanmıyor**. `NEXT_PUBLIC_SENTRY_DSN` tanımlı değil |
| Vercel Analytics / Speed Insights | ✅ Kodda bağlı (2026-11-26, doğrulandı): `@vercel/analytics` + `@vercel/speed-insights` bağımlılıkta, `src/app/layout.tsx:185-186`'da `<Analytics />` ve `<SpeedInsights />` monte. **Panelde veri toplandığı doğrulanmadı** (Vercel paneline erişim yok). Önceki "❌ Yok" satırı kodla çelişiyordu |
| Vercel MCP | ⚠️ Eklenti etkin ama **yetkilendirilmemiş** (`/mcp`) |
| Vercel CLI | ❌ Kurulu değil |

**Hız ve erişilebilirlik sayıları ölçülmeden yazılmaz.** LCP/CLS/INP, Lighthouse ve site geneli kontrast denetimi bu projede **henüz ölçülmemiştir**.

---

## 11. Sürüm akışı

- Çalışma dalı `main`. **Force push yok, amend yok, rebase yok, merge yok, tag yok.**
- `git push` ve deploy **her zaman ayrı onay**.
- Deploy GitHub → Vercel entegrasyonu ile otomatiktir; **manuel `vercel --prod` çalıştırılmaz**.
- Deploy doğrulaması: canlı release marker + `origin/main` + local `HEAD` üçlü eşleşmesi.
- Production regresyonunda: **otomatik rollback yapılmaz, kod değiştirilmez, yeni commit oluşturulmaz** — raporlanır ve durulur.
- Commit mesajları Türkçe veya İngilizce conventional; `Co-Authored-By` satırı **kullanıcı aksini söylemedikçe eklenmez**.
