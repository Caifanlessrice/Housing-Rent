import { useState, useMemo, useCallback } from "react";
import type { Filters } from "./types";
import { useHDBData } from "./hooks/useHDBData";
import { LoadingScreen } from "./components/LoadingScreen";
import { KPIStrip } from "./components/KPIStrip";
import { FilterBar } from "./components/FilterBar";
import { TownChart } from "./components/TownChart";
import { FlatTypeChart } from "./components/FlatTypeChart";
import { TrendChart } from "./components/TrendChart";
import { TransactionPie } from "./components/PieChart";
import { YoYChart } from "./components/PsmChart";
import { RentDistribution } from "./components/StoreyChart";
import { HeatMap } from "./components/HeatMap";
import { DrillDown } from "./components/DrillDown";
import "./App.css";

function App() {
  const { data, loading, loadingMore, progress, total, error } = useHDBData();
  const [filters, setFilters] = useState<Filters>({
    year: "all",
    town: "all",
    flatType: "all",
  });
  const [drillTown, setDrillTown] = useState<string | null>(null);

  const handleTownClick = useCallback((town: string) => {
    setDrillTown((prev) => (prev === town ? null : town));
  }, []);

  const filtered = useMemo(() => {
    return data.filter(
      (r) =>
        (filters.year === "all" || r.year === filters.year) &&
        (filters.town === "all" || r.town === filters.town) &&
        (filters.flatType === "all" || r.flatType === filters.flatType)
    );
  }, [data, filters]);

  if (loading) {
    return <LoadingScreen progress={progress} error={error} />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <span className="header-icon">🏠</span>
          <span className="header-title">HDB Rental Explorer</span>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <h1>Singapore HDB Rental Prices</h1>
        <p>
          Explore rental listings across all HDB towns and flat types —
          helping you find the right home at the right price
        </p>
      </section>

      {/* Background loading indicator */}
      {loadingMore && (
        <div className="loading-banner">
          <div className="loading-banner-bar">
            <div
              className="loading-banner-fill"
              style={{ width: `${total > 0 ? (data.length / total) * 100 : 0}%` }}
            />
          </div>
          <span>{progress}</span>
        </div>
      )}

      {/* KPIs */}
      <KPIStrip data={filtered} />

      {/* Filters */}
      <FilterBar data={data} filters={filters} onChange={setFilters} />

      {/* Charts */}
      <section className="dashboard">
        {/* Heat Map + Listings side-by-side (always visible) */}
        <div className="map-listings-row has-drill">
          <div className="map-col">
            <HeatMap data={filtered} onTownClick={handleTownClick} />
          </div>
          <div className="drill-col">
            <DrillDown
              town={drillTown}
              data={filtered}
            />
          </div>
        </div>

        <RentDistribution data={filtered} />

        <div className="chart-row">
          <TownChart data={filtered} onTownClick={handleTownClick} />
          <FlatTypeChart data={filtered} />
        </div>

        <div className="chart-row">
          <TrendChart data={filtered} />
          <TransactionPie data={filtered} />
        </div>

        <YoYChart data={filtered} />
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>
          Data source:{" "}
          <a href="https://data.gov.sg" target="_blank" rel="noopener noreferrer">
            data.gov.sg
          </a>{" "}
          — HDB Renting Out of Flats (Jan 2021 onwards)
        </p>
        <p className="footer-sub">
          Built with React, TypeScript &amp; Recharts
        </p>
      </footer>
    </div>
  );
}

export default App;
