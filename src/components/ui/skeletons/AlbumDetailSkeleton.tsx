import { AlbumHeroSkeleton } from "./AlbumHeroSkeleton";
import { TrackRowSkeleton } from "./TrackRowSkeleton";
import { SkeletonPulse } from "./SkeletonPulse";

export function AlbumDetailSkeleton() {
  return (
    <div className="text-white">
      <AlbumHeroSkeleton />
      <section className="flex flex-wrap items-center gap-3 px-6 pb-6 md:px-8">
        <SkeletonPulse width={56} height={56} rounded={999} />
        <SkeletonPulse width={48} height={48} rounded={999} />
        <SkeletonPulse width={180} height={56} rounded={999} />
      </section>
      <section className="px-2 pb-10 md:px-4">
        <div className="grid grid-cols-[40px_1fr_120px_80px_60px] gap-4 border-b border-white/10 px-4 pb-2 text-[11px]">
          <SkeletonPulse width={12} height={10} rounded={3} />
          <SkeletonPulse width={48} height={10} rounded={3} />
          <SkeletonPulse width={36} height={10} rounded={3} />
          <div />
          <SkeletonPulse
            width={36}
            height={10}
            rounded={3}
            style={{ marginLeft: "auto" }}
          />
        </div>
        <div className="pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
