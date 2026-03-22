import { useMemo, useState, useEffect, useCallback } from "react";
import { MapPin } from "lucide-react";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { HDBRentRecord } from "../types";
import { formatRent } from "../utils/format";
import { ChartCard } from "./ChartCard";

interface HeatMapProps {
  data: HDBRentRecord[];
  onTownClick: (town: string) => void;
}

const TOWN_TO_GEO: Record<string, string[]> = {
  "Ang Mo Kio": ["ANG MO KIO"],
  "Bedok": ["BEDOK"],
  "Bishan": ["BISHAN"],
  "Bukit Batok": ["BUKIT BATOK"],
  "Bukit Merah": ["BUKIT MERAH"],
  "Bukit Panjang": ["BUKIT PANJANG"],
  "Bukit Timah": ["BUKIT TIMAH"],
  "Central Area": ["DOWNTOWN CORE", "OUTRAM", "ROCHOR", "MUSEUM", "RIVER VALLEY", "SINGAPORE RIVER", "NEWTON", "ORCHARD"],
  "Choa Chu Kang": ["CHOA CHU KANG"],
  "Clementi": ["CLEMENTI"],
  "Geylang": ["GEYLANG"],
  "Hougang": ["HOUGANG"],
  "Jurong East": ["JURONG EAST"],
  "Jurong West": ["JURONG WEST"],
  "Kallang/Whampoa": ["KALLANG"],
  "Lim Chu Kang": ["LIM CHU KANG"],
  "Marine Parade": ["MARINE PARADE"],
  "Pasir Ris": ["PASIR RIS"],
  "Punggol": ["PUNGGOL"],
  "Queenstown": ["QUEENSTOWN"],
  "Sembawang": ["SEMBAWANG"],
  "Sengkang": ["SENGKANG"],
  "Serangoon": ["SERANGOON"],
  "Tampines": ["TAMPINES"],
  "Toa Payoh": ["TOA PAYOH"],
  "Woodlands": ["WOODLANDS"],
  "Yishun": ["YISHUN"],
};

const GEO_TO_TOWN: Record<string, string> = {};
for (const [town, geoNames] of Object.entries(TOWN_TO_GEO)) {
  for (const gn of geoNames) {
    GEO_TO_TOWN[gn] = town;
  }
}

interface GeoFeature extends Feature<Geometry> {
  properties: { name: string };
}

function getRentColor(ratio: number): string {
  const stops = [
    { r: 34, g: 139, b: 34 },
    { r: 76, g: 187, b: 23 },
    { r: 255, g: 215, b: 0 },
    { r: 255, g: 120, b: 0 },
    { r: 220, g: 38, b: 38 },
  ];

  const t = Math.max(0, Math.min(1, ratio));
  const segment = t * (stops.length - 1);
  const i = Math.min(Math.floor(segment), stops.length - 2);
  const f = segment - i;

  const r = Math.round(stops[i].r + (stops[i + 1].r - stops[i].r) * f);
  const g = Math.round(stops[i].g + (stops[i + 1].g - stops[i].g) * f);
  const b = Math.round(stops[i].b + (stops[i + 1].b - stops[i].b) * f);

  return `rgb(${r}, ${g}, ${b})`;
}

function medianCalc(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function HeatMap({ data, onTownClick }: HeatMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [hoveredTown, setHoveredTown] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    fetch("/singapore-planning-areas.geojson")
      .then((r) => r.json())
      .then((d: FeatureCollection) => setGeoData(d))
      .catch(() => console.error("Failed to load Singapore map data"));
  }, []);

  const townStats = useMemo(() => {
    const rentsByTown: Record<string, number[]> = {};
    for (const r of data) {
      if (!rentsByTown[r.town]) rentsByTown[r.town] = [];
      rentsByTown[r.town].push(r.monthlyRent);
    }

    const stats: Record<string, { median: number; count: number; avg: number }> = {};
    for (const [town, rents] of Object.entries(rentsByTown)) {
      const sum = rents.reduce((a, b) => a + b, 0);
      stats[town] = {
        median: medianCalc(rents),
        count: rents.length,
        avg: sum / rents.length,
      };
    }
    return stats;
  }, [data]);

  const { minMedian, maxMedian } = useMemo(() => {
    const medians = Object.values(townStats).map((s) => s.median);
    return {
      minMedian: medians.length > 0 ? Math.min(...medians) : 0,
      maxMedian: medians.length > 0 ? Math.max(...medians) : 1,
    };
  }, [townStats]);

  const getTown = useCallback((feature: GeoFeature): string | null => {
    return GEO_TO_TOWN[feature.properties.name] ?? null;
  }, []);

  const getFill = useCallback(
    (feature: GeoFeature): string => {
      const town = getTown(feature);
      if (!town || !townStats[town]) return "#1c2035";

      const range = maxMedian - minMedian || 1;
      const ratio = (townStats[town].median - minMedian) / range;
      return getRentColor(ratio);
    },
    [getTown, townStats, minMedian, maxMedian]
  );

  if (!geoData) {
    return (
      <ChartCard
        title="Rental Price Heat Map — Singapore"
        icon={<MapPin size={16} />}
        badge="Loading map…"
      >
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="loader-ring" />
        </div>
      </ChartCard>
    );
  }

  const canvasW = 900;
  const canvasH = 480;

  const projection = geoMercator()
    .center([103.835, 1.355])
    .scale(95000)
    .translate([canvasW / 2, canvasH / 2]);

  const vbX = 70;
  const vbY = 30;
  const width = canvasW - 140;
  const height = canvasH - 70;

  const pathGenerator = geoPath().projection(projection);

  const legendStops = 6;

  const hoveredStats = hoveredTown ? townStats[hoveredTown] : null;

  return (
    <ChartCard
      title="Rental Price Heat Map — Singapore"
      icon={<MapPin size={16} />}
      badge={`${Object.keys(townStats).length} towns · Median rent`}
    >
      <div className="choropleth-container">
        <svg
          viewBox={`${vbX} ${vbY} ${width} ${height}`}
          className="choropleth-svg"
          role="img"
          aria-label="Singapore choropleth map showing HDB rental prices by town"
        >
          <rect x="0" y="0" width={canvasW} height={canvasH} fill="#0d1117" />

          {geoData.features.map((feature, i) => {
            const f = feature as GeoFeature;
            const d = pathGenerator(f);
            if (!d) return null;

            const town = getTown(f);
            const fill = getFill(f);
            const isHovered = hoveredTown !== null && town === hoveredTown;
            const hasData = town !== null && townStats[town] !== undefined;

            return (
              <path
                key={i}
                d={d}
                fill={fill}
                stroke={isHovered ? "#ffffff" : "#2a2e3a"}
                strokeWidth={isHovered ? 2 : 0.5}
                opacity={hoveredTown !== null && !isHovered ? 0.5 : 1}
                style={{
                  cursor: hasData ? "pointer" : "default",
                  transition: "opacity 0.2s, stroke-width 0.15s, fill 0.3s",
                }}
                onMouseEnter={(e) => {
                  if (town) {
                    setHoveredTown(town);
                    const svgRect = e.currentTarget.closest("svg")?.getBoundingClientRect();
                    if (svgRect) {
                      setTooltipPos({
                        x: e.clientX - svgRect.left,
                        y: e.clientY - svgRect.top,
                      });
                    }
                  }
                }}
                onMouseMove={(e) => {
                  const svgRect = e.currentTarget.closest("svg")?.getBoundingClientRect();
                  if (svgRect) {
                    setTooltipPos({
                      x: e.clientX - svgRect.left,
                      y: e.clientY - svgRect.top,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredTown(null)}
                onClick={() => {
                  if (town && townStats[town]) onTownClick(town);
                }}
              />
            );
          })}

          {geoData.features.map((feature, i) => {
            const f = feature as GeoFeature;
            const town = getTown(f);
            if (!town || !townStats[town]) return null;

            const geoNames = TOWN_TO_GEO[town];
            if (geoNames && geoNames[0] !== f.properties.name) return null;

            const centroid = pathGenerator.centroid(f);
            if (!centroid || isNaN(centroid[0])) return null;

            const med = townStats[town].median;

            return (
              <g key={`label-${i}`} style={{ pointerEvents: "none" }}>
                <text
                  x={centroid[0]}
                  y={centroid[1] - 5}
                  textAnchor="middle"
                  stroke="#000000"
                  strokeWidth="3"
                  fill="none"
                  fontSize="8.5"
                  fontWeight="600"
                  paintOrder="stroke"
                >
                  {town}
                </text>
                <text
                  x={centroid[0]}
                  y={centroid[1] - 5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8.5"
                  fontWeight="600"
                >
                  {town}
                </text>
                <text
                  x={centroid[0]}
                  y={centroid[1] + 7}
                  textAnchor="middle"
                  stroke="#000000"
                  strokeWidth="3"
                  fill="none"
                  fontSize="7.5"
                  fontWeight="700"
                  paintOrder="stroke"
                >
                  {formatRent(med)}/mo
                </text>
                <text
                  x={centroid[0]}
                  y={centroid[1] + 7}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="7.5"
                  fontWeight="700"
                >
                  {formatRent(med)}/mo
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredTown && hoveredStats && (
          <div
            className="choropleth-tooltip"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 10,
            }}
          >
            <div className="choropleth-tooltip-title">{hoveredTown}</div>
            <div className="choropleth-tooltip-row">
              <span>Median Rent</span>
              <strong>{formatRent(hoveredStats.median)}/mo</strong>
            </div>
            <div className="choropleth-tooltip-row">
              <span>Avg Rent</span>
              <strong>{formatRent(hoveredStats.avg)}/mo</strong>
            </div>
            <div className="choropleth-tooltip-row">
              <span>Listings</span>
              <strong>{hoveredStats.count.toLocaleString()}</strong>
            </div>
            <div className="choropleth-tooltip-hint">Click to drill down</div>
          </div>
        )}

        <div className="choropleth-legend">
          <span className="choropleth-legend-label">Lower</span>
          <div className="choropleth-legend-bar">
            {Array.from({ length: legendStops }, (_, i) => (
              <div
                key={i}
                className="choropleth-legend-stop"
                style={{
                  backgroundColor: getRentColor(i / (legendStops - 1)),
                }}
              />
            ))}
          </div>
          <span className="choropleth-legend-label">Higher</span>
        </div>
        <div className="choropleth-legend-values">
          <span>{formatRent(minMedian)}/mo</span>
          <span>Median Monthly Rent</span>
          <span>{formatRent(maxMedian)}/mo</span>
        </div>
      </div>
    </ChartCard>
  );
}
