import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          background: "#07110c",
          color: "#f1f3eb",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            width: 760,
            height: 760,
            right: -80,
            top: -320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,.26), transparent 68%)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "76px 88px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#d9f36a", fontSize: 24, fontWeight: 700 }}>
            <div style={{ display: "flex", width: 44, height: 44, alignItems: "center", justifyContent: "center", border: "2px solid rgba(217,243,106,.45)", borderRadius: 13 }}>
              S
            </div>
            SKILLIN
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 54, fontSize: 70, lineHeight: 1.06, fontWeight: 700, letterSpacing: -3 }}>
            Build better,
            <br />
            <span style={{ color: "#d9f36a" }}>together.</span>
          </div>
          <div style={{ marginTop: 26, maxWidth: 820, color: "#b2beb3", fontSize: 25, lineHeight: 1.4 }}>
            Find your people. Take on a 3-day quest. Ship something worth sharing.
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 42, color: "#8da093", fontSize: 17 }}>
            <span>01 Match</span>
            <span>→</span>
            <span>02 Quest</span>
            <span>→</span>
            <span>03 Build</span>
            <span>→</span>
            <span>04 Showcase</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
