import { useState, useEffect } from "react";
import { List, ChevronLeft, ChevronRight } from "lucide-react";
import type { HDBRentRecord } from "../types";
import { formatRent, formatRentShort } from "../utils/format";
import { median } from "../utils/aggregate";

const PAGE_SIZE = 7;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

interface DrillDownProps {
  town: string | null;
  data: HDBRentRecord[];
}

export function DrillDown({ town, data }: DrillDownProps) {
  const [page, setPage] = useState(0);
  const isMobile = useIsMobile();

  // Reset page when town changes
  useEffect(() => {
    setPage(0);
  }, [town]);

  // If a town is selected, show only that town; otherwise show all data
  const listingData = (town
    ? data.filter((r) => r.town === town)
    : data
  ).sort((a, b) => {
    // Sort by month descending (latest first), then by rent descending
    const monthCmp = b.month.localeCompare(a.month);
    if (monthCmp !== 0) return monthCmp;
    return b.monthlyRent - a.monthlyRent;
  });

  const rents = listingData.map((r) => r.monthlyRent);
  const avg = rents.length
    ? rents.reduce((a, b) => a + b, 0) / rents.length
    : 0;
  const med = median(rents);
  const highest = rents.length ? rents.reduce((a, b) => Math.max(a, b), -Infinity) : 0;
  const lowest = rents.length ? rents.reduce((a, b) => Math.min(a, b), Infinity) : 0;

  const totalPages = Math.ceil(listingData.length / PAGE_SIZE);
  const display = listingData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const title = town ?? "All Towns";

  return (
    <div className="card drill-side-panel">
      <div className="card-header">
        <h3>
          <List size={14} /> {title}
        </h3>
        <span className="card-badge">
          {listingData.length.toLocaleString()} listings
        </span>
      </div>

      <div className="drill-summary drill-summary-compact">
        <div className="drill-stat">
          <span className="drill-stat-label">Avg</span>
          <span className="drill-stat-value">{formatRent(avg)}</span>
        </div>
        <div className="drill-stat">
          <span className="drill-stat-label">Median</span>
          <span className="drill-stat-value">{formatRent(med)}</span>
        </div>
        <div className="drill-stat">
          <span className="drill-stat-label">High</span>
          <span className="drill-stat-value highlight-up">{formatRent(highest)}</span>
        </div>
        <div className="drill-stat">
          <span className="drill-stat-label">Low</span>
          <span className="drill-stat-value highlight-down">{formatRentShort(lowest)}</span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{isMobile ? "Mth" : "Month"}</th>
              {!town && !isMobile && <th>Town</th>}
              <th>{isMobile ? "Address" : "Block & Street"}</th>
              <th>Type</th>
              <th>Rent</th>
            </tr>
          </thead>
          <tbody>
            {display.map((r, i) => (
              <tr key={i}>
                <td>{isMobile ? r.month.slice(2) : r.month}</td>
                {!town && !isMobile && <td>{r.town}</td>}
                <td>{r.block} {r.streetName}</td>
                <td>{isMobile ? r.flatType.replace("-ROOM", "R").replace("EXECUTIVE", "EXEC") : r.flatType}</td>
                <td>{formatRent(r.monthlyRent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-page"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="page-info">
            {page + 1} / {totalPages}
          </span>
          <button
            className="btn-page"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
