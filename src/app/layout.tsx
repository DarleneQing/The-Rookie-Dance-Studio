import type { Metadata } from "next";
import { Syne, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import dynamic from "next/dynamic";

const Analytics = dynamic(() => import("@vercel/analytics/next").then((mod) => mod.Analytics), {
  ssr: false,
});
const SpeedInsights = dynamic(() => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights), {
  ssr: false,
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-syne",
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://therookiestudio.ch";

export const metadata: Metadata = {
  title: "The Rookie Dance Studio | Zurich non-profit dance community",
  description: "Zurich non-profit dance community, offering K-pop and other dance classes, open and vibrant.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "The Rookie Dance Studio | Zurich non-profit dance community",
    description: "Zurich non-profit dance community, offering K-pop and other dance classes, open and vibrant.",
    url: siteUrl,
    siteName: "The Rookie Dance Studio",
    type: "website",
    images: [
      {
        url: "/assets/long banner-2.png",
        width: 1200,
        height: 400,
        alt: "The Rookie Dance Studio",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${outfit.variable} antialiased flex flex-col min-h-screen`}
      >
        {children}
        <Toaster position="top-center" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
