export function formatRent(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-SG");
}

export function formatRentShort(n: number): string {
  if (n >= 10_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + Math.round(n).toLocaleString("en-SG");
}

export function titleCase(s: string): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
