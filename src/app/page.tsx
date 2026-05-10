import { Suspense } from "react";
import {
  getAlbums,
  getAlbum,
  getFeaturedAlbums,
  getFeaturedArtists,
} from "@/lib/queries";
import { HomeClient } from "@/components/home/HomeClient";
import { HomeSkeleton } from "@/components/ui/skeletons/HomeSkeleton";

const PAGE_SIZE =
  Number(process.env.NEXT_PUBLIC_ALBUMS_PER_PAGE) > 0
    ? Number(process.env.NEXT_PUBLIC_ALBUMS_PER_PAGE)
    : 20;

export const revalidate = 300;

async function HomeData() {
  const [featured, latest, initialCollection, featuredArtists] =
    await Promise.all([
      getFeaturedAlbums(),
      getAlbum("nano-tech-purple"),
      getAlbums({ page: 1, limit: PAGE_SIZE, published: true }),
      getFeaturedArtists(),
    ]);

  return (
    <HomeClient
      featured={featured}
      latest={latest}
      initialCollection={initialCollection}
      featuredArtists={featuredArtists}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeData />
    </Suspense>
  );
}
