/**
 * Pre-fetches all HDB rental data from data.gov.sg and saves
 * a compressed JSON snapshot to public/hdb-data.json.
 *
 * Run: node scripts/build-data.mjs
 */

const DATASET_ID = "d_c9f57187485a850908655db0e8cfe651";
const PAGE_SIZE = 10_000;
const DELAY = 2_000;
const OUT = "public/hdb-data.json";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(offset) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=${PAGE_SIZE}&offset=${offset}&sort=rent_approval_date%20desc`;
    const res = await fetch(url);

    if (res.status === 429) {
      console.log(`  Rate limited at offset ${offset}, retrying in 10s...`);
      await sleep(10_000);
      continue;
    }

    const json = await res.json();

    if (json.code === 24 || json.name === "TOO_MANY_REQUESTS") {
      console.log(`  Rate limited (body) at offset ${offset}, retrying in 10s...`);
      await sleep(10_000);
      continue;
    }

    return {
      records: json.result?.records ?? [],
      total: json.result?.total ?? 0,
    };
  }

  throw new Error(`Failed after retries at offset ${offset}`);
}

async function main() {
  console.log("Fetching HDB rental data from data.gov.sg...\n");

  const first = await fetchPage(0);
  const total = first.total;
  const allRecords = [...first.records];
  console.log(`Total records: ${total.toLocaleString()}`);
  console.log(`Page 1: ${first.records.length} records`);

  let offset = PAGE_SIZE;
  let page = 2;

  while (offset < total) {
    await sleep(DELAY);
    const result = await fetchPage(offset);
    allRecords.push(...result.records);
    console.log(`Page ${page}: ${result.records.length} records (total: ${allRecords.length.toLocaleString()})`);
    offset += PAGE_SIZE;
    page++;
  }

  // Trim fields to reduce file size — only keep what the app needs
  const trimmed = allRecords.map((r) => ({
    d: r.rent_approval_date,   // date
    t: r.town,                  // town
    b: r.block,                 // block
    s: r.street_name,           // street
    f: r.flat_type,             // flat type
    r: r.monthly_rent,          // rent
  }));

  const { writeFileSync } = await import("fs");
  const json = JSON.stringify({ ts: Date.now(), records: trimmed });
  writeFileSync(OUT, json);

  const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(1);
  console.log(`\nSaved ${allRecords.length.toLocaleString()} records to ${OUT} (${sizeMB} MB)`);
  console.log("Done!");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
