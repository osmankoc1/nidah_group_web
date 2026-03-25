/**
 * Lightweight GA4 event helpers.
 * Safe to call on server — checks window existence before firing.
 * All functions are no-ops when GA4 is not loaded.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function ga(event: string, params?: Record<string, string | number>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}

// ── Form events ───────────────────────────────────────────────────────────────

export function trackRfqSubmit(type: "parts" | "service", brand?: string) {
  ga("rfq_submit", { form_type: type, ...(brand ? { brand } : {}) });
}

export function trackContactSubmit() {
  ga("contact_submit");
}

// ── WhatsApp events ───────────────────────────────────────────────────────────

export function trackWhatsAppClick(source: string, partNumber?: string) {
  ga("whatsapp_click", {
    source,
    ...(partNumber ? { part_number: partNumber } : {}),
  });
}

// ── Catalog events ────────────────────────────────────────────────────────────

export function trackCatalogQuote(partNumber: string) {
  ga("catalog_quote_click", { part_number: partNumber });
}

export function trackCatalogBrandFilter(brand: string) {
  ga("catalog_brand_filter", { brand });
}

export function trackProductDetailView(partNumber: string) {
  ga("product_detail_view", { part_number: partNumber });
}
