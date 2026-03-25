from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    db: str
    schema_discovered: bool = False


class PartSummary(BaseModel):
    id: str
    part_number: str
    description: str
    brand_name: str = ""
    machine_count: int = 0
    supersession_count: int = 0
    has_image: bool = False


class PartDetailResponse(BaseModel):
    id: str
    part_number: str
    description: str
    alt_number: Optional[str] = None
    details: dict[str, Any] = {}


class PartSearchResponse(BaseModel):
    parts: list[PartSummary]
    total: int
    page: int
    pageSize: int
    totalPages: int


class SuggestItem(BaseModel):
    part_number: str
    description: str


class SuggestResponse(BaseModel):
    suggestions: list[SuggestItem]
