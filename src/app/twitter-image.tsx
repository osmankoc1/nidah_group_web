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
          background:
            "linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px",
        }}
      >
        {/* Logo bar + title */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "8px",
              height: "84px",
              background: "#F59E0B",
              borderRadius: "4px",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                color: "#F59E0B",
                fontSize: "68px",
                fontWeight: "800",
                lineHeight: "1",
                letterSpacing: "-1px",
              }}
            >
              NİDAH GROUP
            </span>
            <span
              style={{
                color: "#CBD5E1",
                fontSize: "26px",
                marginTop: "14px",
                fontWeight: "400",
                letterSpacing: "0.5px",
              }}
            >
              İş Makinası Servisi &amp; Yedek Parça
            </span>
          </div>
        </div>

        {/* Brand row */}
        <div
          style={{
            marginTop: "52px",
            display: "flex",
            gap: "36px",
            alignItems: "center",
          }}
        >
          {["VOLVO", "KOMATSU", "CAT", "HİDROMEK", "BOMAG"].map((brand) => (
            <span
              key={brand}
              style={{
                color: "#64748B",
                fontSize: "17px",
                letterSpacing: "3px",
                fontWeight: "600",
              }}
            >
              {brand}
            </span>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            marginTop: "28px",
            color: "#475569",
            fontSize: "17px",
            letterSpacing: "1px",
          }}
        >
          www.nidahgroup.com.tr
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
