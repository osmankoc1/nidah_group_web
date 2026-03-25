# NİDAH GROUP — Corporate Website

**nidahgroup.com.tr** için production-ready Next.js web sitesi.
İş makinası servisi, yedek parça tedariği, hidrolik revizyon — Türkiye geneli 81 il.

## Tech Stack

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 16 (App Router) |
| Dil | TypeScript |
| Stil | Tailwind CSS v4 + shadcn/ui |
| DB | Neon PostgreSQL (serverless, Drizzle ORM) |
| Email | Resend |
| Auth | JWT / jose (HS256) |
| Rate Limit | Upstash Redis (in-memory fallback) |
| Monitoring | Sentry (opsiyonel) |
| Katalog | Python FastAPI + Oracle XE 11g (Prosis connector) |

## Sayfalar

| Route | Açıklama |
|---|---|
| `/` | Ana sayfa (hero, markalar, hizmetler, öne çıkan parçalar) |
| `/hizmetler` | Hizmet detayları |
| `/parca-katalog` | Statik ürün kataloğu |
| `/parca-katalog/[slug]` | Ürün detay sayfası |
| `/catalog` | Canlı Prosis kataloğu (arama + filtreler) |
| `/catalog/[id]` | Canlı parça detayı (fitments, supersession, dökümanlar) |
| `/hakkimizda` | Hakkımızda |
| `/iletisim` | İletişim |
| `/sss` | SSS (accordion + JSON-LD) |
| `/teklif-al` | RFQ formu |
| `/teklif-al/basarili` | Teklif başarı ekranı |
| `/admin` | Admin paneli (JWT korumalı) |
| `/admin/rfq` | RFQ yönetimi (filtre, düzenle, sil, CSV export) |
| `/api/health` | Health check (DB + Prosis) |

## Kurulum

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env.local
# .env.local dosyasını düzenle (DATABASE_URL, JWT_SECRET, vs.)

# 3. Veritabanı migration'ı uygula
psql "$DATABASE_URL" -f drizzle/0000_rfq_submissions.sql
# veya: npx drizzle-kit migrate

# 4. Geliştirme sunucusunu başlat
npm run dev
```

Uygulama http://localhost:3000 adresinde açılır.

## Geliştirme

```bash
npm run dev          # Webpack modunda (daha stabil)
npm run dev:turbo    # Turbopack (daha hızlı, deneysel)
npm run build        # Production build
npm start            # Production sunucu
npm run lint         # ESLint
npm run db:studio    # Drizzle Studio (DB GUI)
```

## Prosis Connector (Canlı Katalog)

Prosis Oracle kataloğuna erişim için ayrı bir Python FastAPI servisi gereklidir.
Bu servis Vercel'de **çalışmaz** — ayrı bir sunucuya deploy edilmesi gerekir.

```bash
cd services/prosis-connector
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Oracle bağlantı bilgilerini gir
python main.py         # localhost:7001'de başlar
```

Detaylar: [services/prosis-connector/README.md](services/prosis-connector/README.md)

## Deploy

Tüm deploy adımları için: [DEPLOY.md](DEPLOY.md)

## API Uçnoktaları

| Endpoint | Method | Auth | Açıklama |
|---|---|---|---|
| `/api/rfq` | POST | - | RFQ talebi gönder |
| `/api/health` | GET | - | Sistem sağlık kontrolü |
| `/api/catalog/search` | GET | - | Prosis parça arama |
| `/api/catalog/suggest` | GET | - | Otomatik tamamlama |
| `/api/catalog/parts/[id]` | GET | - | Parça detayı |
| `/api/admin/auth` | POST | - | Admin girişi |
| `/api/admin/logout` | GET | - | Çıkış |
| `/api/admin/rfq` | GET | JWT | RFQ listesi |
| `/api/admin/rfq/[id]` | GET/PATCH/DELETE | JWT | RFQ yönetimi |
| `/api/admin/rfq/export` | GET | JWT | CSV export |
| `/api/admin/stats` | GET | JWT | İstatistikler |

## Markalar

VOLVO · CHAMPION · KOMATSU · CAT · HİDROMEK · HAMM · BOMAG · AMMANN

## İletişim

- **Mustafa KOÇ** — Satış Müdürü — +90 530 884 59 79
- **Osman Koç** — Genel Müdür — +90 555 182 86 29
- **Ankara, Türkiye**
