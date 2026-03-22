import { useState, useEffect, useRef, useCallback } from "react";
import type { RawRecord, HDBRentRecord } from "../types";
import { titleCase } from "../utils/format";

const DATASET_ID = "d_c9f57187485a850908655db0e8cfe651";
const PAGE_SIZE = 10_000;
const RATE_LIMIT_DELAY = 2_000;
const RETRY_DELAY = 10_000;
const MAX_RETRIES = 8;

function normalise(r: RawRecord): HDBRentRecord {
  return {
    month: r.rent_approval_date,
    year: r.rent_approval_date?.substring(0, 4) ?? "",
    town: titleCase(r.town),
    flatType: r.flat_type,
    block: r.block,
    streetName: titleCase(r.street_name),
    monthlyRent: parseFloat(r.monthly_rent) || 0,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(
  offset: number
): Promise<{ records: RawRecord[]; total: number }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=${PAGE_SIZE}&offset=${offset}&sort=rent_approval_date%20desc`;
    const res = await fetch(url);

    if (res.status === 429) {
      await delay(RETRY_DELAY);
      continue;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    if (json.code === 24 || json.name === "TOO_MANY_REQUESTS") {
      await delay(RETRY_DELAY);
      continue;
    }

    return {
      records: json.result?.records ?? [],
      total: json.result?.total ?? 0,
    };
  }

  throw new Error("Rate limited after multiple retries");
}

export function useHDBData() {
  const [data, setData] = useState<HDBRentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [progress, setProgress] = useState("Connecting to data.gov.sg…");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const appendData = useCallback(
    (newRecords: HDBRentRecord[], totalCount: number, loadedCount: number) => {
      setData((prev) => [...prev, ...newRecords]);
      setTotal(totalCount);
      setProgress(
        `Loaded ${loadedCount.toLocaleString()} of ${totalCount.toLocaleString()} records`
      );
    },
    []
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchAll() {
      let offset = 0;
      let loadedCount = 0;
      let isFirstBatch = true;
      let totalRecords = 0;
      let consecutiveErrors = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const page = await fetchPage(offset);
          consecutiveErrors = 0;
          totalRecords = page.total;

          const normalised = page.records.map(normalise);
          loadedCount += normalised.length;
          offset += PAGE_SIZE;

          appendData(normalised, page.total, loadedCount);

          if (isFirstBatch) {
            setLoading(false);
            setLoadingMore(true);
            isFirstBatch = false;
          }

          if (page.records.length < PAGE_SIZE || loadedCount >= totalRecords) {
            break;
          }

          await delay(RATE_LIMIT_DELAY);
        } catch (err) {
          consecutiveErrors++;

          if (isFirstBatch) {
            setError(
              err instanceof Error ? err.message : "Failed to fetch data"
            );
            setLoading(false);
            break;
          }

          if (consecutiveErrors >= 3) {
            break;
          }

          await delay(RETRY_DELAY);
        }
      }

      setLoadingMore(false);
    }

    fetchAll();
  }, [appendData]);

  return { data, loading, loadingMore, progress, total, error };
}
