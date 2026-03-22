import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart2 } from "lucide-react";
import type { HDBRentRecord } from "../types";
import { formatRent } from "../utils/format";
import { ChartCard } from "./ChartCard";
import { COLORS } from "../utils/colors";
import { useMemo } from "react";

interface RentDistributionProps {
  data: HDBRentRecord[];
}

export function RentDistribution({ data }: RentDistributionProps) {
  const buckets = useMemo(() => {
    const ranges = [
      { label: "< $1,000", min: 0, max: 1000 },
      { label: "$1,000–1,500", min: 1000, max: 1500 },
      { label: "$1,500–2,000", min: 1500, max: 2000 },
      { label: "$2,000–2,500", min: 2000, max: 2500 },
      { label: "$2,500–3,000", min: 2500, max: 3000 },
      { label: "$3,000–3,500", min: 3000, max: 3500 },
      { label: "$3,500–4,000", min: 3500, max: 4000 },
      { label: "$4,000–5,000", min: 4000, max: 5000 },
      { label: "$5,000+", min: 5000, max: Infinity },
    ];

    return ranges.map((r) => {
      const matching = data.filter(
        (d) => d.monthlyRent >= r.min && d.monthlyRent < r.max
      );
      const avg = matching.length
        ? matching.reduce((s, d) => s + d.monthlyRent, 0) / matching.length
        : 0;
      return {
        label: r.label,
        count: matching.length,
        avg,
      };
    });
  }, [data]);

  const total = data.length;

  return (
    <ChartCard
      title="Rent Distribution"
      icon={<BarChart2 size={16} />}
      badge="Monthly rent ranges"
      className="card-full"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={buckets} margin={{ bottom: 20 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            tickFormatter={(v) => v.toLocaleString()}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, _name, props) => {
              const d = props.payload;
              const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0";
              return [
                `${Number(value).toLocaleString()} listings (${pct}%)${d.avg > 0 ? ` · Avg ${formatRent(d.avg)}` : ""}`,
                "Count",
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
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
            {buckets.map((_, i) => (
              <Cell key={i} fill={COLORS[(i + 8) % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
