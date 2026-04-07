import { BetaAnalyticsDataClient } from "@google-analytics/data";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? "";

function getClient(): BetaAnalyticsDataClient | null {
  const privateKey  = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  if (!privateKey || !clientEmail || !PROPERTY_ID) return null;
  return new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
}

function num(val?: string | null): number {
  return parseInt(val ?? "0", 10) || 0;
}
function flt(val?: string | null): number {
  return parseFloat(val ?? "0") || 0;
}
function pct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Summary (7d + 30d with comparison) ────────────────────────────────────────
export async function getAnalyticsSummary() {
  const client = getClient();
  if (!client) return null;

  const [[r7], [r30]] = await Promise.all([
    client.runReport({
      property:   `properties/${PROPERTY_ID}`,
      dateRanges: [
        { startDate: "7daysAgo",  endDate: "today",    name: "current"  },
        { startDate: "14daysAgo", endDate: "8daysAgo", name: "previous" },
      ],
      metrics: [
        { name: "activeUsers"      },
        { name: "sessions"         },
        { name: "screenPageViews"  },
        { name: "newUsers"         },
        { name: "engagementRate"   },
        { name: "averageSessionDuration" },
      ],
    }),
    client.runReport({
      property:   `properties/${PROPERTY_ID}`,
      dateRanges: [
        { startDate: "30daysAgo", endDate: "today",     name: "current"  },
        { startDate: "60daysAgo", endDate: "31daysAgo", name: "previous" },
      ],
      metrics: [
        { name: "activeUsers"      },
        { name: "sessions"         },
        { name: "screenPageViews"  },
        { name: "newUsers"         },
        { name: "engagementRate"   },
        { name: "averageSessionDuration" },
      ],
    }),
  ]);

  const extract = (report: typeof r7) => {
    const rows = report?.rows ?? [];
    const cur  = rows.find(r => r.dimensionValues?.[0]?.value === "current")  ?? rows[0];
    const prev = rows.find(r => r.dimensionValues?.[0]?.value === "previous") ?? rows[1];
    return {
      cur:  {
        users:       num(cur?.metricValues?.[0]?.value),
        sessions:    num(cur?.metricValues?.[1]?.value),
        pageviews:   num(cur?.metricValues?.[2]?.value),
        newUsers:    num(cur?.metricValues?.[3]?.value),
        engRate:     flt(cur?.metricValues?.[4]?.value),
        avgDuration: flt(cur?.metricValues?.[5]?.value),
      },
      prev: {
        users:       num(prev?.metricValues?.[0]?.value),
        sessions:    num(prev?.metricValues?.[1]?.value),
        pageviews:   num(prev?.metricValues?.[2]?.value),
        newUsers:    num(prev?.metricValues?.[3]?.value),
        engRate:     flt(prev?.metricValues?.[4]?.value),
        avgDuration: flt(prev?.metricValues?.[5]?.value),
      },
    };
  };

  const s7  = extract(r7);
  const s30 = extract(r30);

  return {
    users7d:       { current: s7.cur.users,       previous: s7.prev.users,       pct: pct(s7.cur.users,       s7.prev.users)       },
    sessions7d:    { current: s7.cur.sessions,     previous: s7.prev.sessions,    pct: pct(s7.cur.sessions,    s7.prev.sessions)     },
    newUsers7d:    { current: s7.cur.newUsers,     previous: s7.prev.newUsers,    pct: pct(s7.cur.newUsers,    s7.prev.newUsers)     },
    engRate7d:     { current: s7.cur.engRate,      previous: s7.prev.engRate,     pct: pct(Math.round(s7.cur.engRate * 100), Math.round(s7.prev.engRate * 100)) },
    avgDuration7d: { current: s7.cur.avgDuration,  previous: s7.prev.avgDuration, pct: pct(Math.round(s7.cur.avgDuration), Math.round(s7.prev.avgDuration)) },
    users30d:      { current: s30.cur.users,       previous: s30.prev.users,      pct: pct(s30.cur.users,      s30.prev.users)      },
    sessions30d:   { current: s30.cur.sessions,    previous: s30.prev.sessions,   pct: pct(s30.cur.sessions,   s30.prev.sessions)   },
    pageviews30d:  { current: s30.cur.pageviews,   previous: s30.prev.pageviews,  pct: pct(s30.cur.pageviews,  s30.prev.pageviews)  },
    newUsers30d:   { current: s30.cur.newUsers,    previous: s30.prev.newUsers,   pct: pct(s30.cur.newUsers,   s30.prev.newUsers)   },
    engRate30d:    { current: s30.cur.engRate,     previous: s30.prev.engRate,    pct: pct(Math.round(s30.cur.engRate * 100), Math.round(s30.prev.engRate * 100)) },
    avgDuration30d:{ current: s30.cur.avgDuration, previous: s30.prev.avgDuration,pct: pct(Math.round(s30.cur.avgDuration), Math.round(s30.prev.avgDuration)) },
  };
}

// ── Traffic channels ───────────────────────────────────────────────────────────
export async function getChannels() {
  const client = getClient();
  if (!client) return [];
  const [res] = await client.runReport({
    property:   `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics:    [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
    orderBys:   [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit:      8,
  });
  return (res?.rows ?? []).map(r => ({
    channel:   r.dimensionValues?.[0]?.value ?? "Other",
    users:     num(r.metricValues?.[0]?.value),
    sessions:  num(r.metricValues?.[1]?.value),
    pageviews: num(r.metricValues?.[2]?.value),
  }));
}

// ── Top pages ──────────────────────────────────────────────────────────────────
export async function getTopPages() {
  const client = getClient();
  if (!client) return [];
  const [res] = await client.runReport({
    property:   `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "pagePath" }],
    metrics:    [{ name: "screenPageViews" }, { name: "activeUsers" }, { name: "averageSessionDuration" }, { name: "engagementRate" }],
    orderBys:   [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit:      10,
  });
  return (res?.rows ?? []).map(r => ({
    page:        r.dimensionValues?.[0]?.value ?? "/",
    pageviews:   num(r.metricValues?.[0]?.value),
    users:       num(r.metricValues?.[1]?.value),
    avgDuration: flt(r.metricValues?.[2]?.value),
    engRate:     flt(r.metricValues?.[3]?.value),
  }));
}

// ── Countries ──────────────────────────────────────────────────────────────────
export async function getCountries() {
  const client = getClient();
  if (!client) return [];
  const [res] = await client.runReport({
    property:   `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "country" }],
    metrics:    [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
    orderBys:   [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit:      15,
  });
  return (res?.rows ?? []).map(r => ({
    country:   r.dimensionValues?.[0]?.value ?? "Unknown",
    users:     num(r.metricValues?.[0]?.value),
    sessions:  num(r.metricValues?.[1]?.value),
    pageviews: num(r.metricValues?.[2]?.value),
  }));
}

// ── Daily users (last 30 days) ─────────────────────────────────────────────────
export async function getDailyUsers() {
  const client = getClient();
  if (!client) return [];
  const [res] = await client.runReport({
    property:   `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics:    [{ name: "activeUsers" }, { name: "newUsers" }, { name: "sessions" }],
    orderBys:   [{ dimension: { dimensionName: "date" }, desc: false }],
  });
  return (res?.rows ?? []).map(r => ({
    date:     r.dimensionValues?.[0]?.value ?? "",
    users:    num(r.metricValues?.[0]?.value),
    newUsers: num(r.metricValues?.[1]?.value),
    sessions: num(r.metricValues?.[2]?.value),
  }));
}

// ── Device breakdown ───────────────────────────────────────────────────────────
export async function getDevices() {
  const client = getClient();
  if (!client) return [];
  const [res] = await client.runReport({
    property:   `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "deviceCategory" }],
    metrics:    [{ name: "activeUsers" }, { name: "sessions" }],
    orderBys:   [{ metric: { metricName: "activeUsers" }, desc: true }],
  });
  return (res?.rows ?? []).map(r => ({
    device:   r.dimensionValues?.[0]?.value ?? "other",
    users:    num(r.metricValues?.[0]?.value),
    sessions: num(r.metricValues?.[1]?.value),
  }));
}

// ── Browser breakdown ──────────────────────────────────────────────────────────
export async function getBrowsers() {
  const client = getClient();
  if (!client) return [];
  const [res] = await client.runReport({
    property:   `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "browser" }],
    metrics:    [{ name: "activeUsers" }, { name: "sessions" }],
    orderBys:   [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit:      6,
  });
  return (res?.rows ?? []).map(r => ({
    browser:  r.dimensionValues?.[0]?.value ?? "Other",
    users:    num(r.metricValues?.[0]?.value),
    sessions: num(r.metricValues?.[1]?.value),
  }));
}

// ── Hourly traffic (today) ─────────────────────────────────────────────────────
export async function getHourlyToday() {
  const client = getClient();
  if (!client) return [];
  const [res] = await client.runReport({
    property:   `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "today", endDate: "today" }],
    dimensions: [{ name: "hour" }],
    metrics:    [{ name: "activeUsers" }, { name: "sessions" }],
    orderBys:   [{ dimension: { dimensionName: "hour" }, desc: false }],
  });
  return (res?.rows ?? []).map(r => ({
    hour:     num(r.dimensionValues?.[0]?.value),
    users:    num(r.metricValues?.[0]?.value),
    sessions: num(r.metricValues?.[1]?.value),
  }));
}

// ── Top landing pages ──────────────────────────────────────────────────────────
export async function getLandingPages() {
  const client = getClient();
  if (!client) return [];
  const [res] = await client.runReport({
    property:   `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "landingPage" }],
    metrics:    [{ name: "sessions" }, { name: "activeUsers" }, { name: "bounceRate" }],
    orderBys:   [{ metric: { metricName: "sessions" }, desc: true }],
    limit:      10,
  });
  return (res?.rows ?? []).map(r => ({
    page:       r.dimensionValues?.[0]?.value ?? "/",
    sessions:   num(r.metricValues?.[0]?.value),
    users:      num(r.metricValues?.[1]?.value),
    bounceRate: flt(r.metricValues?.[2]?.value),
  }));
}

// ── Realtime active users ──────────────────────────────────────────────────────
export async function getRealtimeUsers(): Promise<number> {
  const client = getClient();
  if (!client) return 0;
  const [res] = await client.runRealtimeReport({
    property: `properties/${PROPERTY_ID}`,
    metrics:  [{ name: "activeUsers" }],
  });
  return num(res?.rows?.[0]?.metricValues?.[0]?.value);
}

// ── Realtime top pages (last 30 min) ──────────────────────────────────────────
export async function getRealtimePages() {
  const client = getClient();
  if (!client) return [];
  const [res] = await client.runRealtimeReport({
    property:   `properties/${PROPERTY_ID}`,
    dimensions: [{ name: "unifiedPagePathScreen" }],
    metrics:    [{ name: "activeUsers" }],
    orderBys:   [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit:      5,
  });
  return (res?.rows ?? []).map(r => ({
    page:  r.dimensionValues?.[0]?.value ?? "/",
    users: num(r.metricValues?.[0]?.value),
  }));
}
