import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { HDBRentRecord } from "../types";
import { aggregateBy } from "../utils/aggregate";
import { formatRent, formatRentShort } from "../utils/format";
import { ChartCard } from "./ChartCard";
import { COLORS } from "../utils/colors";

interface TownChartProps {
  data: HDBRentRecord[];
  onTownClick: (town: string) => void;
}

export function TownChart({ data, onTownClick }: TownChartProps) {
  const agg = aggregateBy(data, "town").sort((a, b) => b.avg - a.avg);

  return (
    <ChartCard
      title="Average Monthly Rent by Town"
      icon={<BarChart3 size={16} />}
      badge="Click bar to view listings"
      className="card-wide"
    >
      <div className="town-chart-scroll">
        <div style={{ height: Math.max(400, agg.length * 28) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agg} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis
                type="number"
                tickFormatter={(v) => formatRentShort(v)}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { label: string; avg: number; count: number };
                  return (
                    <div style={{
                      background: "#1a1d27",
                      border: "1px solid #2a2e3a",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "#ffffff",
                      minWidth: 180,
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, color: "#818cf8" }}>{d.label}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
                        <span style={{ color: "#7c82a0" }}>Avg Rent</span>
                        <strong>{formatRent(d.avg)}/mo</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
                        <span style={{ color: "#7c82a0" }}>Listings</span>
                        <strong>{d.count.toLocaleString()}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: "#565c7a", textAlign: "center", fontStyle: "italic" }}>
                        Click to view all listings
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="avg"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(entry) => onTownClick((entry as unknown as { label: string }).label)}
              >
                {agg.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
                <LabelList
                  dataKey="avg"
                  position="right"
                  formatter={(v) => formatRentShort(Number(v))}
                  style={{ fill: "#ffffff", fontSize: 10, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
