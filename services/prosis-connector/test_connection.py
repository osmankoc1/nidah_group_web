"""
Oracle bağlantı ve schema keşif testi.
Sadece SELECT çalıştırır — DB'ye hiçbir şey yazılmaz.

Kullanım:
  .venv\Scripts\python test_connection.py
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv()

ORACLE_USER     = os.getenv("ORACLE_USER",     "PROSIS")
ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD", "PROSIS")
ORACLE_DSN      = os.getenv("ORACLE_DSN",      "localhost:1521/xe")
ORACLE_LIB_DIR  = os.getenv("ORACLE_LIB_DIR",  "").strip()

print("=" * 60)
print("Prosis Connector — Oracle Bağlantı Testi")
print("=" * 60)
print(f"  DSN      : {ORACLE_DSN}")
print(f"  User     : {ORACLE_USER}")
print(f"  Lib dir  : {ORACLE_LIB_DIR or '(PATH üzerinden)'}")
print()

# ── 1. oracledb import & thick mode ──────────────────────────────────────────
try:
    import oracledb
    print("[1/5] oracledb import OK — sürüm:", oracledb.__version__)
except ImportError as e:
    print(f"[1/5] HATA: oracledb import edilemedi: {e}")
    sys.exit(1)

try:
    oracledb.init_oracle_client(lib_dir=ORACLE_LIB_DIR if ORACLE_LIB_DIR else None)
    print("[2/5] Thick mode (Oracle Instant Client) başlatıldı OK")
except Exception as e:
    print(f"[2/5] HATA: Thick mode başlatılamadı: {e}")
    print()
    print("Olası çözümler:")
    print("  - .env dosyasındaki ORACLE_LIB_DIR değerini kontrol edin")
    print("  - Oracle Instant Client'ın kurulu olduğundan emin olun")
    sys.exit(1)

# ── 2. Bağlantı testi ─────────────────────────────────────────────────────────
try:
    conn = oracledb.connect(
        user=ORACLE_USER,
        password=ORACLE_PASSWORD,
        dsn=ORACLE_DSN,
    )
    print(f"[3/5] Bağlantı başarılı — Oracle version: {conn.version}")
except Exception as e:
    print(f"[3/5] HATA: Bağlantı kurulamadı: {e}")
    sys.exit(1)

# ── 3. Schema keşfi ───────────────────────────────────────────────────────────
print()
print("[4/5] Schema keşfi — GLAD_PART ve EXT_PARTROW kolonları:")
try:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_ID
            FROM   ALL_COLUMNS
            WHERE  TABLE_NAME IN ('GLAD_PART', 'EXT_PARTROW')
              AND  OWNER = :owner
            ORDER  BY TABLE_NAME, COLUMN_ID
            """,
            owner=ORACLE_USER.upper(),
        )
        rows = cur.fetchall()

    if not rows:
        # Belki şema adı farklıdır, tüm erişilebilir tabloları listele
        print("  UYARI: Bu kullanıcı altında GLAD_PART/EXT_PARTROW bulunamadı.")
        print("  Erişilebilir tablolar aranıyor...")
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT OWNER, TABLE_NAME
                FROM   ALL_TABLES
                WHERE  TABLE_NAME LIKE '%PART%'
                ORDER  BY OWNER, TABLE_NAME
                FETCH FIRST 20 ROWS ONLY
                """
            )
            alt_rows = cur.fetchall()
        if alt_rows:
            print(f"  'PART' içeren tablolar ({len(alt_rows)} adet):")
            for r in alt_rows:
                print(f"    {r[0]}.{r[1]}")
        else:
            print("  Hiçbir PART tablosu erişilebilir değil.")
    else:
        glad_cols = [(r[1], r[2]) for r in rows if r[0] == "GLAD_PART"]
        ext_cols  = [(r[1], r[2]) for r in rows if r[0] == "EXT_PARTROW"]

        print(f"\n  GLAD_PART ({len(glad_cols)} kolon):")
        for col, dtype in glad_cols:
            print(f"    {col:<30} {dtype}")

        if ext_cols:
            print(f"\n  EXT_PARTROW ({len(ext_cols)} kolon):")
            for col, dtype in ext_cols:
                print(f"    {col:<30} {dtype}")
        else:
            print("\n  EXT_PARTROW: bu kullanıcıdan erişilemiyor veya mevcut değil.")

except Exception as e:
    print(f"  HATA: Schema sorgusu başarısız: {e}")

# ── 4. Örnek veri sorgusu ─────────────────────────────────────────────────────
print()
print("[5/5] GLAD_PART'tan ilk 5 satır:")
try:
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT * FROM (
                SELECT * FROM {ORACLE_USER.upper()}.GLAD_PART
                ORDER BY 1
            ) WHERE ROWNUM <= 5
            """
        )
        col_names = [d[0] for d in cur.description]
        sample_rows = cur.fetchall()

    print(f"  Kolonlar: {col_names}")
    print()
    for i, row in enumerate(sample_rows, 1):
        print(f"  Satır {i}: {dict(zip(col_names, row))}")

    with conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {ORACLE_USER.upper()}.GLAD_PART")
        total = cur.fetchone()[0]
    print(f"\n  Toplam satır sayısı: {total:,}")

except Exception as e:
    print(f"  HATA: Veri sorgusu başarısız: {e}")

conn.close()

print()
print("=" * 60)
print("Test tamamlandı.")
print("=" * 60)
