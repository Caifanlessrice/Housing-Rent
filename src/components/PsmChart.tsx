import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { HDBRentRecord } from "../types";
import { yoyByTown } from "../utils/aggregate";
import { formatRent } from "../utils/format";
import { ChartCard } from "./ChartCard";

interface YoYChartProps {
  data: HDBRentRecord[];
}

export function YoYChart({ data }: YoYChartProps) {
  const yoy = yoyByTown(data);

  if (yoy.length === 0) {
    return (
      <ChartCard
        title="Year-over-Year Rent Change by Town"
        icon={<TrendingUp size={16} />}
        badge="Need 2+ years of data"
        className="card-full"
      >
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          Loading more data for YoY comparison…
        </div>
      </ChartCard>
    );
  }

  const years = [...new Set(data.map((r) => r.year))].sort();
  const currYear = years[years.length - 1];
  const prevYear = years[years.length - 2];

  const chartData = yoy.map((d) => ({
    label: d.town,
    change: parseFloat(d.change.toFixed(1)),
    currAvg: d.currAvg,
    prevAvg: d.prevAvg,
  }));

  return (
    <ChartCard
      title="Year-over-Year Rent Change by Town"
      icon={<TrendingUp size={16} />}
      badge={`${prevYear} → ${currYear}`}
      className="card-full"
    >
      <div style={{ height: Math.max(400, chartData.length * 28) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40 }}>
            <XAxis
              type="number"
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={{ fontSize: 11 }}
            />
            <ReferenceLine x={0} stroke="var(--text-dim)" strokeWidth={1} />
            <Tooltip
              formatter={(_value, _name, props) => {
                const d = props.payload;
                return [
                  `${d.change > 0 ? "+" : ""}${d.change}% (${formatRent(d.prevAvg)} → ${formatRent(d.currAvg)})`,
                  "YoY Change",
                ];
              }}
              contentStyle={{
                background: "#1a1d27",
                border: "1px solid #2a2e3a",
                borderRadius: 8,
                fontSize: 13,
                color: "#ffffff",
              }}
              labelStyle={{ color: "#ffffff" }}
              itemStyle={{ color: "#ffffff" }}
            />
            <Bar dataKey="change" radius={[0, 4, 4, 0]}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.change >= 0 ? "var(--red)" : "var(--green)"}
                />
              ))}
              <LabelList
                dataKey="change"
                position="right"
                formatter={(v) => `${Number(v) > 0 ? "+" : ""}${v}%`}
                style={{ fill: "#ffffff", fontSize: 10, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
