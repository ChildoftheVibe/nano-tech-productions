import { SkeletonPulse } from "./SkeletonPulse";

export function AlbumCardSkeleton() {
  return (
    <div className="w-[180px] flex-shrink-0">
      <SkeletonPulse width={180} height={180} rounded={6} />
      <div className="mt-3 space-y-2">
        <SkeletonPulse width="70%" height={12} rounded={3} />
        <SkeletonPulse width="40%" height={10} rounded={3} />
      </div>
    </div>
  );
}
