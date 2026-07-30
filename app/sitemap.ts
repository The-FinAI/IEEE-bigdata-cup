import type { MetadataRoute } from "next";

const siteUrl = "https://the-finai.github.io/IEEE-bigdata-cup/";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date("2026-07-30"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
