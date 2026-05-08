import { AlbumCardSkeleton } from "./AlbumCardSkeleton";
import { SkeletonPulse } from "./SkeletonPulse";

export function HomeSkeleton() {
  return (
    <div className="px-6 pt-2 pb-12 md:px-8">
      <section className="pt-2 pb-6">
        <SkeletonPulse width={260} height={36} rounded={6} />
      </section>
      <section className="pb-10">
        <div className="mb-4">
          <SkeletonPulse width={120} height={20} rounded={4} />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <AlbumCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
