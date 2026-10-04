// Indonesian Rupiah + number/percent formatting helpers.

export function formatRupiah(value: number | null | undefined, withSymbol = true): string {
  const n = Math.round(Number(value ?? 0));
  const s = new Intl.NumberFormat("id-ID").format(Math.abs(n));
  const sign = n < 0 ? "-" : "";
  return withSymbol ? `${sign}Rp${s}` : `${sign}${s}`;
}

// WhatsApp report style number: "1,458,000" (grouped with commas, no symbol). Dash when 0.
export function formatWaNumber(value: number | null | undefined, dashOnZero = true): string {
  const n = Math.round(Number(value ?? 0));
  if (dashOnZero && n === 0) return "-";
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatInt(value: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(value ?? 0)));
}

// Percentage; denominator 0 -> "-".
export function formatPercent(numerator: number, denominator: number, digits = 1): string {
  if (!denominator || denominator === 0) return "-";
  return `${((numerator / denominator) * 100).toFixed(digits)}%`;
}

export function pct(numerator: number, denominator: number): number | null {
  if (!denominator || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export function formatCompactRupiah(value: number | null | undefined): string {
  const n = Math.round(Number(value ?? 0));
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${sign}Rp${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}Rp${abs}`;
}
