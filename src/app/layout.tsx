import type { Metadata, Viewport } from "next";
import { Nunito, DM_Sans, Caveat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Skill pairing #71 "Claymorphism Mobile": Nunito ExtraBold/Black for ALL
// headings (rounded terminals, playful) + DM Sans for body (clean, geometric).
const nunito = Nunito({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rutina 3.0 — Rutinitas & Perkembangan Hidup",
  description:
    "Aplikasi personal untuk mengelola rutinitas dan perkembangan hidup sehari-hari: kebiasaan, kebugaran, keuangan, jurnal, dan statistik dalam satu tempat.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rutina",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF6EA" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0b0a" },
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
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
