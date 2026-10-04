// Centralized date helpers. All business dates are stored as "YYYY-MM-DD" (local).

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Local Y-M-D string from a Date.
export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toHM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Parse "YYYY-MM-DD" to a local Date at midnight.
export function fromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayYMD(): string {
  return toYMD(new Date());
}

export function nowISO(): string {
  return new Date().toISOString();
}

// Month key helpers. month is 1-12.
export function ymOf(ymd: string): { year: number; month: number } {
  const [y, m] = ymd.split("-").map((x) => parseInt(x, 10));
  return { year: y, month: m };
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES_ID[month - 1]} ${year}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthStart(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

export function monthEnd(year: number, month: number): string {
  return `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`;
}

// Day index within month for projection. For current month -> today's day, capped.
// For past/future months -> full month length.
export function elapsedDays(year: number, month: number): number {
  const now = new Date();
  const dim = daysInMonth(year, month);
  if (now.getFullYear() === year && now.getMonth() + 1 === month) {
    return Math.min(now.getDate(), dim);
  }
  // Month already ended (or future): use full month.
  return dim;
}

// Indonesian display date "03/10/2026" and "03/10/2026 21:00".
export function displayDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export function displayDateTime(ymd: string, hm?: string | null): string {
  const base = displayDate(ymd);
  return hm ? `${base} ${hm}` : base;
}

export function currentYM(): { year: number; month: number } {
  const n = new Date();
  return { year: n.getFullYear(), month: n.getMonth() + 1 };
}

export { MONTH_NAMES_ID };
