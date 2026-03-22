import { useState, useEffect, useRef, useCallback } from "react";
import type { RawRecord, HDBRentRecord } from "../types";
import { titleCase } from "../utils/format";

const DATASET_ID = "d_c9f57187485a850908655db0e8cfe651";
const PAGE_SIZE = 10_000;
const RATE_LIMIT_DELAY = 1_500;
const RETRY_DELAY = 8_000;
const MAX_RETRIES = 6;
const PARALLEL_REQUESTS = 2;

// Cache config
const DB_NAME = "hdb-rent-cache";
const DB_VERSION = 1;
const STORE_NAME = "records";
const META_STORE = "meta";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Static snapshot: pre-built via `node scripts/build-data.mjs`
const SNAPSHOT_URL = "/hdb-data.json";

// ── Compact record from static snapshot ──
interface CompactRecord {
  d: string; // rent_approval_date
  t: string; // town
  b: string; // block
  s: string; // street_name
  f: string; // flat_type
  r: number | string; // monthly_rent
}

function normalise(r: RawRecord): HDBRentRecord {
  return {
    month: r.rent_approval_date,
    year: r.rent_approval_date?.substring(0, 4) ?? "",
    town: titleCase(r.town),
    flatType: r.flat_type,
    block: r.block,
    streetName: titleCase(r.street_name),
    monthlyRent: Number(r.monthly_rent) || 0,
  };
}

function normaliseCompact(r: CompactRecord): HDBRentRecord {
  return {
    month: r.d,
    year: r.d?.substring(0, 4) ?? "",
    town: titleCase(r.t),
    flatType: r.f,
    block: r.b,
    streetName: titleCase(r.s),
    monthlyRent: Number(r.r) || 0,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── IndexedDB helpers ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCachedData(): Promise<{
  data: HDBRentRecord[];
  timestamp: number;
} | null> {
  try {
    const db = await openDB();

    const meta = await new Promise<
      { key: string; timestamp: number } | undefined
    >((resolve, reject) => {
      const tx = db.transaction(META_STORE, "readonly");
      const req = tx.objectStore(META_STORE).get("cache-info");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!meta) {
      db.close();
      return null;
    }

    const records = await new Promise<HDBRentRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () =>
        resolve(
          (req.result as { data: HDBRentRecord }[]).map((r) => r.data)
        );
      req.onerror = () => reject(req.error);
    });

    db.close();
    if (records.length === 0) return null;

    return { data: records, timestamp: meta.timestamp };
  } catch {
    return null;
  }
}

async function setCachedData(records: HDBRentRecord[]): Promise<void> {
  if (records.length === 0) return;
  try {
    const db = await openDB();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    const CHUNK = 5000;
    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        for (const rec of chunk) {
          store.add({ data: rec });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, "readwrite");
      tx.objectStore(META_STORE).put({
        key: "cache-info",
        timestamp: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch {
    // Non-critical
  }
}

// ── Static snapshot loader ──

async function loadSnapshot(): Promise<HDBRentRecord[] | null> {
  try {
    const res = await fetch(SNAPSHOT_URL);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.records || !Array.isArray(json.records)) return null;
    return (json.records as CompactRecord[]).map(normaliseCompact);
  } catch {
    return null;
  }
}

// ── API fetching ──

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

// ── Main hook ──

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

    async function loadData() {
      // Priority 1: IndexedDB cache (instant)
      try {
        const cached = await getCachedData();
        if (cached && cached.data.length > 0) {
          const age = Date.now() - cached.timestamp;
          setData(cached.data);
          setTotal(cached.data.length);
          setLoading(false);

          if (age < CACHE_TTL) {
            setProgress(
              `${cached.data.length.toLocaleString()} records (cached)`
            );
            return;
          }

          // Stale cache — refresh in background
          setProgress("Updating data in background…");
          setLoadingMore(true);
          fetchAllFromAPI(true);
          return;
        }
      } catch {
        // Continue to next source
      }

      // Priority 2: Static snapshot file (fast, same-origin)
      setProgress("Loading data…");
      const snapshot = await loadSnapshot();
      if (snapshot && snapshot.length > 0) {
        setData(snapshot);
        setTotal(snapshot.length);
        setLoading(false);
        setProgress(
          `${snapshot.length.toLocaleString()} records loaded`
        );
        // Cache the snapshot for even faster future loads
        setCachedData(snapshot);
        // Refresh from API in background to get latest data
        setLoadingMore(true);
        setProgress("Checking for latest data…");
        fetchAllFromAPI(true);
        return;
      }

      // Priority 3: Live API fetch (slowest, but always available)
      fetchAllFromAPI(false);
    }

    async function fetchAllFromAPI(isRefresh: boolean) {
      let loadedCount = 0;
      const allRecords: HDBRentRecord[] = [];

      try {
        const firstPage = await fetchPage(0);
        const totalRecords = firstPage.total;
        const firstBatch = firstPage.records.map(normalise);
        allRecords.push(...firstBatch);
        loadedCount = firstBatch.length;

        if (!isRefresh) {
          setData(firstBatch);
          setTotal(totalRecords);
          setLoading(false);
          setLoadingMore(totalRecords > loadedCount);
          setProgress(
            `Loaded ${loadedCount.toLocaleString()} of ${totalRecords.toLocaleString()} records`
          );
        }

        if (loadedCount < totalRecords) {
          const remainingOffsets: number[] = [];
          for (let o = PAGE_SIZE; o < totalRecords; o += PAGE_SIZE) {
            remainingOffsets.push(o);
          }

          for (
            let i = 0;
            i < remainingOffsets.length;
            i += PARALLEL_REQUESTS
          ) {
            const batch = remainingOffsets.slice(i, i + PARALLEL_REQUESTS);

            try {
              const results = await Promise.all(
                batch.map((o) => fetchPage(o))
              );
              const batchRecords: HDBRentRecord[] = [];

              for (const result of results) {
                const normalised = result.records.map(normalise);
                batchRecords.push(...normalised);
                loadedCount += normalised.length;
              }

              allRecords.push(...batchRecords);

              if (isRefresh) {
                setProgress(
                  `Updating… ${loadedCount.toLocaleString()} of ${totalRecords.toLocaleString()}`
                );
              } else {
                appendData(batchRecords, totalRecords, loadedCount);
              }
            } catch {
              break;
            }

            if (i + PARALLEL_REQUESTS < remainingOffsets.length) {
              await delay(RATE_LIMIT_DELAY);
            }
          }
        }

        if (isRefresh) {
          setData(allRecords);
          setTotal(allRecords.length);
        }

        setProgress(`${allRecords.length.toLocaleString()} records loaded`);
        setLoadingMore(false);

        setCachedData(allRecords);
      } catch (err) {
        if (!isRefresh) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch data"
          );
          setLoading(false);
        }
        setLoadingMore(false);
      }
    }

    loadData();
  }, [appendData]);

  return { data, loading, loadingMore, progress, total, error };
}
