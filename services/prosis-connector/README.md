# Prosis Connector — Kurulum & Çalıştırma

FastAPI tabanlı, Oracle XE 11g üzerindeki Prosis veritabanına **sadece okuma** erişimi sağlayan servis.

---

## Gereksinimler

| Araç | Versiyon |
|---|---|
| Python | 3.11 + |
| Oracle Instant Client | 19c veya 21c |

---

## 1 — Oracle Instant Client Kurulumu (Windows)

1. [Oracle Instant Client WinX64 indirme sayfasına](https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html) gidin.
2. **"Basic Package"** zip dosyasını indirin (örn. `instantclient-basic-windows.x64-21.15.0.0.0dbru.zip`).
3. Zip içeriğini `C:\oracle\instantclient_21_15` gibi bir klasöre çıkarın.
4. `.env` dosyasındaki `ORACLE_LIB_DIR` değerini bu klasör yolu ile güncelleyin.

> **Not:** Oracle XE 11g sunucusu hâlâ 11g olsa da Instant Client 19c/21c kullanabilirsiniz. Thick mode sayesinde geriye dönük uyumluluk sağlanır.

---

## 2 — Python Ortamı

```cmd
cd services\prosis-connector

python -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt
```

---

## 3 — Yapılandırma

```cmd
copy .env.example .env
```

`.env` dosyasını açıp doldurun:

```
ORACLE_USER=PROSIS
ORACLE_PASSWORD=PROSIS
ORACLE_DSN=localhost:1521/xe
ORACLE_LIB_DIR=C:\oracle\instantclient_21_15
SERVICE_PORT=7001
```

---

## 4 — Çalıştırma

### Geliştirme (hot-reload)
```cmd
uvicorn main:app --host 0.0.0.0 --port 7001 --reload
```

### Production
```cmd
python main.py
```

Servis başladığında konsola şu satır çıkmalıdır:
```
INFO  oracledb thick mode initialised
INFO  Oracle connection pool created (dsn=localhost:1521/xe)
INFO  Schema discovery OK — part_no=IDALFANR  desc=DENOMINATION ...
```

---

## 5 — Endpoint Referansı

| Endpoint | Açıklama |
|---|---|
| `GET /health` | Servis ve DB durumu |
| `GET /parts/search?q=&page=1&pageSize=20` | Parça arama + sayfalama |
| `GET /parts/suggest?q=VOE` | Autocomplete önerileri (maks. 10) |
| `GET /parts/{part_id}` | Tek parça detayı |

Swagger UI: [http://localhost:7001/docs](http://localhost:7001/docs)

---

## 6 — Güvenlik Notları

- `.env` dosyası `.gitignore`'da listelenmiştir — **asla commit etmeyin**.
- Tüm SQL sorguları bind parametresi kullanır (SQL injection yok).
- Tablo/kolon adları kullanıcı girdisinden değil, schema discovery white-list'inden alınır.
- Servis **sadece SELECT** çalıştırır; `db.py` içinde herhangi bir DML bulunmamaktadır.
- `MAX_ROWS` ile döndürülen satır sayısı sınırlandırılmıştır (varsayılan 500).
- Her IP için dakikalık istek limiti uygulanır (varsayılan 60/dk).

---

## 7 — Windows Servisi Olarak Çalıştırma (Opsiyonel)

`NSSM` (Non-Sucking Service Manager) ile Windows servisi yapabilirsiniz:

```cmd
nssm install ProsisConnector "C:\path\to\.venv\Scripts\python.exe" "C:\path\to\services\prosis-connector\main.py"
nssm set ProsisConnector AppDirectory "C:\path\to\services\prosis-connector"
nssm start ProsisConnector
```

---

## 8 — Sorun Giderme

| Semptom | Olası Neden | Çözüm |
|---|---|---|
| `DPI-1047: Cannot locate a 64-bit Oracle Client library` | `ORACLE_LIB_DIR` yanlış | `.env` dosyasındaki yolu kontrol edin |
| `ORA-12541: TNS no listener` | Oracle XE çalışmıyor | `services.msc`'den OracleServiceXE'yi başlatın |
| `ORA-01017: invalid username/password` | Kullanıcı adı / şifre yanlış | `.env` dosyasını kontrol edin |
| Schema discovery logda "using defaults" | Tablolar farklı şemada | `ORACLE_USER`'ı tablo sahibi kullanıcı ile güncelleyin |
| 429 Too Many Requests | Rate limit aşıldı | `RATE_LIMIT_PER_MINUTE` değerini artırın |
