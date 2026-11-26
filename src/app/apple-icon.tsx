// Apple touch icon (Next.js file convention) — generated PNG served at
// /apple-icon.png (180×180). Artwork = brand "twin-leaf" mark yang sama dengan
// public/icon.svg dan src/app/icon.tsx: FULL-BLEED tile teal #0f766e
// (iOS membulatkan sudutnya sendiri) dengan dua daun + batang + titik oranye.
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const alt = "Rutina — ikon daun kembar";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#315b48",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 64 64" fill="none">
          <path d="M32 47c0-13 6.5-21.5 17-25.5-2.2 13-6.5 21.5-17 25.5z" fill="#f4f3ee" />
          <path d="M32 47c0-13-6.5-21.5-17-25.5 2.2 13 6.5 21.5 17 25.5z" fill="#bbd4c1" />
          <rect x="30.5" y="29" width="3" height="19" rx="1.5" fill="#f4f3ee" />
          <circle cx="44" cy="17" r="5" fill="#dfc58f" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
