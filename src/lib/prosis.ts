/**
 * Server-side helper for the parts catalog connector.
 * Used only in Server Components and API Route Handlers — never in client code.
 */

const CONNECTOR_URL = (
  process.env.PROSIS_CONNECTOR_URL ?? "http://localhost:7001"
).replace(/\/$/, "");

const TIMEOUT_MS = 12_000;

// ── Shared response types ──────────────────────────────────────────────────────

export interface PartSummary {
  id: string;
  part_number: string;
  description: string;
  brand_name: string;
  machine_count: number;
  supersession_count: number;
  has_image: boolean;
}

export interface FitmentEntry {
  name: string;
  model: string;
}

export interface SupersessionEntry {
  part_number: string;
  note: string;
}

export interface CrossRefEntry {
  part_number: string;
  note: string;
}

export interface DocumentEntry {
  title: string;
  typename: string;
}

export interface PartDetails {
  brand_prefix: string;
  brand_name: string;
  partno: string;
  annotations: string[];
  fitments: FitmentEntry[];
  supersession: {
    replaces: SupersessionEntry[];
    replaced_by: SupersessionEntry[];
  };
  cross_refs: CrossRefEntry[];
  documents: DocumentEntry[];
  image_ids: string[];
}

export interface PartDetail {
  id: string;
  part_number: string;
  description: string;
  alt_number: string | null;
  details: PartDetails;
}

export interface SearchResult {
  parts: PartSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SuggestItem {
  part_number: string;
  description: string;
}

// ── Internal fetch helper ──────────────────────────────────────────────────────

async function fetchConnector<T>(path: string): Promise<T> {
  const url = `${CONNECTOR_URL}${path}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Connector ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function searchParts(
  q: string,
  page: number,
  pageSize: number,
  brand = ""
): Promise<SearchResult> {
  const qs = new URLSearchParams({ q, page: String(page), pageSize: String(pageSize) });
  if (brand) qs.set("brand", brand);
  return fetchConnector<SearchResult>(`/parts/search?${qs}`);
}

export async function getPart(id: string): Promise<PartDetail | null> {
  try {
    return await fetchConnector<PartDetail>(`/parts/${encodeURIComponent(id)}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("404")) return null;
    throw err;
  }
}

export async function suggestParts(q: string): Promise<SuggestItem[]> {
  const qs = new URLSearchParams({ q });
  const res = await fetchConnector<{ suggestions: SuggestItem[] }>(
    `/parts/suggest?${qs}`
  );
  return res.suggestions;
}
