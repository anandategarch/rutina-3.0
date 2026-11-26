import type { Metadata, Viewport } from "next";
import { Nunito, DM_Sans, Caveat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Skill pairing #71 "Claymorphism Mobile": Nunito ExtraBold/Black for ALL
// headings (rounded terminals, playful) + DM Sans for body (clean, geometric).
// Font variabel (satu file per keluarga, bobot via CSS) — bundel font lebih kecil
// dan memenuhi standar ui-ux-pro-max: nextjs #24 (use variable fonts).
const nunito = Nunito({
  variable: "--font-display",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rutina 3.0 — Rutinitas & Perkembangan Hidup",
  description:
    "Aplikasi personal untuk mengelola rutinitas dan perkembangan hidup sehari-hari: kebiasaan, kebugaran, keuangan, jurnal, dan statistik dalam satu tempat.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    // black-translucent: konten menggambar hingga bawah status bar — aman karena
    // header sudah memakai pt safe-area (ux-guidelines #6 PWA notch).
    statusBarStyle: "black-translucent",
    title: "Rutina",
  },
  // Favicon & apple-touch-icon diinjeksi otomatis oleh konvensi file Next
  // (src/app/icon.tsx + src/app/apple-icon.tsx) — tanpa entri `icons` manual.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#171D19" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${dmSans.variable} ${caveat.variable} antialiased bg-background text-foreground`}
      >
        {children}
        {/* Offset toast memperhitungkan notch/safe-area agar tidak tertutup status bar.
            duration 8000: toast error/gagal mutasi tidak boleh menghilang dalam 4s
            sebelum user sempat membacanya (ux-guidelines #138 persistent errors). */}
        <Toaster
          position="top-center"
          duration={8000}
          offset={{ top: "calc(16px + env(safe-area-inset-top, 0px))" }}
        />
      </body>
    </html>
  );
}
