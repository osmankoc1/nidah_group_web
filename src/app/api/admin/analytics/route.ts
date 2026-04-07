import { NextRequest, NextResponse } from "next/server";
import {
  getAnalyticsSummary,
  getChannels,
  getTopPages,
  getCountries,
  getDailyUsers,
  getRealtimeUsers,
} from "@/lib/ga4";

// Realtime endpoint: no cache
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "realtime") {
      const activeUsers = await getRealtimeUsers();
      return NextResponse.json({ activeUsers });
    }

    // Full report — fetch all in parallel
    const [summary, channels, topPages, countries, dailyUsers] =
      await Promise.all([
        getAnalyticsSummary(),
        getChannels(),
        getTopPages(),
        getCountries(),
        getDailyUsers(),
      ]);

    if (!summary) {
      return NextResponse.json(
        { error: "GA4 yapılandırılmamış. Lütfen ortam değişkenlerini kontrol edin." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { summary, channels, topPages, countries, dailyUsers },
      {
        headers: {
          "Cache-Control": "private, max-age=900", // 15 min cache
        },
      }
    );
  } catch (err) {
    console.error("[analytics]", err);
    return NextResponse.json(
      { error: "Analytics verisi alınamadı." },
      { status: 500 }
    );
  }
}
