import { SkeletonPulse } from "./SkeletonPulse";

export function TrackRowSkeleton() {
  return (
    <div className="grid grid-cols-[40px_1fr_120px_80px_60px] items-center gap-4 px-4 py-2">
      <SkeletonPulse width={16} height={16} rounded={3} />
      <div className="flex flex-col gap-2">
        <SkeletonPulse width="60%" height={12} rounded={3} />
        <SkeletonPulse width="35%" height={10} rounded={3} />
      </div>
      <SkeletonPulse width={48} height={12} rounded={3} />
      <SkeletonPulse width={56} height={24} rounded={999} />
      <div className="flex justify-end">
        <SkeletonPulse width={36} height={10} rounded={3} />
      </div>
    </div>
  );
}
