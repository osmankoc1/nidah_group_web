"""
Oracle XE 11g read-only connector.

Verified schema (2026-02):

  EXT_PARTROW  (4,390,108 rows, 311,647 distinct parts) — PRIMARY CATALOG SOURCE
    IDALFASU   VARCHAR2(3)   brand prefix  e.g. 'VOE', 'RM', 'CH'
    IDALFANR   VARCHAR2(17)  part number   e.g. '14881048', '13D-1616'
    GLB_ANM1-4 VARCHAR2(100) annotations / descriptions
    KAT_ID     VARCHAR2(12)  catalogue id  → EXT_CATALOGUE.KAT_ID
    SUBGRP     VARCHAR2(10)  sub-group
    AVSNITT    VARCHAR2(10)  section id

  EXT_CATALOGUE  (718 rows)
    KAT_ID     VARCHAR2(12)
    BEKATALO   VARCHAR2(200) machine name  e.g. 'DD85', 'EW70'
    BEMODELL   VARCHAR2(200) model / serial range

  EXT_SECTION  (222,446 rows)
    KAT_ID, SUBGRP, AVSNITT, BILDID → EXT_IMAGE.IMAGEID

  EXT_IMAGE  (91,582 rows)
    IMAGEID VARCHAR2, DATA BLOB (empty), POSITIONS CLOB

  EXT_REPLACINGPART  (130,196 rows)
    IDALFANR      old part number (being superseded)
    IDALFASU      old brand prefix
    IDALFANR_NEW  new replacement part number
    IDALFASU_NEW  new brand prefix
    TEXT          supersession note

  EXT_REPLACEDPART  (170,853 rows)
    IDALFANR, IDALFASU, TEXT_SHORT  — obsoleted parts

  GLAD_PART_EXCH_CROSS  (5,868 rows) — exchange cross-references
    PARTNO, PARTNO_EX, EXCHANGE_NOTE

  EXT_SERVINFO  (157,929 rows) — service documents (linked by KAT_ID)
    ID, TITLE, TYPENAME, KAT_ID, LANGUAGEID, FUNCTIONGRP

Full part number = IDALFASU + ' ' + IDALFANR  e.g. "VOE 14881048"
URL id = same string (caller must URL-encode spaces)
"""
import logging
import os
import re
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Thick mode init (once per process) ────────────────────────────────────────
try:
    import oracledb
    _lib = os.getenv("ORACLE_LIB_DIR", "").strip()
    oracledb.init_oracle_client(lib_dir=_lib if _lib else None)
    logger.info("oracledb thick mode initialised")
except Exception as _e:
    logger.warning("oracledb thick-mode init warning: %s", _e)

# ── Brand name mapping (OEM prefix → display name) ────────────────────────────
_BRAND_NAMES: dict[str, str] = {
    "VOE": "Volvo CE",
    "SA":  "Volvo",
    "RM":  "Volvo CE",
    "CH":  "Champion",
    "ZM":  "Volvo CE",
    "PJ":  "Volvo CE",
}


def _brand_name(prefix: str) -> str:
    return _BRAND_NAMES.get((prefix or "").upper(), prefix or "")


def _full_partno(idf: str, no: str) -> str:
    idf = (idf or "").strip()
    no  = (no  or "").strip()
    return f"{idf} {no}" if idf else no


def _parse_id(part_id: str) -> tuple[str, str]:
    """
    Parse URL id → (IDALFASU, IDALFANR).
    Format: "VOE 14881048" (split on first space).
    """
    s = part_id.strip()
    if " " in s:
        idf, _, no = s.partition(" ")
        return idf.upper(), no.upper()
    i = 0
    while i < len(s) and i < 4 and s[i].isalpha():
        i += 1
    return (s[:i].upper(), s[i:].upper()) if i else ("", s.upper())


def _empty_result(page: int, page_size: int) -> dict:
    return {"parts": [], "total": 0, "page": page, "pageSize": page_size, "totalPages": 0}


def _build_or_clause(
    pairs: list[tuple[str, str]],
    idf_col: str = "IDALFASU",
    no_col: str = "IDALFANR",
    idf_prefix: str = "idf",
    no_prefix: str = "no",
) -> tuple[str, dict]:
    """
    Build Oracle 11g compatible OR clause with bind variables for
    a list of (IDALFASU, IDALFANR) pairs.
    Returns (sql_fragment, bind_dict).
    """
    clauses = []
    binds: dict = {}
    for i, (idf, no) in enumerate(pairs):
        clauses.append(
            f"({idf_col} = :{idf_prefix}{i} AND {no_col} = :{no_prefix}{i})"
        )
        binds[f"{idf_prefix}{i}"] = idf
        binds[f"{no_prefix}{i}"] = no
    return " OR ".join(clauses), binds


# ── Safe KAT_ID validator (for SQL IN list) ────────────────────────────────────
_KAT_RE = re.compile(r"^[\w\-]+$")


class Database:
    """Synchronous Oracle wrapper.
    Call all public methods via asyncio.to_thread()."""

    def __init__(self) -> None:
        self.pool = None
        self._user     = os.getenv("ORACLE_USER",     "PROSIS").upper()
        self._password = os.getenv("ORACLE_PASSWORD", "PROSIS")
        self._dsn      = os.getenv("ORACLE_DSN",      "localhost:1521/xe")
        self._max_rows = min(int(os.getenv("MAX_ROWS", "500")), 2000)
        self.schema    = type("S", (), {"discovered": False})()

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    def init(self) -> None:
        try:
            self.pool = oracledb.create_pool(
                user=self._user,
                password=self._password,
                dsn=self._dsn,
                min=1, max=5, increment=1,
            )
            logger.info("Oracle pool ready  dsn=%s  user=%s", self._dsn, self._user)
            self.schema.discovered = True
        except Exception as exc:
            logger.error("Oracle pool failed: %s", exc)
            self.pool = None

    def close(self) -> None:
        if self.pool:
            try:
                self.pool.close()
            except Exception:
                pass

    def is_connected(self) -> bool:
        return self.pool is not None

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _enrich_page(
        self,
        cur,
        pairs: list[tuple[str, str]],
    ) -> tuple[dict, dict, set]:
        """
        Batch-enrich a page of parts with machineCount, supersessionCount, hasImage.
        Returns (mc_map, sc_map, img_set) keyed by (IDALFASU, IDALFANR).
        Falls back to empty dicts/sets on any error.
        """
        u = self._user
        mc_map: dict[tuple, int] = {}
        sc_map: dict[tuple, int] = {}
        img_set: set[tuple] = set()

        if not pairs:
            return mc_map, sc_map, img_set

        try:
            # ── machineCount ─────────────────────────────────────────────────
            or_clause, binds = _build_or_clause(
                pairs, "ep.IDALFASU", "ep.IDALFANR"
            )
            cur.execute(
                f"""
                SELECT ep.IDALFASU, ep.IDALFANR,
                       COUNT(DISTINCT ec.BEKATALO) mc
                FROM   {u}.EXT_PARTROW ep
                JOIN   {u}.EXT_CATALOGUE ec ON ec.KAT_ID = ep.KAT_ID
                WHERE  {or_clause}
                GROUP  BY ep.IDALFASU, ep.IDALFANR
                """,
                **binds,
            )
            for r in cur.fetchall():
                mc_map[(r[0], r[1])] = int(r[2])
        except Exception as exc:
            logger.warning("machineCount batch failed: %s", exc)

        try:
            # ── supersessionCount (this part is old — being replaced) ─────────
            or_clause, binds = _build_or_clause(pairs)
            cur.execute(
                f"""
                SELECT IDALFASU, IDALFANR, COUNT(*) cnt
                FROM   {u}.EXT_REPLACINGPART
                WHERE  {or_clause}
                GROUP  BY IDALFASU, IDALFANR
                """,
                **binds,
            )
            for r in cur.fetchall():
                key = (r[0], r[1])
                sc_map[key] = sc_map.get(key, 0) + int(r[2])

            # ── supersessionCount (this part is new — replaces old parts) ─────
            or_clause2, binds2 = _build_or_clause(
                pairs,
                idf_col="IDALFASU_NEW", no_col="IDALFANR_NEW",
                idf_prefix="nidf", no_prefix="nno",
            )
            cur.execute(
                f"""
                SELECT IDALFASU_NEW, IDALFANR_NEW, COUNT(*) cnt
                FROM   {u}.EXT_REPLACINGPART
                WHERE  {or_clause2}
                GROUP  BY IDALFASU_NEW, IDALFANR_NEW
                """,
                **binds2,
            )
            for r in cur.fetchall():
                key = (r[0], r[1])
                sc_map[key] = sc_map.get(key, 0) + int(r[2])
        except Exception as exc:
            logger.warning("supersessionCount batch failed: %s", exc)

        try:
            # ── hasImage (section diagram linked via EXT_SECTION.BILDID) ──────
            or_clause, binds = _build_or_clause(
                pairs, "ep.IDALFASU", "ep.IDALFANR"
            )
            cur.execute(
                f"""
                SELECT DISTINCT ep.IDALFASU, ep.IDALFANR
                FROM   {u}.EXT_PARTROW ep
                JOIN   {u}.EXT_SECTION es
                    ON es.KAT_ID  = ep.KAT_ID
                   AND es.SUBGRP  = ep.SUBGRP
                   AND es.AVSNITT = ep.AVSNITT
                WHERE  es.BILDID IS NOT NULL
                  AND  ({or_clause})
                """,
                **binds,
            )
            for r in cur.fetchall():
                img_set.add((r[0], r[1]))
        except Exception as exc:
            logger.warning("hasImage batch failed: %s", exc)

        return mc_map, sc_map, img_set

    # ── Public API ─────────────────────────────────────────────────────────────

    def search_parts(
        self, q: str, page: int, page_size: int, brand: str = ""
    ) -> dict:
        """
        Search EXT_PARTROW DISTINCT (IDALFASU, IDALFANR) by part number prefix.
        Optional brand filter by IDALFASU.
        Returns enriched page with machineCount, supersessionCount, hasImage, brandName.
        Oracle 11g pagination via ROWNUM.
        """
        if not self.pool:
            return _empty_result(page, page_size)

        page_size = min(page_size, 100)
        offset    = (page - 1) * page_size
        end_row   = min(offset + page_size, self._max_rows)
        u         = self._user
        q         = q.strip().upper()
        brand     = brand.strip().upper()

        # Short alpha-only query (1-3 chars, no brand filter) → exact IDALFASU brand match
        use_idf = bool(q) and not brand and len(q) <= 3 and q.isalpha()

        try:
            with self.pool.acquire() as conn:
                with conn.cursor() as cur:

                    # ── Build WHERE fragment ──────────────────────────────────
                    if q:
                        if use_idf:
                            where = "IDALFASU = :q"
                            count_binds = {"q": q}
                            page_binds  = {"q": q, "end_row": end_row, "offset": offset}
                        else:
                            where = "UPPER(IDALFANR) LIKE :p"
                            count_binds = {"p": f"{q}%"}
                            page_binds  = {"p": f"{q}%", "end_row": end_row, "offset": offset}
                            if brand:
                                where += " AND IDALFASU = :brand"
                                count_binds["brand"] = brand
                                page_binds["brand"]  = brand
                    else:
                        where = "1=1"
                        count_binds = {}
                        page_binds  = {"end_row": end_row, "offset": offset}
                        if brand:
                            where = "IDALFASU = :brand"
                            count_binds["brand"] = brand
                            page_binds["brand"]  = brand

                    # ── Count ─────────────────────────────────────────────────
                    cur.execute(
                        f"""
                        SELECT COUNT(DISTINCT IDALFANR || IDALFASU)
                        FROM   {u}.EXT_PARTROW
                        WHERE  {where}
                        """,
                        **count_binds,
                    )
                    total = cur.fetchone()[0]

                    # ── Paginated page ────────────────────────────────────────
                    cur.execute(
                        f"""
                        SELECT * FROM (
                            SELECT ROWNUM AS rn, t.* FROM (
                                SELECT
                                    IDALFASU || ' ' || IDALFANR AS id,
                                    IDALFASU,
                                    IDALFANR,
                                    MAX(GLB_ANM1) AS description
                                FROM   {u}.EXT_PARTROW
                                WHERE  {where}
                                GROUP  BY IDALFASU, IDALFANR
                                ORDER  BY IDALFASU, IDALFANR
                            ) t WHERE ROWNUM <= :end_row
                        ) WHERE rn > :offset
                        """,
                        **page_binds,
                    )
                    rows = cur.fetchall()
                    # row: (rn=0, id=1, IDALFASU=2, IDALFANR=3, description=4)

                    # ── Batch enrichment ──────────────────────────────────────
                    pairs = [(str(r[2]), str(r[3])) for r in rows if r[2] and r[3]]
                    mc_map, sc_map, img_set = self._enrich_page(cur, pairs)

            capped = min(total, self._max_rows)
            parts = []
            for r in rows:
                idf = str(r[2]) if r[2] else ""
                no  = str(r[3]) if r[3] else ""
                key = (idf, no)
                parts.append(
                    {
                        "id":                str(r[1]) if r[1] else "",
                        "part_number":       str(r[1]) if r[1] else "",
                        "description":       str(r[4]) if r[4] else "",
                        "brand_name":        _brand_name(idf),
                        "machine_count":     mc_map.get(key, 0),
                        "supersession_count": sc_map.get(key, 0),
                        "has_image":         key in img_set,
                    }
                )

            return {
                "parts":      parts,
                "total":      capped,
                "page":       page,
                "pageSize":   page_size,
                "totalPages": max(1, (capped + page_size - 1) // page_size),
            }

        except Exception as exc:
            logger.error("search_parts error: %s", exc)
            raise

    def get_part(self, part_id: str) -> Optional[dict]:
        """
        Fetch full part detail.
        Returns enriched dict with fitments, supersession, crossRefs, documents, imageIds.
        """
        if not self.pool:
            return None

        idf, partno = _parse_id(part_id)
        u = self._user

        try:
            with self.pool.acquire() as conn:
                with conn.cursor() as cur:

                    # ── 1. Verify part exists + collect annotations ───────────
                    if idf:
                        cur.execute(
                            f"""
                            SELECT DISTINCT GLB_ANM1, GLB_ANM2, GLB_ANM3, GLB_ANM4
                            FROM   {u}.EXT_PARTROW
                            WHERE  IDALFASU = :idf AND UPPER(IDALFANR) = :no
                              AND  ROWNUM <= 20
                            """,
                            idf=idf, no=partno,
                        )
                    else:
                        cur.execute(
                            f"""
                            SELECT DISTINCT GLB_ANM1, GLB_ANM2, GLB_ANM3, GLB_ANM4
                            FROM   {u}.EXT_PARTROW
                            WHERE  UPPER(IDALFANR) = :no AND ROWNUM <= 20
                            """,
                            no=partno,
                        )
                    ann_rows = cur.fetchall()

                    if not ann_rows:
                        # Fallback: try GLAD_PART
                        if idf:
                            cur.execute(
                                f"""
                                SELECT PARTNO_IDF, PARTNO
                                FROM   {u}.GLAD_PART
                                WHERE  PARTNO_IDF = :idf AND UPPER(PARTNO) = :no
                                  AND  ROWNUM = 1
                                """,
                                idf=idf, no=partno,
                            )
                        else:
                            cur.execute(
                                f"""
                                SELECT PARTNO_IDF, PARTNO
                                FROM   {u}.GLAD_PART
                                WHERE  UPPER(PARTNO) = :no AND ROWNUM = 1
                                """,
                                no=partno,
                            )
                        gp_row = cur.fetchone()
                        if not gp_row:
                            return None
                        real_idf = str(gp_row[0]) if gp_row[0] else idf
                        real_no  = str(gp_row[1]) if gp_row[1] else partno
                        return {
                            "id":          _full_partno(real_idf, real_no),
                            "part_number": _full_partno(real_idf, real_no),
                            "description": "",
                            "alt_number":  None,
                            "details": {
                                "brand_prefix": real_idf,
                                "brand_name":   _brand_name(real_idf),
                                "partno":       real_no,
                                "annotations":  [],
                                "fitments":     [],
                                "supersession": {"replaces": [], "replaced_by": []},
                                "cross_refs":   [],
                                "documents":    [],
                                "image_ids":    [],
                            },
                        }

                    # Collect unique annotations
                    annotations: list[str] = []
                    seen: set[str] = set()
                    for ar in ann_rows:
                        parts_ann = [str(a).strip() for a in ar if a and str(a).strip()]
                        combined  = " | ".join(parts_ann)
                        if combined and combined not in seen:
                            seen.add(combined)
                            annotations.append(combined)

                    # Resolve real IDALFASU
                    if idf:
                        cur.execute(
                            f"""
                            SELECT DISTINCT IDALFASU
                            FROM   {u}.EXT_PARTROW
                            WHERE  IDALFASU = :idf AND UPPER(IDALFANR) = :no
                              AND  ROWNUM = 1
                            """,
                            idf=idf, no=partno,
                        )
                    else:
                        cur.execute(
                            f"""
                            SELECT DISTINCT IDALFASU
                            FROM   {u}.EXT_PARTROW
                            WHERE  UPPER(IDALFANR) = :no AND ROWNUM = 1
                            """,
                            no=partno,
                        )
                    idf_row  = cur.fetchone()
                    real_idf = str(idf_row[0]) if idf_row else idf

                    # ── 2. Fitments (machines + serial range) ─────────────────
                    cur.execute(
                        f"""
                        SELECT DISTINCT ec.BEKATALO, ec.BEMODELL
                        FROM   {u}.EXT_PARTROW ep
                        JOIN   {u}.EXT_CATALOGUE ec ON ec.KAT_ID = ep.KAT_ID
                        WHERE  ep.IDALFASU = :idf AND UPPER(ep.IDALFANR) = :no
                          AND  ROWNUM <= 60
                        """,
                        idf=real_idf, no=partno,
                    )
                    fitments = [
                        {
                            "name":  str(r[0]).strip() if r[0] else "",
                            "model": str(r[1]).strip() if r[1] else "",
                        }
                        for r in cur.fetchall() if r[0]
                    ]

                    # ── 3. Supersession ───────────────────────────────────────
                    # replaces: old parts that this part supersedes
                    cur.execute(
                        f"""
                        SELECT IDALFANR, IDALFASU, TEXT
                        FROM   {u}.EXT_REPLACINGPART
                        WHERE  IDALFANR_NEW = :no AND IDALFASU_NEW = :idf
                          AND  ROWNUM <= 15
                        """,
                        no=partno, idf=real_idf,
                    )
                    replaces = [
                        {
                            "part_number": _full_partno(
                                str(r[1]) if r[1] else "",
                                str(r[0]) if r[0] else "",
                            ),
                            "note": str(r[2]).strip() if r[2] else "",
                        }
                        for r in cur.fetchall() if r[0]
                    ]

                    # replaced_by: newer parts that replace this one
                    cur.execute(
                        f"""
                        SELECT IDALFANR_NEW, IDALFASU_NEW, TEXT
                        FROM   {u}.EXT_REPLACINGPART
                        WHERE  IDALFANR = :no AND IDALFASU = :idf
                          AND  ROWNUM <= 15
                        """,
                        no=partno, idf=real_idf,
                    )
                    replaced_by = [
                        {
                            "part_number": _full_partno(
                                str(r[1]) if r[1] else "",
                                str(r[0]) if r[0] else "",
                            ),
                            "note": str(r[2]).strip() if r[2] else "",
                        }
                        for r in cur.fetchall() if r[0]
                    ]

                    # ── 4. Cross-references (exchange cross parts) ─────────────
                    cross_refs: list[dict] = []
                    try:
                        full_pid = _full_partno(real_idf, partno)
                        cur.execute(
                            f"""
                            SELECT PARTNO_EX, EXCHANGE_NOTE
                            FROM   {u}.GLAD_PART_EXCH_CROSS
                            WHERE  PARTNO = :pid AND ROWNUM <= 10
                            """,
                            pid=full_pid,
                        )
                        cross_refs = [
                            {
                                "part_number": str(r[0]).strip() if r[0] else "",
                                "note":        str(r[1]).strip() if r[1] else "",
                            }
                            for r in cur.fetchall() if r[0]
                        ]
                    except Exception as exc:
                        logger.warning("cross_refs query failed: %s", exc)

                    # ── 5. Section diagram IDs ─────────────────────────────────
                    image_ids: list[str] = []
                    try:
                        cur.execute(
                            f"""
                            SELECT DISTINCT es.BILDID
                            FROM   {u}.EXT_PARTROW ep
                            JOIN   {u}.EXT_SECTION es
                                ON es.KAT_ID  = ep.KAT_ID
                               AND es.SUBGRP  = ep.SUBGRP
                               AND es.AVSNITT = ep.AVSNITT
                            WHERE  ep.IDALFASU = :idf
                              AND  UPPER(ep.IDALFANR) = :no
                              AND  es.BILDID IS NOT NULL
                              AND  ROWNUM <= 5
                            """,
                            idf=real_idf, no=partno,
                        )
                        image_ids = [str(r[0]) for r in cur.fetchall() if r[0]]
                    except Exception as exc:
                        logger.warning("image_ids query failed: %s", exc)

                    # ── 6. Service documents (by KAT_IDs of this part) ─────────
                    documents: list[dict] = []
                    try:
                        cur.execute(
                            f"""
                            SELECT DISTINCT KAT_ID
                            FROM   {u}.EXT_PARTROW
                            WHERE  IDALFASU = :idf AND UPPER(IDALFANR) = :no
                              AND  ROWNUM <= 15
                            """,
                            idf=real_idf, no=partno,
                        )
                        kat_ids = [
                            str(r[0]) for r in cur.fetchall()
                            if r[0] and _KAT_RE.match(str(r[0]))
                        ]
                        if kat_ids:
                            in_list = ", ".join(f"'{k}'" for k in kat_ids)
                            cur.execute(
                                f"""
                                SELECT * FROM (
                                    SELECT DISTINCT TITLE, TYPENAME, LANGUAGEID
                                    FROM   {u}.EXT_SERVINFO
                                    WHERE  KAT_ID IN ({in_list})
                                      AND  LANGUAGEID = 1
                                    ORDER  BY TITLE
                                ) WHERE ROWNUM <= 15
                                """
                            )
                            documents = [
                                {
                                    "title":    str(r[0]).strip() if r[0] else "",
                                    "typename": str(r[1]).strip() if r[1] else "",
                                }
                                for r in cur.fetchall() if r[0]
                            ]
                    except Exception as exc:
                        logger.warning("documents query failed: %s", exc)

            full_no = _full_partno(real_idf, partno)
            return {
                "id":          full_no,
                "part_number": full_no,
                "description": annotations[0] if annotations else "",
                "alt_number":  None,
                "details": {
                    "brand_prefix": real_idf,
                    "brand_name":   _brand_name(real_idf),
                    "partno":       partno,
                    "annotations":  annotations,
                    "fitments":     fitments,
                    "supersession": {
                        "replaces":     replaces,
                        "replaced_by":  replaced_by,
                    },
                    "cross_refs":   cross_refs,
                    "documents":    documents,
                    "image_ids":    image_ids,
                },
            }

        except Exception as exc:
            logger.error("get_part error: %s", exc)
            raise

    def suggest_parts(self, q: str) -> dict:
        """Return ≤10 autocomplete suggestions matching IDALFANR prefix."""
        if not self.pool:
            return {"suggestions": []}

        u      = self._user
        q      = q.strip().upper()
        prefix = f"{q}%"

        try:
            with self.pool.acquire() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"""
                        SELECT * FROM (
                            SELECT
                                IDALFASU || ' ' || IDALFANR AS part_number,
                                MAX(GLB_ANM1)               AS description
                            FROM   {u}.EXT_PARTROW
                            WHERE  UPPER(IDALFANR) LIKE :q
                            GROUP  BY IDALFASU, IDALFANR
                            ORDER  BY IDALFANR
                        ) WHERE ROWNUM <= 10
                        """,
                        q=prefix,
                    )
                    rows = cur.fetchall()

            return {
                "suggestions": [
                    {
                        "part_number": str(r[0]) if r[0] else "",
                        "description": str(r[1]) if r[1] else "",
                    }
                    for r in rows if r[0]
                ]
            }

        except Exception as exc:
            logger.error("suggest_parts error: %s", exc)
            raise
