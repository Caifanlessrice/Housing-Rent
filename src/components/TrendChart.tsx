import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { HDBRentRecord } from "../types";
import { aggregateTrend } from "../utils/aggregate";
import { formatRent, formatRentShort } from "../utils/format";
import { ChartCard } from "./ChartCard";

interface TrendChartProps {
  data: HDBRentRecord[];
}

export function TrendChart({ data }: TrendChartProps) {
  const trend = aggregateTrend(data);

  const step = Math.max(1, Math.ceil(trend.length / 20));
  const labelStep = Math.max(1, Math.ceil(trend.length / 8));
  const withLabels = trend.map((t, i) => ({
    ...t,
    displayMonth: i % step === 0 ? t.month : "",
    displayRent: i % labelStep === 0 || i === trend.length - 1
      ? formatRentShort(t.avg)
      : null,
  }));

  return (
    <ChartCard
      title="Rent Trend Over Time"
      icon={<TrendingUp size={16} />}
      className="card-wide"
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={withLabels} margin={{ right: 10 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="displayMonth"
            tick={{ fontSize: 10 }}
            angle={-35}
            textAnchor="end"
          />
          <YAxis
            tickFormatter={(v) => formatRentShort(v)}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.month ?? ""
            }
            formatter={(value) => [formatRent(Number(value)), "Avg Rent"]}
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
          <Area
            type="monotone"
            dataKey="avg"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#trendGrad)"
          >
            <LabelList
              dataKey="displayRent"
              position="top"
              style={{ fill: "#ffffff", fontSize: 9, fontWeight: 600 }}
              offset={8}
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
