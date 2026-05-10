import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/SearchPageClient";

export const metadata = { title: "Search · NTV Vault" };

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 pt-6 pb-12 md:px-8">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Search</h1>
        </div>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}
