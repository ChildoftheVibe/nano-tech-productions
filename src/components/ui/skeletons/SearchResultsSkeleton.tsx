import { SkeletonPulse } from "./SkeletonPulse";

function SectionHeader() {
  return (
    <div className="mb-3 flex items-center gap-2">
      <SkeletonPulse width={14} height={14} rounded={3} />
      <SkeletonPulse width={70} height={10} rounded={3} />
      <SkeletonPulse width={20} height={10} rounded={3} />
    </div>
  );
}

function AlbumRow() {
  return (
    <div className="flex items-center gap-3 rounded-md p-2">
      <SkeletonPulse width={48} height={48} rounded={4} />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonPulse width="55%" height={12} rounded={3} />
        <SkeletonPulse width="30%" height={10} rounded={3} />
      </div>
    </div>
  );
}

function TrackRow() {
  return (
    <div className="flex items-center gap-3 rounded-md p-2">
      <SkeletonPulse width={16} height={16} rounded={3} />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonPulse width="45%" height={12} rounded={3} />
        <SkeletonPulse width="30%" height={10} rounded={3} />
      </div>
      <SkeletonPulse width={32} height={10} rounded={3} />
    </div>
  );
}

function ArtistChip() {
  return (
    <div className="flex items-center gap-2 rounded-md p-2">
      <SkeletonPulse width={32} height={32} rounded={999} />
      <SkeletonPulse width="60%" height={12} rounded={3} />
    </div>
  );
}

/** Search results loading skeleton — used both in /search Suspense fallback and
 * when the SearchPageClient is fetching results for a debounced query. */
export function SearchResultsSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <section>
        <SectionHeader />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <AlbumRow key={i} />
          ))}
        </div>
      </section>
      <section>
        <SectionHeader />
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <TrackRow key={i} />
          ))}
        </div>
      </section>
      <section>
        <SectionHeader />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ArtistChip key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
