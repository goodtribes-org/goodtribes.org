"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import type { GeoJsonObject } from "geojson";
import { scaleLinear } from "d3-scale";
import worldAtlas from "../../public/geo/countries-110m.json";

// react-simple-maps v5's types declare `geography` as GeoJSON-only, but its
// runtime (confirmed by reading node_modules/react-simple-maps/dist) still
// accepts a raw TopoJSON topology and converts it via topojson-client — the
// type just hasn't caught up. Cast through unknown rather than widen the prop.
const worldAtlasGeography = worldAtlas as unknown as GeoJsonObject;

interface Props {
  /** Normalized world-atlas country name -> count (see src/lib/geo.ts) */
  counts: Record<string, number>;
  /** Label used in the hover tooltip, e.g. "projects" or "organisations" */
  unitLabel: string;
}

export default function CountryMap({ counts, unitLabel }: Props) {
  const [hovered, setHovered] = useState<{ name: string; count: number; x: number; y: number } | null>(null);

  const colorScale = useMemo(() => {
    const max = Math.max(1, ...Object.values(counts));
    return scaleLinear<string>().domain([0, max]).range(["#e7f0ec", "#2f7d5c"]);
  }, [counts]);

  if (Object.keys(counts).length === 0) {
    return null;
  }

  return (
    <div className="relative border border-muted-teal/30 rounded-xl overflow-hidden bg-dry-sage/10">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 145 }}
        width={800}
        height={430}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={worldAtlasGeography}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name = (geo.properties?.name as string | undefined) ?? "";
              const count = counts[name] ?? 0;
              const isHovered = hovered?.name === name;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(e) => {
                    if (count > 0) setHovered({ name, count, x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    if (count > 0) setHovered({ name, count, x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    fill: count > 0 ? (isHovered ? "#e8724b" : colorScale(count)) : "#dfe7e3",
                    stroke: "#ffffff",
                    strokeWidth: 0.5,
                    outline: "none",
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {hovered && (
        <div
          className="fixed z-50 pointer-events-none bg-dark-slate text-white text-xs rounded px-2 py-1 shadow-lg"
          style={{ left: hovered.x + 12, top: hovered.y + 12 }}
        >
          {hovered.name}: {hovered.count} {unitLabel}
        </div>
      )}
    </div>
  );
}
