import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const siteUrl = "https://the-finai.github.io/IEEE-bigdata-cup/";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "FinReason Cup",
  alternates: {
    canonical: siteUrl,
  },
  title: "FinReason Cup 2026 | Verifiable Financial AI",
  description:
    "FinReason Cup at IEEE Big Data 2026: agentic financial reasoning, market-neutral hedging, and XBRL audit verification.",
  keywords: [
    "FinReason Cup",
    "IEEE Big Data Cup 2026",
    "financial reasoning",
    "financial AI",
    "FinChain",
    "HERCULEAN",
    "XBRL",
  ],
  openGraph: {
    title: "FinReason Cup 2026",
    description: "Financial AI should show its work.",
    siteName: "FinReason Cup",
    type: "website",
    url: siteUrl,
    locale: "en_US",
    images: [
      {
        url: `${siteUrl}og.jpg`,
        width: 1200,
        height: 630,
        alt: "FinReason Cup 2026 — Financial AI should show its work.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FinReason Cup 2026",
    description: "Financial AI should show its work.",
    images: [
      {
        url: `${siteUrl}og.jpg`,
        alt: "FinReason Cup 2026 — Financial AI should show its work.",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
