import type { MetadataRoute } from "next";

const siteUrl = "https://the-finai.github.io/IEEE-bigdata-cup/";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date("2026-09-01"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}task1/`,
      lastModified: new Date("2026-09-02"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}task1/submit/`,
      lastModified: new Date("2026-09-02"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}task1/leaderboard/`,
      lastModified: new Date("2026-09-02"),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteUrl}terms/`,
      lastModified: new Date("2026-09-01"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}privacy/`,
      lastModified: new Date("2026-09-01"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
