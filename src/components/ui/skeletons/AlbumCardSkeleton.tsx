import { SkeletonPulse } from "./SkeletonPulse";

// Teal tint matches the brand accent (#62f3e4). Cards look intentional, not
// "broken white box," while covers stream in.
const TEAL_TINT = "rgba(98,243,228,0.08)";

export function AlbumCardSkeleton() {
  return (
    <div className="w-[180px] flex-shrink-0">
      <SkeletonPulse
        width={180}
        height={180}
        rounded={6}
        style={{ background: TEAL_TINT }}
      />
      <div className="mt-3 space-y-2">
        <SkeletonPulse width="70%" height={12} rounded={3} />
        <SkeletonPulse width="40%" height={10} rounded={3} />
      </div>
    </div>
  );
}
