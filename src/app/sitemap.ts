import type { MetadataRoute } from "next";
import { getAlbums } from "@/lib/queries";

const SITE_URL = "https://www.nanotechvibe.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/library`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const { albums } = await getAlbums({ page: 1, limit: 1000, published: true });
  const albumRoutes: MetadataRoute.Sitemap = albums.map((album) => ({
    url: `${SITE_URL}/album/${album.slug}`,
    lastModified: album.releaseDate ? new Date(album.releaseDate) : now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...albumRoutes];
}
