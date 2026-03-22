// ── Core data types ────────────────────────────────────────

export interface RawRecord {
  rent_approval_date: string;
  town: string;
  block: string;
  street_name: string;
  flat_type: string;
  monthly_rent: string;
  _id: number;
}

export interface HDBRentRecord {
  month: string;
  year: string;
  town: string;
  flatType: string;
  block: string;
  streetName: string;
  monthlyRent: number;
}

// ── Filter state ───────────────────────────────────────────

export interface Filters {
  year: string;
  town: string;
  flatType: string;
}

// ── Aggregation helpers ────────────────────────────────────

export interface AggEntry {
  label: string;
  avg: number;
  count: number;
  total: number;
}

export interface TrendPoint {
  month: string;
  avg: number;
  count: number;
}
