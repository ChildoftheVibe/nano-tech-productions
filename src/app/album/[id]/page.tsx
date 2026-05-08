import { notFound } from "next/navigation";
import { getAlbum, getAlbumById, getAllAlbumSlugs } from "@/lib/queries";
import { AlbumDetail } from "@/components/music/AlbumDetail";

type Params = Promise<{ id: string }>;

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllAlbumSlugs();
  return slugs.map((slug) => ({ id: slug }));
}

export default async function AlbumPage({ params }: { params: Params }) {
  const { id } = await params;
  let album = await getAlbum(id);
  if (!album) album = await getAlbumById(id);
  if (!album) notFound();
  return <AlbumDetail album={album} />;
}
