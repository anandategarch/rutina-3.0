// OpenGraph image (standar ui-ux-pro-max: nextjs #26 — Include OpenGraph images).
// Dirender dinamis oleh next/og saat dibutuhkan — tanpa aset biner di repo.
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Rutina 3.0 — Rutinitas & Perkembangan Hidup";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f0fdfa",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -60,
            width: 360,
            height: 360,
            borderRadius: 9999,
            backgroundColor: "rgba(13, 148, 136, 0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -40,
            width: 300,
            height: 300,
            borderRadius: 9999,
            backgroundColor: "rgba(234, 88, 12, 0.10)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 36,
            backgroundColor: "#0f766e",
            boxShadow: "0 20px 40px rgba(15, 118, 110, 0.25)",
            marginBottom: 36,
          }}
        >
          <svg width="72" height="72" viewBox="0 0 64 64" fill="none">
            {/* Twin-leaf brand mark (match public/icon.svg): daun + batang + titik amber */}
            <path d="M32 47c0-13 6.5-21.5 17-25.5-2.2 13-6.5 21.5-17 25.5z" fill="#f0fdfa" />
            <path d="M32 47c0-13-6.5-21.5-17-25.5 2.2 13 6.5 21.5 17 25.5z" fill="#5eead4" />
            <rect x="30.5" y="29" width="3" height="19" rx="1.5" fill="#f0fdfa" />
            <circle cx="44" cy="17" r="5" fill="#fb923c" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, color: "#115e59", letterSpacing: -2 }}>
          Rutina 3.0
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#64748b", marginTop: 14 }}>
          Rutinitas · Kebugaran · Keuangan · Jurnal
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            padding: "12px 32px",
            borderRadius: 9999,
            backgroundColor: "#0f766e",
            color: "#ffffff",
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          Satu tanaman untuk seluruh kebiasaan hidupmu
        </div>
      </div>
    ),
    { ...size }
  );
}
