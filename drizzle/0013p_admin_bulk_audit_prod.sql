-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0013p — admin_audit_log · PRODUCTION VARYANTI                           ║
-- ║                                                                          ║
-- ║  DURUM: HENÜZ UYGULANMADI. Production uygulaması AYRI ONAYA tabidir.      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- NEDEN AYRI BİR DOSYA (karar K14 + K15)
--   `0013_admin_bulk_audit.sql` development'ta uygulandı ama iki eksiği var:
--
--   1. **İŞLEM SARMALI YOK.** `0010`–`0012` dosyaları `BEGIN … COMMIT`
--      içindedir; `0013` değildir. Proje çalıştırıcısı
--      (`psql -v ON_ERROR_STOP=1 -f dosya`) her ifadeyi AYRI işlem olarak
--      çalıştırır: POST-CHECK hata verirse tablo, index ve yetkiler
--      YERİNDE KALIR. Tekrar çalıştırmak düzeltir, ama "ya hep ya hiç"
--      değildir. Bu dosya sarmalı ekler.
--
--   2. **YETKİ HEDEFİ.** `0013` yetkiyi doğrudan `nidah_web`'e veriyordu.
--      Production konvansiyonu `nidah_rw` GRUP ROLÜDÜR: tablo yetkileri ona
--      verilir, `nidah_web` o grubun üyesidir (ölçüldü, 2026-11-18).
--      Bu dosya her ikisini de — rol VARSA — kapsar.
--
-- ── EN AZ YETKİ (karar K15) ────────────────────────────────────────────────
--   Uygulamanın bu tabloda yaptığı tek iş `INSERT`'tir
--   (`src/lib/audit-log.ts` → `recordAdminAudit`). Panelde kayıt okuma
--   ekranı henüz yoktur, ama ileride gerekeceği için `SELECT` de verilir.
--   `UPDATE` ve `DELETE` BİLİNÇLİ OLARAK VERİLMEZ: bir işlem kaydı
--   değiştirilemez ve silinemez olmalıdır.
--
--   NOT: production'da `neondb_owner`'ın varsayılan yetki kaydı
--   (`pg_default_acl`) yeni tablolarda `nidah_rw`'ye zaten
--   INSERT/SELECT/UPDATE/DELETE veriyor. Yani bu GRANT bloğu TEK BAŞINA
--   belirleyici değildir; varsayılan yetki daha GENİŞ bir küme verir.
--   Yetki daraltmak (UPDATE/DELETE'i geri almak) AYRI bir karardır ve bu
--   migration'ın kapsamında DEĞİLDİR.
--
-- ── 0013 İLE AYNI OLANLAR ──────────────────────────────────────────────────
--   Tablo tanımı, 2 CHECK kısıtı, 2 index, yabancı anahtarın bilinçli
--   yokluğu ve gizli anahtar kısıtının kanıt testi BİREBİR AYNIDIR.
--
-- ── GERİ ALMA ──────────────────────────────────────────────────────────────
--   DROP TABLE IF EXISTS admin_audit_log;   -- yetkiler ve index'ler birlikte gider

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- ── PREFLIGHT ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_var boolean;
BEGIN
  SELECT to_regclass('public.admin_audit_log') IS NOT NULL INTO v_var;
  RAISE NOTICE '0013p PREFLIGHT admin_audit_log tablosu var mi: %', v_var;
  RAISE NOTICE '0013p PREFLIGHT urun sayisi (degismeyecek): %', (SELECT count(*) FROM products);
END $$;

-- ── TABLO ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Admin kullanıcı adı. Okunamazsa NULL; gizli değer ASLA yazılmaz.
  actor        varchar(200),
  -- Uygulama tarafında beyaz listelenmiş eylem adı (örn. 'bulk_publish').
  action       varchar(60)  NOT NULL,
  entity       varchar(40)  NOT NULL DEFAULT 'product',
  -- YABANCI ANAHTAR YOK: ürün silinse de iz kalır.
  product_id   uuid,
  before_state jsonb,
  after_state  jsonb,
  outcome      varchar(20)  NOT NULL,
  reason       text,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_admin_audit_outcome') THEN
    ALTER TABLE admin_audit_log
      ADD CONSTRAINT ck_admin_audit_outcome
      CHECK (outcome IN ('ok', 'rejected', 'error'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_admin_audit_no_secrets') THEN
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

-- ── UYGULAMA ROLÜNE EN AZ YETKİ ────────────────────────────────────────────
-- Rol YOKSA atlanır ve hata verilmez. UPDATE/DELETE bilinçli olarak yok.
DO $$
DECLARE
  v_rol text;
BEGIN
  FOREACH v_rol IN ARRAY ARRAY['nidah_rw', 'nidah_web', 'nidah_dev'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_rol) THEN
      EXECUTE format('GRANT SELECT, INSERT ON admin_audit_log TO %I', v_rol);
      RAISE NOTICE '0013p YETKI verildi: % -> admin_audit_log (SELECT, INSERT)', v_rol;
    ELSE
      RAISE NOTICE '0013p YETKI atlandi: % rolu bu veritabaninda yok', v_rol;
    END IF;
  END LOOP;
END $$;

-- ── POST-CHECK ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_kolon int;
  v_kisit int;
  v_index int;
  v_fk    int;
  v_satir bigint;
BEGIN
  SELECT count(*) INTO v_kolon FROM information_schema.columns
   WHERE table_name='admin_audit_log';
  SELECT count(*) INTO v_kisit FROM pg_constraint
   WHERE conname IN ('ck_admin_audit_outcome','ck_admin_audit_no_secrets');
  SELECT count(*) INTO v_index FROM pg_indexes
   WHERE indexname IN ('idx_admin_audit_created','idx_admin_audit_product');
  SELECT count(*) INTO v_fk FROM pg_constraint
   WHERE conrelid='admin_audit_log'::regclass AND contype='f';
  SELECT count(*) INTO v_satir FROM admin_audit_log;

  RAISE NOTICE '0013p POST-CHECK kolon (beklenen 10): %', v_kolon;
  RAISE NOTICE '0013p POST-CHECK kisit (beklenen 2): %', v_kisit;
  RAISE NOTICE '0013p POST-CHECK index (beklenen 2): %', v_index;
  RAISE NOTICE '0013p POST-CHECK yabanci anahtar (beklenen 0 - bilincli): %', v_fk;
  RAISE NOTICE '0013p POST-CHECK kayit (beklenen 0): %', v_satir;

  IF v_kolon <> 10 THEN RAISE EXCEPTION '0013p POST-CHECK: kolon sayisi % (beklenen 10).', v_kolon; END IF;
  IF v_kisit <> 2 THEN RAISE EXCEPTION '0013p POST-CHECK: kisit sayisi % (beklenen 2).', v_kisit; END IF;
  IF v_index <> 2 THEN RAISE EXCEPTION '0013p POST-CHECK: index sayisi % (beklenen 2).', v_index; END IF;
END $$;

-- ── KISIT KANITI ───────────────────────────────────────────────────────────
-- Gizli anahtar kisitinin GERCEKTEN calistigini kanitlar: asagidaki INSERT
-- REDDEDILMEK ZORUNDADIR. Reddedilmezse migration hata verir ve TUM islem
-- geri alinir (bu dosya BEGIN/COMMIT icindedir).
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
      '0013p POST-CHECK BASARISIZ: gizli anahtar kisiti calismiyor - parola iceren kayit YAZILDI';
  END IF;

  RAISE NOTICE '0013p KANIT: parola anahtari iceren kayit REDDEDILDI (beklenen davranis).';
  RAISE NOTICE '0013p KANIT: tablodaki kayit sayisi: % (beklenen 0).',
    (SELECT count(*) FROM admin_audit_log);
END $$;

COMMIT;
