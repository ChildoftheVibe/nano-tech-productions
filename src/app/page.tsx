import { Suspense } from "react";
import {
  getAlbums,
  getLatestAlbum,
  getFeaturedAlbums,
  getFeaturedArtists,
  getTracks,
  getActiveHeroMedia,
} from "@/lib/queries";
import { HomeClient } from "@/components/home/HomeClient";
import { HomeSkeleton } from "@/components/ui/skeletons/HomeSkeleton";
import { getAlbumCover } from "@/lib/albumCover";
import { chamberAsset, toPortalAlbums, vortexAsset } from "@/lib/portalData";
import { PortalRoomClient } from "@/components/portal/PortalRoomClient";

const PAGE_SIZE =
  Number(process.env.NEXT_PUBLIC_ALBUMS_PER_PAGE) > 0
    ? Number(process.env.NEXT_PUBLIC_ALBUMS_PER_PAGE)
    : 20;

export const revalidate = 300;

/** Classic storefront home — kept as the fail-closed fallback when no
 *  published album qualifies for a portal. */
async function ClassicHome() {
  const [featured, latest, initialCollection, featuredArtists, tracksResult, heroMedia] =
    await Promise.all([
      getFeaturedAlbums(),
      getLatestAlbum(),
      getAlbums({ page: 1, limit: PAGE_SIZE, published: true }),
      getFeaturedArtists(),
      getTracks({ published: true, limit: 6 }),
      getActiveHeroMedia(),
    ]);

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
        weeklyTracks={tracksResult.tracks}
        heroMedia={heroMedia}
      />
    </>
  );
}

async function HomeData() {
  const { albums } = await getAlbums({ page: 1, limit: 12, published: true });
  const portals = toPortalAlbums(albums);
  if (portals.length === 0) return <ClassicHome />;

  return (
    <>
      {/* Race the chamber plate + first portal's assets against the JS bundle. */}
      <link rel="preload" as="image" href={chamberAsset(portals[0].vortex)} />
      <link rel="preload" as="image" href={vortexAsset(portals[0].vortex)} />
      <link rel="preload" as="image" href={portals[0].coverUrl} />
      <PortalRoomClient albums={portals} />
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
