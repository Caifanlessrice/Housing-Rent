import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import type { HDBRentRecord } from "../types";
import { ChartCard } from "./ChartCard";
import { COLORS } from "../utils/colors";

interface TransactionPieProps {
  data: HDBRentRecord[];
}

export function TransactionPie({ data }: TransactionPieProps) {
  const counts = new Map<string, number>();
  for (const r of data) {
    counts.set(r.flatType, (counts.get(r.flatType) ?? 0) + 1);
  }

  const chartData = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = data.length;

  return (
    <ChartCard title="Rental Mix by Flat Type" icon={<PieIcon size={16} />}>
      <ResponsiveContainer width="100%" height={280}>
        <RePieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={90}
            dataKey="value"
            paddingAngle={2}
            label={({ percent, x, y, textAnchor }: { percent?: number; x: number; y: number; textAnchor: string }) => (
              <text x={x} y={y} textAnchor={textAnchor as "start" | "middle" | "end"} fill="#ffffff" fontSize={11} fontWeight={600}>
                {((percent ?? 0) * 100).toFixed(1)}%
              </text>
            )}
            labelLine={{ stroke: "#ffffff55", strokeWidth: 1 }}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toLocaleString()} (${((Number(value) / total) * 100).toFixed(1)}%)`,
              String(name),
            ]}
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
          <Legend
            verticalAlign="bottom"
            iconSize={10}
            wrapperStyle={{ fontSize: 11 }}
          />
        </RePieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
