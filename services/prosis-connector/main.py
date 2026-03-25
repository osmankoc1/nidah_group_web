"""
Prosis Connector — FastAPI service
Exposes a read-only REST API over Oracle XE 11g (Prosis schema).

Endpoints:
  GET /health
  GET /parts/search?q=...&page=1&pageSize=20
  GET /parts/suggest?q=...
  GET /parts/{part_id}
"""
import asyncio
import logging
import os
import re
from contextlib import asynccontextmanager
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from cache import TTLCache
from db import Database
from models import (
    HealthResponse,
    PartDetailResponse,
    PartSearchResponse,
    SuggestResponse,
)
from rate_limiter import RateLimiter

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── Singletons ────────────────────────────────────────────────────────────────
db = Database()
cache = TTLCache(ttl=int(os.getenv("CACHE_TTL_SECONDS", "300")))
rate_limiter = RateLimiter(
    limit=int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")),
    window=60,
)

# ── CORS allowed origins ───────────────────────────────────────────────────────
_raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,https://www.nidahismak.com",
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup — runs sync Oracle init in thread so it doesn't block event loop
    await asyncio.to_thread(db.init)
    logger.info(
        "Startup complete. DB connected=%s  schema_discovered=%s",
        db.is_connected(),
        db.schema.discovered,
    )
    yield
    # shutdown
    await asyncio.to_thread(db.close)
    logger.info("Shutdown complete.")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Prosis Connector",
    description="Read-only Oracle XE 11g connector for Prosis parts catalog",
    version="1.0.0",
    lifespan=lifespan,
    # Disable the interactive docs in production if desired
    # docs_url=None, redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ── Helpers ────────────────────────────────────────────────────────────────────
def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


# Part-ID safety: only alphanumeric + dash / underscore / space / dot
_PART_ID_RE = re.compile(r"^[\w\-\.\s]{1,100}$")


def _validate_part_id(part_id: str) -> str:
    if not _PART_ID_RE.match(part_id):
        raise HTTPException(status_code=400, detail="Invalid part ID format")
    return part_id


# ── Rate-limit dependency ──────────────────────────────────────────────────────
def check_rate_limit(request: Request) -> None:
    ip = _client_ip(request)
    if not rate_limiter.allow(ip):
        raise HTTPException(
            status_code=429,
            detail="Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.",
        )


RateLimit = Annotated[None, Depends(check_rate_limit)]


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        db="connected" if db.is_connected() else "disconnected",
        schema_discovered=db.schema.discovered,
    )


@app.get("/parts/search", response_model=PartSearchResponse, tags=["Parts"])
async def search_parts(
    _rl: RateLimit,
    q: str = Query("", max_length=200, description="Arama terimi (parça no)"),
    brand: str = Query("", max_length=10, description="Marka filtresi (IDALFASU kodu)"),
    page: int = Query(1, ge=1, le=1000),
    pageSize: int = Query(20, ge=1, le=100),
) -> PartSearchResponse:
    """Parça no ile arama yapar, sayfalandırılmış ve zenginleştirilmiş sonuç döner."""
    cache_key = f"search:{q.strip().lower()}:{brand.strip().upper()}:{page}:{pageSize}"
    cached = cache.get(cache_key)
    if cached is not None:
        return PartSearchResponse(**cached)

    try:
        result = await asyncio.to_thread(
            db.search_parts, q.strip(), page, pageSize, brand.strip()
        )
    except Exception as exc:
        logger.error("search_parts failed: %s", exc)
        raise HTTPException(status_code=503, detail="Veritabanı bağlantı hatası")

    cache.set(cache_key, result)
    return PartSearchResponse(**result)


@app.get("/parts/suggest", response_model=SuggestResponse, tags=["Parts"])
async def suggest_parts(
    _rl: RateLimit,
    q: str = Query(..., min_length=1, max_length=100, description="Autocomplete sorgusu"),
) -> SuggestResponse:
    """Parça numarasının başına göre autocomplete önerileri döner."""
    cache_key = f"suggest:{q.strip().lower()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return SuggestResponse(**cached)

    try:
        result = await asyncio.to_thread(db.suggest_parts, q.strip())
    except Exception as exc:
        logger.error("suggest_parts failed: %s", exc)
        raise HTTPException(status_code=503, detail="Veritabanı bağlantı hatası")

    cache.set(cache_key, result, ttl=60)  # shorter TTL for suggest
    return SuggestResponse(**result)


@app.get("/parts/{part_id}", response_model=PartDetailResponse, tags=["Parts"])
async def get_part(
    _rl: RateLimit,
    part_id: str,
) -> PartDetailResponse:
    """Belirli bir parçanın detay bilgisini getirir."""
    safe_id = _validate_part_id(part_id)

    cache_key = f"part:{safe_id.lower()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return PartDetailResponse(**cached)

    try:
        result = await asyncio.to_thread(db.get_part, safe_id)
    except Exception as exc:
        logger.error("get_part failed: %s", exc)
        raise HTTPException(status_code=503, detail="Veritabanı bağlantı hatası")

    if result is None:
        raise HTTPException(status_code=404, detail="Parça bulunamadı")

    cache.set(cache_key, result)
    return PartDetailResponse(**result)


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def _global_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "Sunucu hatası"})


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("SERVICE_PORT", "7001"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
