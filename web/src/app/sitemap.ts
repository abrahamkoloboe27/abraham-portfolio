import type { MetadataRoute } from "next";

import { api } from "@/lib/api";
import { locales } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

const STATIC_PATHS = ["", "/about", "/projects", "/blog", "/talks", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  const add = (path: string, lastModified?: string, priority = 0.7) => {
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: lastModified ? new Date(lastModified) : new Date(),
        changeFrequency: "weekly",
        priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map((code) => [code, absoluteUrl(`/${code}${path}`)]),
          ),
        },
      });
    }
  };

  for (const path of STATIC_PATHS) {
    add(path, undefined, path === "" ? 1 : 0.8);
  }

  // A cold or unreachable API must still produce a valid sitemap.
  try {
    const [projects, posts, talks] = await Promise.all([
      api.projects({ per_page: 50 }),
      api.posts({ per_page: 50 }),
      api.talks({ per_page: 50 }),
    ]);
    projects.items.forEach((item) => add(`/projects/${item.slug}`, item.updated_at, 0.9));
    posts.items.forEach((item) => add(`/blog/${item.slug}`, item.updated_at, 0.8));
    talks.items.forEach((item) => add(`/talks/${item.slug}`, item.updated_at, 0.6));
  } catch {
    /* static entries are enough */
  }

  return entries;
}
