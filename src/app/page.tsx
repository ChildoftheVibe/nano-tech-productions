import { Suspense } from "react";
import {
  getAlbums,
  getAlbum,
  getFeaturedAlbums,
  getFeaturedArtists,
  getPlaylistTracks,
} from "@/lib/queries";
import { HomeClient } from "@/components/home/HomeClient";
import { HomeSkeleton } from "@/components/ui/skeletons/HomeSkeleton";
import { getAlbumCover } from "@/lib/albumCover";

const PAGE_SIZE =
  Number(process.env.NEXT_PUBLIC_ALBUMS_PER_PAGE) > 0
    ? Number(process.env.NEXT_PUBLIC_ALBUMS_PER_PAGE)
    : 20;

export const revalidate = 300;

async function HomeData() {
  const [featured, latest, initialCollection, featuredArtists, playlistTracks] =
    await Promise.all([
      getFeaturedAlbums(),
      getAlbum("nano-tech-purple"),
      getAlbums({ page: 1, limit: PAGE_SIZE, published: true }),
      getFeaturedArtists(),
      getPlaylistTracks(),
    ]);

  // Preload the first six above-the-fold cover URLs so the browser can race
  // them against the JS bundle. React hoists these <link> tags into <head>.
  const preloadCovers = featured
    .slice(0, 6)
    .map((a) => getAlbumCover(a.coverImage, "md"))
    .filter((u) => Boolean(u));

  return (
    <>
      {preloadCovers.map((href) => (
        <link key={href} rel="preload" as="image" href={href} />
      ))}
      <HomeClient
        featured={featured}
        latest={latest}
        initialCollection={initialCollection}
        featuredArtists={featuredArtists}
        weeklyTracks={playlistTracks.slice(0, 6)}
      />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeData />
    </Suspense>
  );
}
