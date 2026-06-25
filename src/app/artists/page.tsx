import { Suspense } from "react";
import { Users } from "lucide-react";
import { getArtists } from "@/lib/queries";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Artists · NTV Vault" };
export const revalidate = 300;

async function ArtistsData() {
  const { artists } = await getArtists({ published: true, limit: 200 });

  return (
    <div className="px-4 pt-4 pb-12 md:px-8">
      <header className="pb-6">
        <h1
          className="font-[family-name:var(--font-bungee)] text-3xl tracking-tight text-[#62f3e4] md:text-4xl"
        >
          ARTISTS
        </h1>
        <p className="mt-2 text-sm text-[#B3B3B3]">
          The voices behind the music.
        </p>
      </header>

      {artists.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No artists yet"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} size="md" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArtistsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pt-4 pb-12 md:px-8">
          <h1
            className="font-mono text-3xl font-bold uppercase tracking-[0.15em] text-white md:text-4xl"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Artists
          </h1>
        </div>
      }
    >
      <ArtistsData />
    </Suspense>
  );
}
