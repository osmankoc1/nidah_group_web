import { NextRequest, NextResponse } from "next/server";
import {
  getAnalyticsSummary, getChannels, getTopPages, getCountries,
  getDailyUsers, getDevices, getBrowsers, getHourlyToday,
  getLandingPages, getRealtimeUsers, getRealtimePages,
} from "@/lib/ga4";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "realtime") {
      const [activeUsers, pages] = await Promise.all([
        getRealtimeUsers(),
        getRealtimePages(),
      ]);
      return NextResponse.json({ activeUsers, pages });
    }

    const [summary, channels, topPages, countries, dailyUsers, devices, browsers, hourlyToday, landingPages] =
      await Promise.all([
        getAnalyticsSummary(),
        getChannels(),
        getTopPages(),
        getCountries(),
        getDailyUsers(),
        getDevices(),
        getBrowsers(),
        getHourlyToday(),
        getLandingPages(),
      ]);

    if (!summary) {
      return NextResponse.json(
        { error: "GA4 yapılandırılmamış. Ortam değişkenlerini kontrol edin." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { summary, channels, topPages, countries, dailyUsers, devices, browsers, hourlyToday, landingPages },
      { headers: { "Cache-Control": "private, max-age=900" } }
    );
  } catch (err) {
    console.error("[analytics]", err);
    return NextResponse.json({ error: "Analytics verisi alınamadı." }, { status: 500 });
  }
}
