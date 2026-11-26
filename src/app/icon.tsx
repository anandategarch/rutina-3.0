// App icon (Next.js file convention) — generated PNG served at /icon.png.
// Artwork = brand "twin-leaf" mark (match public/icon.svg): dua daun + batang
// + titik oranye di atas tile teal #0f766e (palet Focus Teal). FULL-BLEED
// tanpa sudut membulat dan tanpa margin agar aman sebagai maskable icon.
import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";
export const alt = "Rutina — ikon daun kembar";

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f766e",
        }}
      >
        <svg width="512" height="512" viewBox="0 0 64 64" fill="none">
          <path d="M32 47c0-13 6.5-21.5 17-25.5-2.2 13-6.5 21.5-17 25.5z" fill="#f0fdfa" />
          <path d="M32 47c0-13-6.5-21.5-17-25.5 2.2 13 6.5 21.5 17 25.5z" fill="#5eead4" />
          <rect x="30.5" y="29" width="3" height="19" rx="1.5" fill="#f0fdfa" />
          <circle cx="44" cy="17" r="5" fill="#fb923c" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
