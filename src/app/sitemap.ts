import type { MetadataRoute } from "next";
import { getAlbums, getAllArtistSlugs, getArtists } from "@/lib/queries";

const SITE_URL = "https://www.nanotechvibe.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [{ albums }, { artists }, artistSlugs] = await Promise.all([
    getAlbums({ page: 1, limit: 1000, published: true }),
    getArtists({ published: true, limit: 1000 }),
    getAllArtistSlugs(),
  ]);

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

  // Only include /artists in the sitemap when at least one published artist
  // exists — otherwise the listing page renders an EmptyState and there's no
  // SEO value (or actual content for crawlers).
  if (artists.length > 0) {
    staticRoutes.push({
      url: `${SITE_URL}/artists`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  const albumRoutes: MetadataRoute.Sitemap = albums.map((album) => ({
    url: `${SITE_URL}/album/${album.slug}`,
    lastModified: album.releaseDate ? new Date(album.releaseDate) : now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const artistRoutes: MetadataRoute.Sitemap = artistSlugs.map((slug) => ({
    url: `${SITE_URL}/artist/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...albumRoutes, ...artistRoutes];
}
