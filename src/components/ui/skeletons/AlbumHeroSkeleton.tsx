import { SkeletonPulse } from "./SkeletonPulse";

export function AlbumHeroSkeleton() {
  return (
    <section
      className="px-6 pt-6 pb-8 md:px-8 md:pt-8 md:pb-10"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, #393838 100%)",
      }}
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-8">
        <SkeletonPulse width={230} height={230} rounded={6} />
        <div className="min-w-0 flex-1 space-y-3">
          <SkeletonPulse width={64} height={10} rounded={3} />
          <SkeletonPulse width="60%" height={36} rounded={6} />
          <SkeletonPulse width="40%" height={12} rounded={3} />
          <div className="space-y-2 pt-2">
            <SkeletonPulse width="80%" height={10} rounded={3} />
            <SkeletonPulse width="55%" height={10} rounded={3} />
          </div>
          <div className="flex gap-3 pt-3">
            <SkeletonPulse width={120} height={36} rounded={999} />
            <SkeletonPulse width={96} height={36} rounded={999} />
          </div>
        </div>
      </div>
    </section>
  );
}
