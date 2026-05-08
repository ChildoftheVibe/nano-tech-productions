import { getAlbums, getAlbum, getFeaturedAlbums } from "@/lib/queries";
import { HomeClient } from "@/components/home/HomeClient";

const PAGE_SIZE =
  Number(process.env.NEXT_PUBLIC_ALBUMS_PER_PAGE) > 0
    ? Number(process.env.NEXT_PUBLIC_ALBUMS_PER_PAGE)
    : 20;

export const revalidate = 300;

export default async function HomePage() {
  const [featured, latest, initialCollection] = await Promise.all([
    getFeaturedAlbums(),
    getAlbum("nano-tech-purple"),
    getAlbums({ page: 1, limit: PAGE_SIZE, published: true }),
  ]);

  return (
    <HomeClient
      featured={featured}
      latest={latest}
      initialCollection={initialCollection}
    />
  );
}
