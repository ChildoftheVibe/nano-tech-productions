import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getAlbum,
  getAlbumById,
  getAllAlbumSlugs,
  getPublishedArtistSlugByName,
} from "@/lib/queries";
import { AlbumDetail } from "@/components/music/AlbumDetail";
import { AlbumDetailSkeleton } from "@/components/ui/skeletons/AlbumDetailSkeleton";
import type { Album } from "@/types/music";

type Params = Promise<{ id: string }>;

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllAlbumSlugs();
  return slugs.map((slug) => ({ id: slug }));
}

async function loadAlbum(id: string): Promise<Album | null> {
  const bySlug = await getAlbum(id);
  if (bySlug) return bySlug;
  return getAlbumById(id);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const album = await loadAlbum(id);
  if (!album) {
    return { title: "Album not found" };
  }
  const title = `${album.title} by Jhodge`;
  const description =
    album.description?.trim() || `${album.title} — a Nano Tech Vibe release.`;
  const image = album.coverImage || "/og-default.png";
  const canonicalPath = `/album/${album.slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "music.album",
      title,
      description,
      url: canonicalPath,
      images: [{ url: image, width: 1200, height: 1200, alt: album.title }],
      ...(album.releaseDate
        ? { releaseDate: album.releaseDate }
        : {}),
      musicians: ["Jhodge"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

function AlbumJsonLd({ album }: { album: Album }) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: album.title,
    byArtist: {
      "@type": "MusicGroup",
      name: "Jhodge",
    },
    ...(album.releaseDate ? { datePublished: album.releaseDate } : {}),
    ...(album.coverImage ? { image: album.coverImage } : {}),
    ...(album.description ? { description: album.description } : {}),
    url: `https://www.nanotechvibe.com/album/${album.slug}`,
    numTracks: album.tracks.length,
  };
  return (
    <script
      type="application/ld+json"
      // Schema.org JSON-LD must be rendered as raw JSON in a script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

async function AlbumData({ id }: { id: string }) {
  const [album, artistSlugsByName] = await Promise.all([
    loadAlbum(id),
    getPublishedArtistSlugByName(),
  ]);
  if (!album) notFound();
  return (
    <>
      <AlbumJsonLd album={album} />
      <AlbumDetail album={album} artistSlugsByName={artistSlugsByName} />
    </>
  );
}

export default async function AlbumPage({ params }: { params: Params }) {
  const { id } = await params;
  return (
    <Suspense fallback={<AlbumDetailSkeleton />}>
      <AlbumData id={id} />
    </Suspense>
  );
}
