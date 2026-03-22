import {
  DollarSign,
  TrendingUp,
  Crown,
  Hash,
} from "lucide-react";
import type { HDBRentRecord } from "../types";
import { formatRent } from "../utils/format";
import { median } from "../utils/aggregate";
import { useMemo } from "react";

interface KPIStripProps {
  data: HDBRentRecord[];
}

export function KPIStrip({ data }: KPIStripProps) {
  const rents = data.map((r) => r.monthlyRent);
  const avg = rents.length
    ? rents.reduce((a, b) => a + b, 0) / rents.length
    : 0;
  const med = median(rents);

  const mostExpensive = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((max, r) => (r.monthlyRent > max.monthlyRent ? r : max), data[0]);
  }, [data]);

  const kpis = [
    {
      icon: <DollarSign size={18} />,
      label: "Avg Monthly Rent",
      value: formatRent(avg),
      detail: null as string | null,
      color: "var(--accent)",
    },
    {
      icon: <TrendingUp size={18} />,
      label: "Median Rent",
      value: formatRent(med),
      detail: null as string | null,
      color: "var(--green)",
    },
    {
      icon: <Crown size={18} />,
      label: "Highest Rent Listed",
      value: mostExpensive ? formatRent(mostExpensive.monthlyRent) : "—",
      detail: mostExpensive
        ? `${mostExpensive.block} ${mostExpensive.streetName} · ${mostExpensive.flatType}`
        : null,
      color: "var(--orange)",
    },
    {
      icon: <Hash size={18} />,
      label: "Rental Listings",
      value: data.length.toLocaleString("en-SG"),
      detail: null as string | null,
      color: "var(--blue)",
    },
  ];

  return (
    <div className="kpi-strip">
      {kpis.map((k) => (
        <div className="kpi-card" key={k.label}>
          <div className="kpi-icon" style={{ color: k.color }}>
            {k.icon}
          </div>
          <div className="kpi-body">
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value">{k.value}</span>
            {k.detail && <span className="kpi-detail">{k.detail}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
