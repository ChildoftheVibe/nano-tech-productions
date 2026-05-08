import type { CSSProperties } from "react";

type Props = {
  width?: number | string;
  height?: number | string;
  rounded?: number | string;
  className?: string;
  style?: CSSProperties;
};

export function SkeletonPulse({
  width = "100%",
  height = "100%",
  rounded = 4,
  className = "",
  style,
}: Props) {
  return (
    <div
      aria-hidden
      className={`ntv-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius: typeof rounded === "number" ? `${rounded}px` : rounded,
        ...style,
      }}
    />
  );
}
