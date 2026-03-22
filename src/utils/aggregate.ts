import type { HDBRentRecord, AggEntry, TrendPoint } from "../types";

export function aggregateBy(
  data: HDBRentRecord[],
  key: keyof HDBRentRecord
): AggEntry[] {
  const map = new Map<string, { sum: number; count: number }>();

  for (const r of data) {
    const k = String(r[key]);
    const entry = map.get(k) ?? { sum: 0, count: 0 };
    entry.sum += r.monthlyRent;
    entry.count++;
    map.set(k, entry);
  }

  return Array.from(map.entries()).map(([label, { sum, count }]) => ({
    label,
    avg: sum / count,
    count,
    total: sum,
  }));
}

export function aggregateTrend(data: HDBRentRecord[]): TrendPoint[] {
  const map = new Map<string, { sum: number; count: number }>();

  for (const r of data) {
    const entry = map.get(r.month) ?? { sum: 0, count: 0 };
    entry.sum += r.monthlyRent;
    entry.count++;
    map.set(r.month, entry);
  }

  return Array.from(map.entries())
    .map(([month, { sum, count }]) => ({
      month,
      avg: sum / count,
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Year-over-year average rent change by town */
export function yoyByTown(
  data: HDBRentRecord[]
): { town: string; prevAvg: number; currAvg: number; change: number }[] {
  const years = [...new Set(data.map((r) => r.year))].sort();
  if (years.length < 2) return [];

  const currYear = years[years.length - 1];
  const prevYear = years[years.length - 2];

  const curr = data.filter((r) => r.year === currYear);
  const prev = data.filter((r) => r.year === prevYear);

  const currByTown = new Map<string, { sum: number; count: number }>();
  const prevByTown = new Map<string, { sum: number; count: number }>();

  for (const r of curr) {
    const e = currByTown.get(r.town) ?? { sum: 0, count: 0 };
    e.sum += r.monthlyRent;
    e.count++;
    currByTown.set(r.town, e);
  }
  for (const r of prev) {
    const e = prevByTown.get(r.town) ?? { sum: 0, count: 0 };
    e.sum += r.monthlyRent;
    e.count++;
    prevByTown.set(r.town, e);
  }

  const results: { town: string; prevAvg: number; currAvg: number; change: number }[] = [];
  for (const [town, c] of currByTown) {
    const p = prevByTown.get(town);
    if (!p) continue;
    const currAvg = c.sum / c.count;
    const prevAvg = p.sum / p.count;
    const change = ((currAvg - prevAvg) / prevAvg) * 100;
    results.push({ town, prevAvg, currAvg, change });
  }

  return results.sort((a, b) => b.change - a.change);
}
