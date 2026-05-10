import { Suspense } from "react";
import { getLibraryAlbums } from "@/lib/queries";
import { LibraryClient } from "@/components/library/LibraryClient";

export const metadata = { title: "Library · NTV Vault" };
export const revalidate = 300;

async function LibraryData() {
  const albums = await getLibraryAlbums();
  return <LibraryClient albums={albums} />;
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 pt-6 pb-12 md:px-8">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Library</h1>
        </div>
      }
    >
      <LibraryData />
    </Suspense>
  );
}
