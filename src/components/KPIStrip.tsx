import { DollarSign, TrendingUp, Crown, Hash } from "lucide-react";
import type { HDBRentRecord } from "../types";
import { formatRent } from "../utils/format";
import { median } from "../utils/aggregate";
import { useMemo, useEffect, useRef, useState } from "react";

interface KPIStripProps {
  data: HDBRentRecord[];
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  animatedValue?: number;
  detail?: string | null;
  color: string;
  accentBorder: string;
  delay: number;
  featured?: boolean;
}

function KPICard({ icon, label, value, detail, color, accentBorder, delay, featured }: KPICardProps) {
  return (
    <div
      className={`kpi-card${featured ? " kpi-card--featured" : ""}`}
      style={{
        animationDelay: `${delay}ms`,
        borderTop: `2px solid ${accentBorder}`,
      }}
    >
      <div className="kpi-icon" style={{ color }}>
        {icon}
      </div>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">{value}</span>
        {detail && <span className="kpi-detail">{detail}</span>}
      </div>
    </div>
  );
}

export function KPIStrip({ data }: KPIStripProps) {
  const rents = data.map((r) => r.monthlyRent);
  const avg = rents.length ? rents.reduce((a, b) => a + b, 0) / rents.length : 0;
  const med = median(rents);

  const mostExpensive = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((max, r) => (r.monthlyRent > max.monthlyRent ? r : max), data[0]);
  }, [data]);

  const animatedAvg = useCountUp(Math.round(avg));
  const animatedMed = useCountUp(Math.round(med));
  const animatedHigh = useCountUp(mostExpensive?.monthlyRent ?? 0);
  const animatedCount = useCountUp(data.length);

  const kpis: KPICardProps[] = [
    {
      icon: <DollarSign size={18} />,
      label: "Avg Monthly Rent",
      value: formatRent(animatedAvg),
      color: "var(--accent)",
      accentBorder: "var(--accent)",
      delay: 0,
      featured: true,
    },
    {
      icon: <TrendingUp size={18} />,
      label: "Median Rent",
      value: formatRent(animatedMed),
      color: "var(--green)",
      accentBorder: "var(--green)",
      delay: 60,
    },
    {
      icon: <Crown size={18} />,
      label: "Highest Rent Listed",
      value: mostExpensive ? formatRent(animatedHigh) : "—",
      detail: mostExpensive
        ? `${mostExpensive.block} ${mostExpensive.streetName} · ${mostExpensive.flatType}`
        : null,
      color: "var(--orange)",
      accentBorder: "var(--orange)",
      delay: 120,
    },
    {
      icon: <Hash size={18} />,
      label: "Rental Listings",
      value: animatedCount.toLocaleString("en-SG"),
      color: "var(--blue)",
      accentBorder: "var(--blue)",
      delay: 180,
    },
  ];

  return (
    <div className="kpi-strip">
      {kpis.map((k) => (
        <KPICard key={k.label} {...k} />
      ))}
    </div>
  );
}
