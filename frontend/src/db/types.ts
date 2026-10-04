// Domain types shared across repositories, services and UI.

export type Position = "Manager" | "Assistant Manager" | "Student Advisor";
export const POSITIONS: Position[] = ["Manager", "Assistant Manager", "Student Advisor"];

// Positions counted in personal-target division (have a personal target).
export function positionHasTarget(pos: Position): boolean {
  return pos === "Assistant Manager" || pos === "Student Advisor";
}

export type SalesStatus = "Actual" | "Delay" | "Decom";
export const SALES_STATUS: SalesStatus[] = ["Actual", "Delay", "Decom"];
export const STATUS_PCT: Record<SalesStatus, number> = {
  Actual: 1,
  Delay: 0.5,
  Decom: 0,
};

export type ProductType = "DUES" | "PRIVATE";
export type ClosingType = "DUES" | "PRIVATE" | "DUES_PRIVATE";
export type ClosingItemKind = "DUES" | "PRIVATE";

export type CoedCategory = "HO_AUTOPAY" | "ADVANCE_PAYMENT" | "ADVANCE_FREEZE" | "COLLECTION";
export const COED_CATEGORIES: { key: CoedCategory; label: string }[] = [
  { key: "HO_AUTOPAY", label: "HO Autopay" },
  { key: "ADVANCE_PAYMENT", label: "Advance Payment" },
  { key: "ADVANCE_FREEZE", label: "Advance Freeze Payment" },
  { key: "COLLECTION", label: "Collection" },
];

export interface TeamMember {
  id: number;
  name: string;
  position: Position;
  has_target: number; // 0/1
  active: number; // 0/1
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Product {
  id: number;
  type: ProductType;
  name: string;
  sessions: number | null;
  price: number; // integer rupiah
  active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MonthlyTarget {
  id: number;
  year: number;
  month: number; // 1-12
  academy_target: number;
  dues_target: number; // gross
  private_target: number; // gross
  created_at: string;
  updated_at: string;
}

export interface ClosingTransaction {
  id: number;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  timestamp: string; // ISO full
  advisor_id: number;
  type: ClosingType;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ClosingItem {
  id: number;
  closing_id: number;
  kind: ClosingItemKind;
  product_id: number | null;
  product_name: string;
  sessions: number | null;
  unit_price: number; // snapshot
  quantity: number;
  status: SalesStatus;
  status_pct: number;
  gross_revenue: number;
  achievement_revenue: number;
}

export interface DailyProduction {
  id: number;
  date: string;
  advisor_id: number;
  leads: number;
  appointment: number;
  show: number;
  interview: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CoedEntry {
  id: number;
  date: string;
  category: CoedCategory;
  amount: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CancellationEntry {
  id: number;
  date: string;
  advisor_id: number;
  qty: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WhatsappReport {
  id: number;
  date: string;
  free_trial: number;
  appt_tomorrow: number;
  appt_day_after: number;
  collection_appt: number;
  collection_show: number;
  report_time: string; // e.g. "9PM"
  created_at: string;
  updated_at: string;
}
