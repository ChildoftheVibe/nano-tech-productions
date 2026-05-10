import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllArtistSlugs, getArtist } from "@/lib/queries";
import { ArtistDetailClient } from "@/components/artist/ArtistDetailClient";

type Params = Promise<{ slug: string }>;

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllArtistSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) return { title: "Artist not found" };
  const title = artist.name;
  const description =
    artist.bio?.trim() || `${artist.name} on NTV Vault.`;
  const image = artist.profileImage || "/og-default.png";
  return {
    title,
    description,
    alternates: { canonical: `/artist/${artist.slug}` },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `/artist/${artist.slug}`,
      images: [{ url: image, alt: artist.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ArtistPage({ params }: { params: Params }) {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) notFound();
  return <ArtistDetailClient artist={artist} />;
}
