import { notFound } from "next/navigation";
import { albums } from "@/data/catalog";
import { AlbumDetail } from "@/components/music/AlbumDetail";

type Params = Promise<{ id: string }>;

export default async function AlbumPage({ params }: { params: Params }) {
  const { id } = await params;
  const album = albums.find((a) => a.slug === id || a.id === id);
  if (!album) notFound();
  return <AlbumDetail album={album} />;
}
