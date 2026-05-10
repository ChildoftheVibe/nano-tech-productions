import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/SearchPageClient";
import { SearchResultsSkeleton } from "@/components/ui/skeletons/SearchResultsSkeleton";

export const metadata = { title: "Search · NTV Vault" };

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pt-4 pb-12 md:px-8">
          <h1 className="mb-4 text-2xl font-bold text-white md:mb-6 md:text-3xl">
            Search
          </h1>
          <div className="mb-6 max-w-2xl">
            <div
              className="h-11 rounded-full"
              style={{
                background: "#181818",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>
          <SearchResultsSkeleton />
        </div>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}
