import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NİDAH GROUP | İş Makinası Servisi & Yedek Parça";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0F1629 0%, #1A1A2E 40%, #16213E 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Accent corner glow */}
        <div style={{
          position: "absolute", top: "-120px", right: "-120px",
          width: "500px", height: "500px",
          background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: "-80px", left: "-80px",
          width: "400px", height: "400px",
          background: "radial-gradient(circle, rgba(15,52,96,0.6) 0%, transparent 70%)",
          display: "flex",
        }} />

        {/* Yellow left accent bar */}
        <div style={{
          position: "absolute", left: "0", top: "0", bottom: "0",
          width: "6px",
          background: "linear-gradient(180deg, #F59E0B 0%, #D97706 100%)",
          display: "flex",
        }} />

        {/* Main content */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px 56px 80px",
          width: "100%",
        }}>

          {/* Top: badge */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <div style={{
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "100px",
              padding: "8px 20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: "#F59E0B", display: "flex",
              }} />
              <span style={{ color: "#F59E0B", fontSize: "18px", fontWeight: "600", letterSpacing: "1px" }}>
                Türkiye Merkezli · Global Operasyon
              </span>
            </div>
          </div>

          {/* Middle: logo + tagline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0px" }}>
              <span style={{
                color: "#FFFFFF",
                fontSize: "82px",
                fontWeight: "900",
                lineHeight: "1",
                letterSpacing: "-2px",
              }}>
                NİDAH
              </span>
              <span style={{
                color: "#F59E0B",
                fontSize: "82px",
                fontWeight: "900",
                lineHeight: "1",
                letterSpacing: "-2px",
                marginLeft: "18px",
              }}>
                GROUP
              </span>
            </div>
            <span style={{
              color: "#94A3B8",
              fontSize: "28px",
              fontWeight: "400",
              letterSpacing: "0.3px",
              lineHeight: "1.4",
            }}>
              Yedek Parça Tedariği · Teknik Revizyon · ECU Onarımı
            </span>
          </div>

          {/* Bottom row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            {/* Stats */}
            <div style={{ display: "flex", gap: "40px", alignItems: "center" }}>
              {[
                { value: "20+", label: "Yıl Deneyim" },
                { value: "13+", label: "Ülkeye İhracat" },
                { value: "OEM", label: "Kalite" },
              ].map((stat) => (
                <div key={stat.label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ color: "#F59E0B", fontSize: "32px", fontWeight: "800", lineHeight: "1" }}>
                    {stat.value}
                  </span>
                  <span style={{ color: "#64748B", fontSize: "15px", fontWeight: "500" }}>
                    {stat.label}
                  </span>
                </div>
              ))}

              <div style={{
                width: "1px", height: "48px",
                background: "rgba(255,255,255,0.08)",
                display: "flex", marginLeft: "8px",
              }} />

              {/* Brands */}
              <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                {["VOLVO", "KOMATSU", "CAT", "HAMM"].map((brand) => (
                  <span key={brand} style={{
                    color: "#334155",
                    fontSize: "14px",
                    letterSpacing: "2.5px",
                    fontWeight: "700",
                  }}>
                    {brand}
                  </span>
                ))}
              </div>
            </div>

            {/* Domain */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "4px",
            }}>
              <span style={{
                color: "#475569",
                fontSize: "16px",
                letterSpacing: "0.5px",
              }}>
                www.nidahgroup.com.tr
              </span>
            </div>
          </div>

        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
