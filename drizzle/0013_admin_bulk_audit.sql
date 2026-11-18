-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0013 — Yönetim paneli işlem kaydı (admin_audit_log)                     ║
-- ║                                                                          ║
-- ║  DURUM: DEVELOPMENT'A UYGULANIR. PRODUCTION'A UYGULANMADI.               ║
-- ║  Production uygulaması AYRI KULLANICI ONAYINA tabidir.                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- GEREKÇE (karar K9 + K10)
--   Toplu işlemler (bulgu P5) tek istekte en fazla 100 ürünü etkiler.
--   "Kim, ne zaman, hangi ürüne, ne yaptı" sorusunun yanıtı bugün HİÇBİR
--   yerde tutulmuyor: tek iz `console.error` satırlarıdır ve onlar da
--   yalnızca HATALARI yazar. Başarılı bir toplu yayın onayının veya toplu
--   pasifleştirmenin kaydı yok.
--
--   Kullanıcı şartı K9: tablo eklensin, ancak "hassas bilgiler, şifreler,
--   tokenlar ve gizli anahtarlar loglanmasın".
--
-- TASARIM KARARLARI
--   · ADDITIVE: yalnızca YENİ bir tablo. Mevcut hiçbir tablo, kolon, kısıt
--     veya davranış değişmiyor. Ürün verisine dokunulmuyor.
--   · `product_id` için YABANCI ANAHTAR YOK (bilinçli): ürün silinse bile
--     işlem kaydı kalmalı. `ON DELETE CASCADE` denetim kaydını silerdi,
--     `ON DELETE SET NULL` ise hangi ürün olduğunu kaybettirirdi.
--   · `actor` yalnızca admin KULLANICI ADIDIR (`product_images.verified_by`
--     ile aynı bilgi sınıfı). Token, parola, oturum kimliği, e-posta veya
--     IP YAZILMAZ. Kimlik okunamazsa NULL kalır ve işlem ENGELLENMEZ.
--   · `before_state` / `after_state` yalnızca İLGİLİ ALANIN eski ve yeni
--     değerini taşır. (Kolon adları `before`/`after` DEĞİL: ikisi de SQL'de
--     anahtar sözcüktür ve tırnaksız kullanımı sürüm/araç bağımlı risk taşır.)
--     (örn. `{"seoReady": false}` → `{"seoReady": true}`). Uygulama
--     tarafında beyaz liste uygulanır (`src/lib/audit-log.ts`).
--   · `ck_admin_audit_no_secrets`: veritabanı SEVİYESİNDE ikinci savunma.
--     `before_state`/`after_state` nesnelerinin ÜST DÜZEY anahtarları arasında
--     parola/token/anahtar adları bulunamaz. jsonb `?|` operatörü yalnızca
--     üst düzey anahtarlara bakar — bu kısıt uygulama beyaz listesinin
--     YERİNE GEÇMEZ, onu destekler.
--   · Kayıt yazımı işlemi ASLA DÜŞÜRMEZ: uygulama tarafında hata yutulur
--     (denetim kaydı yazılamadı diye geçerli bir işlem başarısız olmamalı).
--
-- PRODUCTION'DA NE OLUR
--   Yeni ve boş bir tablo oluşur. Mevcut sorgular bu tabloyu okumadığı için
--   davranış değişmez. Kod bu tablodan ÖNCE deploy edilirse toplu işlem
--   kaydı yazılamaz ve sessizce atlanır (işlem yine çalışır) — yine de
--   doğru sıra proje CLAUDE.md §5 gereği MIGRATION ÖNCE'dir.
--
-- GERİ ALMA (rollback)
--   DROP TABLE IF EXISTS admin_audit_log;
--   (Yetkiler tabloyla birlikte gider; ayrı REVOKE gerekmez.)

-- ── PREFLIGHT ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_var boolean;
BEGIN
  SELECT to_regclass('public.admin_audit_log') IS NOT NULL INTO v_var;
  RAISE NOTICE 'PREFLIGHT admin_audit_log tablosu var mi: %', v_var;
  RAISE NOTICE 'PREFLIGHT urun sayisi: %', (SELECT COUNT(*) FROM products);
END $$;

-- ── UYGULAMA ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Admin kullanıcı adı. Okunamazsa NULL; gizli değer ASLA yazılmaz.
  actor       varchar(200),
  -- Uygulama tarafında beyaz listelenmiş eylem adı (örn. 'bulk_publish').
  action      varchar(60)  NOT NULL,
  -- Şimdilik yalnızca 'product'; ileride başka varlıklar eklenebilir.
  entity      varchar(40)  NOT NULL DEFAULT 'product',
  -- YABANCI ANAHTAR YOK: ürün silinse de iz kalır.
  product_id  uuid,
  before_state jsonb,
  after_state  jsonb,
  outcome     varchar(20)  NOT NULL,
  -- Reddedilen işlemin gerekçesi (yayın ölçütleri gibi). Gizli değer yok.
  reason      text,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_admin_audit_outcome'
  ) THEN
    ALTER TABLE admin_audit_log
      ADD CONSTRAINT ck_admin_audit_outcome
      CHECK (outcome IN ('ok', 'rejected', 'error'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_admin_audit_no_secrets'
  ) THEN
    ALTER TABLE admin_audit_log
      ADD CONSTRAINT ck_admin_audit_no_secrets
      CHECK (
        NOT COALESCE(
          before_state ?| ARRAY['password','pass','token','secret','jwt',
                          'authorization','cookie','apiKey','api_key',
                          'accessToken','access_token','refreshToken',
                          'refresh_token','sessionId','session_id'],
          false
        )
        AND NOT COALESCE(
          after_state ?| ARRAY['password','pass','token','secret','jwt',
                         'authorization','cookie','apiKey','api_key',
                         'accessToken','access_token','refreshToken',
                         'refresh_token','sessionId','session_id'],
          false
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_product
  ON admin_audit_log (product_id);

-- ── UYGULAMA ROLUNE YETKI ──────────────────────────────────────────────────
-- Tablo `neondb_owner` tarafindan olusturulur; uygulama BASKA bir rolle
-- baglanir (dev: `nidah_dev`, production: `nidah_web`). Yetki verilmezse
-- islem kaydi yazilamaz ve `audit-log.ts` hatayi yutar: islem calisir ama
-- iz KALMAZ. Sessiz kalmamasi icin yetki burada aciktan verilir.
--
-- Dev'de bu blok gereksizdir (DEFAULT PRIVILEGES zaten INSERT/SELECT/UPDATE/
-- DELETE veriyor) ve zararsizdir. Production'da ROLUN VARLIGI kontrol edilir;
-- rol yoksa atlanir ve hata verilmez.
DO $$
DECLARE
  v_rol text;
BEGIN
  FOREACH v_rol IN ARRAY ARRAY['nidah_dev', 'nidah_web'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_rol) THEN
      EXECUTE format('GRANT SELECT, INSERT ON admin_audit_log TO %I', v_rol);
      RAISE NOTICE 'YETKI verildi: % -> admin_audit_log (SELECT, INSERT)', v_rol;
    ELSE
      RAISE NOTICE 'YETKI atlandi: % rolu bu veritabaninda yok', v_rol;
    END IF;
  END LOOP;
END $$;

-- ── POST-CHECK ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_kolon  int;
  v_kisit  int;
  v_index  int;
  v_fk     int;
  v_satir  int;
  v_urun   int;
BEGIN
  SELECT COUNT(*) INTO v_kolon
    FROM information_schema.columns WHERE table_name = 'admin_audit_log';
  SELECT COUNT(*) INTO v_kisit
    FROM pg_constraint
   WHERE conname IN ('ck_admin_audit_outcome', 'ck_admin_audit_no_secrets');
  SELECT COUNT(*) INTO v_index
    FROM pg_indexes
   WHERE indexname IN ('idx_admin_audit_created', 'idx_admin_audit_product');
  SELECT COUNT(*) INTO v_fk
    FROM pg_constraint
   WHERE conrelid = 'admin_audit_log'::regclass AND contype = 'f';
  SELECT COUNT(*) INTO v_satir FROM admin_audit_log;
  SELECT COUNT(*) INTO v_urun  FROM products;

  RAISE NOTICE 'POST-CHECK kolon sayisi (beklenen 10): %', v_kolon;
  RAISE NOTICE 'POST-CHECK kisit sayisi (beklenen 2): %', v_kisit;
  RAISE NOTICE 'POST-CHECK index sayisi (beklenen 2): %', v_index;
  RAISE NOTICE 'POST-CHECK yabanci anahtar (beklenen 0 - bilincli): %', v_fk;
  RAISE NOTICE 'POST-CHECK kayit sayisi (beklenen 0): %', v_satir;
  RAISE NOTICE 'POST-CHECK urun sayisi DEGISMEDI: %', v_urun;

  IF v_kolon <> 10 THEN
    RAISE EXCEPTION 'POST-CHECK BASARISIZ: kolon sayisi % (beklenen 10)', v_kolon;
  END IF;
  IF v_kisit <> 2 THEN
    RAISE EXCEPTION 'POST-CHECK BASARISIZ: kisit sayisi % (beklenen 2)', v_kisit;
  END IF;
  IF v_index <> 2 THEN
    RAISE EXCEPTION 'POST-CHECK BASARISIZ: index sayisi % (beklenen 2)', v_index;
  END IF;
END $$;

-- ── KISIT KANITI ───────────────────────────────────────────────────────────
-- Gizli anahtar kisitinin GERCEKTEN calistigini kanitlar: asagidaki INSERT
-- REDDEDILMEK ZORUNDADIR. Reddedilmezse migration hata ile durur.
DO $$
DECLARE
  v_reddedildi boolean := false;
BEGIN
  BEGIN
    INSERT INTO admin_audit_log (actor, action, entity, outcome, after_state)
    VALUES ('kisit-testi', 'constraint_proof', 'product', 'ok',
            '{"password": "x"}'::jsonb);
  EXCEPTION WHEN check_violation THEN
    v_reddedildi := true;
  END;

  IF NOT v_reddedildi THEN
    RAISE EXCEPTION
      'POST-CHECK BASARISIZ: gizli anahtar kisiti calismiyor - parola iceren kayit YAZILDI';
  END IF;

  RAISE NOTICE 'KANIT: parola anahtari iceren kayit REDDEDILDI (beklenen davranis)';
  RAISE NOTICE 'KANIT: tablodaki kayit sayisi: % (beklenen 0)',
    (SELECT COUNT(*) FROM admin_audit_log);
END $$;
