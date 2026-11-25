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
          backgroundColor: "#faf6ea",
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
            backgroundColor: "rgba(47, 169, 96, 0.12)",
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
            backgroundColor: "rgba(180, 83, 9, 0.10)",
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
            backgroundColor: "#1f7a43",
            boxShadow: "0 20px 40px rgba(31, 122, 67, 0.25)",
            marginBottom: 36,
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#faf6ea"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 20h10" />
            <path d="M10 20c5.5-2.5.8-6.4 3-10" />
            <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3.4-4 1.9-.5 3.9-.6 5.9.6Z" />
            <path d="M14.5 13.6c-1.1-.8-1.8-2.2-2.3-3.7 2-.4 3.5-.4 4.8.3 1.2.6 2.3 1.9 3.4 4-1.9.5-3.9.6-5.9-.6Z" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, color: "#1f4d2e", letterSpacing: -2 }}>
          Rutina 3.0
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#6f6753", marginTop: 14 }}>
          Rutinitas · Kebugaran · Keuangan · Jurnal
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            padding: "12px 32px",
            borderRadius: 9999,
            backgroundColor: "#2fa960",
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
