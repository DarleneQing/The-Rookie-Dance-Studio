import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://therookiestudio.ch";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "courses", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "faq", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "terms", priority: 0.4, changeFrequency: "yearly" as const },
    { path: "privacy", priority: 0.4, changeFrequency: "yearly" as const },
    { path: "login", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "register", priority: 0.6, changeFrequency: "monthly" as const },
  ];

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: path ? `${baseUrl}/${path}` : baseUrl,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
