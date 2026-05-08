"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleSequential } from "d3-scale";

// world-atlas 110m, ISO numeric → ISO alpha-2 mapping happens via the
// `iso_a2` property on each geography feature (provided by the TopoJSON).
const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type Props = {
  data: Array<{ code: string; count: number }>;
};

function colorScale(max: number) {
  // Teal ramp: dark → accent. Pure interpolation so we don't pull in
  // d3-scale-chromatic.
  const interp = scaleSequential<string>()
    .domain([0, Math.max(1, max)])
    .interpolator((t: number) => {
      const start = [34, 33, 33]; // #222121
      const end = [61, 214, 200]; // #3DD6C8
      const r = Math.round(start[0] + (end[0] - start[0]) * t);
      const g = Math.round(start[1] + (end[1] - start[1]) * t);
      const b = Math.round(start[2] + (end[2] - start[2]) * t);
      return `rgb(${r}, ${g}, ${b})`;
    });
  return interp;
}

type Geo = {
  rsmKey: string;
  properties: {
    name?: string;
    iso_a2?: string;
    [key: string]: unknown;
  };
};

export function WorldMap({ data }: Props) {
  const [hover, setHover] = useState<{
    name: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const byCode = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of data) m.set(d.code.toUpperCase(), d.count);
    return m;
  }, [data]);

  const max = useMemo(() => {
    let m = 0;
    for (const d of data) if (d.count > m) m = d.count;
    return m;
  }, [data]);

  const fill = colorScale(max);

  return (
    <div className="relative">
      <ComposableMap
        projectionConfig={{ scale: 140 }}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: Geo[] }) =>
            geographies.map((geo) => {
              const code = (geo.properties.iso_a2 ?? "").toUpperCase();
              const count = byCode.get(code) ?? 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={count > 0 ? fill(count) : "#1a1919"}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={0.4}
                  onMouseEnter={(e) =>
                    setHover({
                      name: String(geo.properties.name ?? code),
                      count,
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }
                  onMouseMove={(e) =>
                    setHover((prev) =>
                      prev
                        ? { ...prev, x: e.clientX, y: e.clientY }
                        : prev,
                    )
                  }
                  onMouseLeave={() => setHover(null)}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#3DD6C8" },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {hover && (
        <div
          className="pointer-events-none fixed z-50 rounded border border-white/10 bg-[#1a1919] px-3 py-1.5 text-xs shadow-lg"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="font-medium">{hover.name}</div>
          <div className="text-white/60">
            {hover.count.toLocaleString()} session
            {hover.count === 1 ? "" : "s"}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-white/50">
        <span>0</span>
        <div
          className="h-2 flex-1 rounded"
          style={{
            background:
              "linear-gradient(to right, #222121, #3DD6C8)",
          }}
        />
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}
