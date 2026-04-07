import { BetaAnalyticsDataClient } from "@google-analytics/data";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? "";

function getClient(): BetaAnalyticsDataClient | null {
  const privateKey   = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail  = process.env.GA4_CLIENT_EMAIL;
  if (!privateKey || !clientEmail || !PROPERTY_ID) return null;
  return new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
}

function num(val?: string | null): number {
  return parseInt(val ?? "0", 10) || 0;
}

function pct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Summary: users + sessions + pageviews for 7d and 30d with comparison ──────
export async function getAnalyticsSummary() {
  const client = getClient();
  if (!client) return null;

  const [res7, res30] = await Promise.all([
    client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [
        { startDate: "7daysAgo",  endDate: "today",      name: "current"  },
        { startDate: "14daysAgo", endDate: "8daysAgo",   name: "previous" },
      ],
      metrics: [
        { name: "activeUsers"     },
        { name: "sessions"        },
        { name: "screenPageViews" },
      ],
    }),
    client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [
        { startDate: "30daysAgo", endDate: "today",      name: "current"  },
        { startDate: "60daysAgo", endDate: "31daysAgo",  name: "previous" },
      ],
      metrics: [
        { name: "activeUsers"     },
        { name: "sessions"        },
        { name: "screenPageViews" },
      ],
    }),
  ]);

  const parse = (report: Awaited<ReturnType<typeof client.runReport>>[0]) => {
    const rows = report.rows ?? [];
    const cur  = rows.find(r => r.dimensionValues?.[0]?.value === "current")  ?? rows[0];
    const prev = rows.find(r => r.dimensionValues?.[0]?.value === "previous") ?? rows[1];
    return {
      current:  { users: num(cur?.metricValues?.[0]?.value),  sessions: num(cur?.metricValues?.[1]?.value),  pageviews: num(cur?.metricValues?.[2]?.value)  },
      previous: { users: num(prev?.metricValues?.[0]?.value), sessions: num(prev?.metricValues?.[1]?.value), pageviews: num(prev?.metricValues?.[2]?.value) },
    };
  };

  const s7  = parse(res7[0]);
  const s30 = parse(res30[0]);

  return {
    users7d:     { current: s7.current.users,      previous: s7.previous.users,      pct: pct(s7.current.users,      s7.previous.users)      },
    sessions7d:  { current: s7.current.sessions,   previous: s7.previous.sessions,   pct: pct(s7.current.sessions,   s7.previous.sessions)   },
    users30d:    { current: s30.current.users,      previous: s30.previous.users,     pct: pct(s30.current.users,     s30.previous.users)     },
    pageviews30d:{ current: s30.current.pageviews,  previous: s30.previous.pageviews, pct: pct(s30.current.pageviews, s30.previous.pageviews) },
  };
}

// ── Traffic channels (last 30 days) ───────────────────────────────────────────
export async function getChannels() {
  const client = getClient();
  if (!client) return [];

  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics:    [{ name: "activeUsers" }, { name: "sessions" }],
    orderBys:   [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit:      8,
  });

  return (res.rows ?? []).map(r => ({
    channel:  r.dimensionValues?.[0]?.value ?? "Other",
    users:    num(r.metricValues?.[0]?.value),
    sessions: num(r.metricValues?.[1]?.value),
  }));
}

// ── Top pages (last 30 days) ──────────────────────────────────────────────────
export async function getTopPages() {
  const client = getClient();
  if (!client) return [];

  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "pagePath" }],
    metrics:    [{ name: "screenPageViews" }, { name: "activeUsers" }],
    orderBys:   [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit:      10,
  });

  return (res.rows ?? []).map(r => ({
    page:      r.dimensionValues?.[0]?.value ?? "/",
    pageviews: num(r.metricValues?.[0]?.value),
    users:     num(r.metricValues?.[1]?.value),
  }));
}

// ── Countries (last 30 days) ──────────────────────────────────────────────────
export async function getCountries() {
  const client = getClient();
  if (!client) return [];

  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "country" }],
    metrics:    [{ name: "activeUsers" }],
    orderBys:   [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit:      10,
  });

  return (res.rows ?? []).map(r => ({
    country: r.dimensionValues?.[0]?.value ?? "Unknown",
    users:   num(r.metricValues?.[0]?.value),
  }));
}

// ── Daily users (last 30 days) ────────────────────────────────────────────────
export async function getDailyUsers() {
  const client = getClient();
  if (!client) return [];

  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics:    [{ name: "activeUsers" }],
    orderBys:   [{ dimension: { dimensionName: "date" }, desc: false }],
  });

  return (res.rows ?? []).map(r => ({
    date:  r.dimensionValues?.[0]?.value ?? "",
    users: num(r.metricValues?.[0]?.value),
  }));
}

// ── Realtime active users ─────────────────────────────────────────────────────
export async function getRealtimeUsers(): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  const [res] = await client.runRealtimeReport({
    property: `properties/${PROPERTY_ID}`,
    metrics:  [{ name: "activeUsers" }],
  });

  return num(res.rows?.[0]?.metricValues?.[0]?.value);
}
