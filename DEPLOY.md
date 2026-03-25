# Deploy Rehberi — NİDAH GROUP

**Domain:** nidahgroup.com.tr
**Platform:** Vercel (Next.js) + Neon PostgreSQL + Upstash Redis + Resend + Sentry

---

## 1. Ön Gereksinimler

| Servis | Neden | URL |
|---|---|---|
| Vercel | Next.js hosting | vercel.com |
| Neon | PostgreSQL serverless DB | neon.tech |
| Upstash | Redis rate limiting | upstash.com |
| Resend | Email gönderimi | resend.com |
| Sentry | Hata izleme (opsiyonel) | sentry.io |
| Prosis server | Oracle katalog servisi (VPS) | — |

---

## 2. Veritabanı Kurulumu (Neon)

1. [console.neon.tech](https://console.neon.tech) → New Project → Region: eu-central-1
2. Connection string kopyala → `.env.local`'a `DATABASE_URL` olarak ekle
3. Migration uygula:

```bash
# Seçenek A — doğrudan SQL
psql "$DATABASE_URL" -f drizzle/0000_rfq_submissions.sql

# Seçenek B — Drizzle Kit
npx drizzle-kit migrate
```

---

## 3. Email (Resend)

### 3a. Domain Doğrulama

Resend'de gönderici domain doğrulaması için `nidahgroup.com.tr` DNS'ine şu kayıtlar eklenmeli:

```
TXT    @           "v=spf1 include:_spf.resend.com ~all"
CNAME  resend._domainkey   [Resend dashboard'dan al → Domains → nidahgroup.com.tr → DKIM]
```

> Resend dashboard: Settings → Domains → Add Domain → `nidahgroup.com.tr` → kayıtları kopyala.

### 3b. API Key

Resend → API Keys → Create API Key → `.env`'e `RESEND_API_KEY` olarak ekle.

### 3c. Test

```bash
# RFQ form gönder, admin + müşteri maili geldiğini kontrol et
curl -X POST https://www.nidahgroup.com.tr/api/rfq \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","phone":"05001234567","email":"test@example.com"}'
```

---

## 4. Upstash Redis (Rate Limiting)

1. [console.upstash.com](https://console.upstash.com) → New Database → Region: eu-west-1
2. `.env`'e ekle:
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
   ```

> Upstash olmadan rate limiting in-memory Map'e düşer — Vercel serverless ortamında güvenilmez.

---

## 5. Sentry (Opsiyonel)

1. [sentry.io](https://sentry.io) → New Project → Next.js
2. DSN'yi kopyala
3. `.env`'e ekle:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
   SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
   SENTRY_AUTH_TOKEN=sntrys_xxx   # source map upload için
   SENTRY_ORG=your-org
   SENTRY_PROJECT=nidah-group-web
   ```

> `SENTRY_DSN` yoksa Sentry devre dışı kalır — build/runtime hatası olmaz.

---

## 6. Vercel Deploy

### 6a. İlk Kurulum

```bash
npm install -g vercel
vercel login
vercel              # proje oluştur
```

### 6b. Env Variables (Vercel Dashboard)

Vercel → Project → Settings → Environment Variables:

| Key | Zorunlu | Açıklama |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon connection string |
| `ADMIN_USERNAME` | ✅ | Admin kullanıcı adı |
| `ADMIN_PASSWORD` | ✅ | Admin şifresi (güçlü!) |
| `JWT_SECRET` | ✅ | Min 32 karakter rastgele string |
| `RESEND_API_KEY` | ✅ | Email gönderimi için |
| `ADMIN_EMAIL` | ✅ | RFQ bildirimlerinin gideceği adres |
| `UPSTASH_REDIS_REST_URL` | ✅ prod | Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ prod | Redis token |
| `NEXT_PUBLIC_SENTRY_DSN` | ⬜ | Sentry DSN (client-side) |
| `SENTRY_DSN` | ⬜ | Sentry DSN (server-side) |
| `SENTRY_AUTH_TOKEN` | ⬜ | Source map upload (CI) |
| `SENTRY_ORG` | ⬜ | Sentry org slug |
| `SENTRY_PROJECT` | ⬜ | Sentry project slug |
| `PROSIS_CONNECTOR_URL` | ⬜ | Oracle katalog servisi URL'i |

**JWT_SECRET oluştur:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6c. Production Deploy

```bash
vercel --prod
```

---

## 7. Domain Cutover (nidahgroup.com.tr)

### 7a. Vercel'e Domain Ekle

Vercel → Project → Settings → Domains → `nidahgroup.com.tr` + `www.nidahgroup.com.tr`

Vercel sana nameserver veya A/CNAME kaydı gösterecek. İki seçenek:

### Seçenek A — Nameserver (önerilen)

Domain kayıt şirketinden (ör. Afilias/NIC.TR) nameserver'ları Vercel'inkilerle değiştir:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

SSL otomatik (Let's Encrypt via Vercel).

### Seçenek B — A/CNAME Kaydı

DNS yönetimini kendi sağlayıcında tutmak istersen:

```
# Apex domain
A      @          76.76.21.21

# www subdomain
CNAME  www        cname.vercel-dns.com

# Resend DKIM (email)
CNAME  resend._domainkey   [Resend'den al]
TXT    @          "v=spf1 include:_spf.resend.com ~all"
```

> **Önemli:** Vercel IP adresi değişebilir — güncel IP için Vercel dashboard'ı kontrol et.

### 7b. Propagasyon

DNS propagasyonu 5 dk — 48 saat sürer. Kontrol:
```bash
dig www.nidahgroup.com.tr
# veya
nslookup www.nidahgroup.com.tr
```

---

## 8. Prosis Connector (VPS Deploy)

Oracle XE bağlantısı gerektirdiği için bu servis Vercel'de çalışmaz. Ayrı bir VPS'e deploy edilmeli.

```bash
# VPS'te:
git clone ... && cd services/prosis-connector
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env'i düzenle: ORACLE_USER, ORACLE_PASSWORD, ORACLE_DSN

# Systemd service olarak çalıştır (örnek: /etc/systemd/system/prosis.service)
uvicorn main:app --host 0.0.0.0 --port 7001 --workers 2

# Vercel'de env ayarla:
# PROSIS_CONNECTOR_URL=https://prosis.nidahgroup.com.tr
```

CORS whitelist'ine `https://www.nidahgroup.com.tr` eklendiğinden emin ol (`main.py` → `allow_origins`).

---

## 9. Test Checklist

```bash
BASE=https://www.nidahgroup.com.tr

# Build kontrolü (local)
npm run build

# Health endpoint
curl "$BASE/api/health"
# Beklenen: {"status":"ok","checks":{"database":"ok"}}

# Sitemap
curl "$BASE/sitemap.xml"
# Beklenen: <sitemapindex> ile /sitemap/0, /sitemap/1 linkleri

# Robots
curl "$BASE/robots.txt"
# Beklenen: Disallow: /api/ ve /admin/

# Admin API koruması — token olmadan 401 gelmeli
curl "$BASE/api/admin/rfq"
# Beklenen: {"error":"Yetkisiz erişim."}

curl "$BASE/api/admin/stats"
# Beklenen: {"error":"Yetkisiz erişim."}

# RFQ form (rate limit testi)
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/rfq" \
    -H "Content-Type: application/json" \
    -d '{"fullName":"Test","phone":"05001234567","email":"t@t.com","website":""}'
done
# İlk 5: 200, 6. istek: 429

# OpenGraph kontrolü
curl -s "$BASE" | grep -i "og:url\|og:image\|canonical"
```

---

## 10. Sonrası

- [ ] Resend üretim domain doğrulaması: SPF + DKIM DNS kayıtları
- [ ] Admin şifresi değiştirildi (`ADMIN_PASSWORD` env)
- [ ] JWT_SECRET üretildi (≥32 karakter rastgele)
- [ ] Upstash Redis bağlandı
- [ ] `/api/health` 200 dönüyor
- [ ] Admin panel `/admin/login` → `/admin/rfq` yönlendiriyor
- [ ] Test RFQ gönderildi, admin + müşteri maili alındı
- [ ] Domain SSL sertifikası aktif (Vercel otomatik)
