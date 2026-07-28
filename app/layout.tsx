import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const siteUrl = "https://the-finai.github.io/IEEE-bigdata-cup/";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    type: "website",
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}og.png`,
        width: 1731,
        height: 909,
        alt: "FinReason Cup 2026 — Financial AI should show its work.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FinReason Cup 2026",
    description: "Financial AI should show its work.",
    images: [`${siteUrl}og.png`],
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
