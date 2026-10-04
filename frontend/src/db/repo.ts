import { getDb } from "./database";
import { nowISO } from "@/src/lib/date";
import {
  CancellationEntry,
  ClosingItem,
  ClosingTransaction,
  CoedEntry,
  DailyProduction,
  MonthlyTarget,
  Product,
  SalesStatus,
  STATUS_PCT,
  TeamMember,
  WhatsappReport,
  ClosingType,
  ProductType,
  Position,
  CoedCategory,
} from "./types";

const db = () => getDb();

/* ----------------------------- TEAM ----------------------------- */

export function listTeam(includeInactive = true): TeamMember[] {
  const where = includeInactive ? "deleted_at IS NULL" : "deleted_at IS NULL AND active = 1";
  return db().getAllSync<TeamMember>(`SELECT * FROM team_members WHERE ${where} ORDER BY active DESC, id ASC`);
}

export function activeTeam(): TeamMember[] {
  return listTeam(false);
}

export function getMember(id: number): TeamMember | null {
  return db().getFirstSync<TeamMember>("SELECT * FROM team_members WHERE id = ?", [id]);
}

export function addMember(name: string, position: Position, hasTarget: boolean) {
  const ts = nowISO();
  return db().runSync(
    "INSERT INTO team_members (name, position, has_target, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
    [name, position, hasTarget ? 1 : 0, ts, ts],
  );
}

export function updateMember(id: number, name: string, position: Position, hasTarget: boolean) {
  db().runSync(
    "UPDATE team_members SET name = ?, position = ?, has_target = ?, updated_at = ? WHERE id = ?",
    [name, position, hasTarget ? 1 : 0, nowISO(), id],
  );
}

export function setMemberActive(id: number, active: boolean) {
  db().runSync("UPDATE team_members SET active = ?, updated_at = ? WHERE id = ?", [active ? 1 : 0, nowISO(), id]);
}

/* ----------------------------- PRODUCTS ----------------------------- */

export function listProducts(includeInactive = true, type?: ProductType): Product[] {
  const conds = ["deleted_at IS NULL"];
  const args: any[] = [];
  if (!includeInactive) conds.push("active = 1");
  if (type) {
    conds.push("type = ?");
    args.push(type);
  }
  return db().getAllSync<Product>(
    `SELECT * FROM products WHERE ${conds.join(" AND ")} ORDER BY active DESC, name ASC`,
    args,
  );
}

export function addProduct(type: ProductType, name: string, price: number, sessions: number | null) {
  const ts = nowISO();
  return db().runSync(
    "INSERT INTO products (type, name, sessions, price, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
    [type, name, sessions, price, ts, ts],
  );
}

export function updateProduct(id: number, name: string, price: number, sessions: number | null) {
  db().runSync("UPDATE products SET name = ?, price = ?, sessions = ?, updated_at = ? WHERE id = ?", [
    name, price, sessions, nowISO(), id,
  ]);
}

export function setProductActive(id: number, active: boolean) {
  db().runSync("UPDATE products SET active = ?, updated_at = ? WHERE id = ?", [active ? 1 : 0, nowISO(), id]);
}

export function productUsedInClosings(id: number): boolean {
  const r = db().getFirstSync<{ c: number }>("SELECT COUNT(*) c FROM closing_items WHERE product_id = ?", [id]);
  return (r?.c ?? 0) > 0;
}

/* ----------------------------- TARGETS ----------------------------- */

export function getTarget(year: number, month: number): MonthlyTarget | null {
  return db().getFirstSync<MonthlyTarget>("SELECT * FROM monthly_targets WHERE year = ? AND month = ?", [year, month]);
}

export function upsertTarget(year: number, month: number, academy: number, dues: number, priv: number) {
  const ts = nowISO();
  const existing = getTarget(year, month);
  if (existing) {
    db().runSync(
      "UPDATE monthly_targets SET academy_target = ?, dues_target = ?, private_target = ?, updated_at = ? WHERE id = ?",
      [academy, dues, priv, ts, existing.id],
    );
  } else {
    db().runSync(
      "INSERT INTO monthly_targets (year, month, academy_target, dues_target, private_target, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [year, month, academy, dues, priv, ts, ts],
    );
  }
}

export function listLegacyTargets() {
  return db().getAllSync<any>("SELECT * FROM legacy_personal_targets ORDER BY advisor_name ASC");
}

/* ----------------------------- CLOSINGS ----------------------------- */

export interface ClosingItemInput {
  kind: "DUES" | "PRIVATE";
  product_id: number | null;
  product_name: string;
  sessions: number | null;
  unit_price: number;
  quantity: number;
  status: SalesStatus;
}

export interface ClosingInput {
  date: string;
  time: string | null;
  advisor_id: number;
  type: ClosingType;
  notes: string | null;
  items: ClosingItemInput[];
}

function computeItem(i: ClosingItemInput) {
  const gross = Math.round(i.unit_price * i.quantity);
  const pct = STATUS_PCT[i.status];
  return { gross, pct, ach: Math.round(gross * pct) };
}

export function createClosing(input: ClosingInput): number {
  const ts = nowISO();
  const timestamp = `${input.date}T${(input.time ?? "00:00")}:00`;
  let newId = 0;
  db().withTransactionSync(() => {
    const res = db().runSync(
      "INSERT INTO closing_transactions (date, time, timestamp, advisor_id, type, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [input.date, input.time, timestamp, input.advisor_id, input.type, input.notes, ts, ts],
    );
    newId = res.lastInsertRowId as number;
    for (const i of input.items) {
      const c = computeItem(i);
      db().runSync(
        "INSERT INTO closing_items (closing_id, kind, product_id, product_name, sessions, unit_price, quantity, status, status_pct, gross_revenue, achievement_revenue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [newId, i.kind, i.product_id, i.product_name, i.sessions, i.unit_price, i.quantity, i.status, c.pct, c.gross, c.ach],
      );
    }
  });
  return newId;
}

export function updateClosing(id: number, input: ClosingInput) {
  const ts = nowISO();
  const timestamp = `${input.date}T${(input.time ?? "00:00")}:00`;
  db().withTransactionSync(() => {
    db().runSync(
      "UPDATE closing_transactions SET date = ?, time = ?, timestamp = ?, advisor_id = ?, type = ?, notes = ?, updated_at = ? WHERE id = ?",
      [input.date, input.time, timestamp, input.advisor_id, input.type, input.notes, ts, id],
    );
    db().runSync("DELETE FROM closing_items WHERE closing_id = ?", [id]);
    for (const i of input.items) {
      const c = computeItem(i);
      db().runSync(
        "INSERT INTO closing_items (closing_id, kind, product_id, product_name, sessions, unit_price, quantity, status, status_pct, gross_revenue, achievement_revenue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, i.kind, i.product_id, i.product_name, i.sessions, i.unit_price, i.quantity, i.status, c.pct, c.gross, c.ach],
      );
    }
  });
}

// Update a single item's status without recreating closing.
export function updateItemStatus(itemId: number, status: SalesStatus) {
  const item = db().getFirstSync<ClosingItem>("SELECT * FROM closing_items WHERE id = ?", [itemId]);
  if (!item) return;
  const pct = STATUS_PCT[status];
  const ach = Math.round(item.gross_revenue * pct);
  db().runSync("UPDATE closing_items SET status = ?, status_pct = ?, achievement_revenue = ? WHERE id = ?", [
    status, pct, ach, itemId,
  ]);
  db().runSync("UPDATE closing_transactions SET updated_at = ? WHERE id = ?", [nowISO(), item.closing_id]);
}

export function softDeleteClosing(id: number) {
  db().runSync("UPDATE closing_transactions SET deleted_at = ?, updated_at = ? WHERE id = ?", [nowISO(), nowISO(), id]);
}

export interface ClosingWithItems extends ClosingTransaction {
  advisor_name: string;
  items: ClosingItem[];
}

export function listClosings(year: number, month: number, advisorId?: number): ClosingWithItems[] {
  const conds = ["c.deleted_at IS NULL", "strftime('%Y', c.date) = ?", "strftime('%m', c.date) = ?"];
  const args: any[] = [String(year), String(month).padStart(2, "0")];
  if (advisorId) {
    conds.push("c.advisor_id = ?");
    args.push(advisorId);
  }
  const rows = db().getAllSync<ClosingTransaction & { advisor_name: string }>(
    `SELECT c.*, t.name as advisor_name FROM closing_transactions c
     LEFT JOIN team_members t ON t.id = c.advisor_id
     WHERE ${conds.join(" AND ")} ORDER BY c.date DESC, c.id DESC`,
    args,
  );
  return rows.map((r) => ({
    ...r,
    items: db().getAllSync<ClosingItem>("SELECT * FROM closing_items WHERE closing_id = ?", [r.id]),
  }));
}

export function getClosing(id: number): ClosingWithItems | null {
  const r = db().getFirstSync<ClosingTransaction & { advisor_name: string }>(
    `SELECT c.*, t.name as advisor_name FROM closing_transactions c
     LEFT JOIN team_members t ON t.id = c.advisor_id WHERE c.id = ?`,
    [id],
  );
  if (!r) return null;
  return { ...r, items: db().getAllSync<ClosingItem>("SELECT * FROM closing_items WHERE closing_id = ?", [id]) };
}

/* ----------------------------- DAILY PRODUCTION ----------------------------- */

export interface ProductionRow {
  advisor_id: number;
  advisor_name: string;
  leads: number;
  appointment: number;
  show: number;
  interview: number;
  prod_id: number | null;
}

// Returns active team members with their production for a given date (0s if none).
export function getProductionForDate(date: string): ProductionRow[] {
  const team = activeTeam();
  return team.map((m) => {
    const p = db().getFirstSync<DailyProduction>(
      "SELECT * FROM daily_production WHERE date = ? AND advisor_id = ? AND deleted_at IS NULL",
      [date, m.id],
    );
    return {
      advisor_id: m.id,
      advisor_name: m.name,
      leads: p?.leads ?? 0,
      appointment: p?.appointment ?? 0,
      show: p?.show ?? 0,
      interview: p?.interview ?? 0,
      prod_id: p?.id ?? null,
    };
  });
}

export function upsertProductionBatch(date: string, rows: Omit<ProductionRow, "advisor_name" | "prod_id">[]) {
  const ts = nowISO();
  db().withTransactionSync(() => {
    for (const r of rows) {
      const existing = db().getFirstSync<DailyProduction>(
        "SELECT * FROM daily_production WHERE date = ? AND advisor_id = ?",
        [date, r.advisor_id],
      );
      if (existing) {
        db().runSync(
          "UPDATE daily_production SET leads = ?, appointment = ?, show = ?, interview = ?, deleted_at = NULL, updated_at = ? WHERE id = ?",
          [r.leads, r.appointment, r.show, r.interview, ts, existing.id],
        );
      } else {
        db().runSync(
          "INSERT INTO daily_production (date, advisor_id, leads, appointment, show, interview, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [date, r.advisor_id, r.leads, r.appointment, r.show, r.interview, ts, ts],
        );
      }
    }
  });
}

export function listProductionHistory(year: number, month: number, advisorId?: number) {
  const conds = ["p.deleted_at IS NULL", "strftime('%Y', p.date) = ?", "strftime('%m', p.date) = ?"];
  const args: any[] = [String(year), String(month).padStart(2, "0")];
  if (advisorId) {
    conds.push("p.advisor_id = ?");
    args.push(advisorId);
  }
  return db().getAllSync<DailyProduction & { advisor_name: string }>(
    `SELECT p.*, t.name advisor_name FROM daily_production p LEFT JOIN team_members t ON t.id = p.advisor_id
     WHERE ${conds.join(" AND ")} ORDER BY p.date DESC, t.name ASC`,
    args,
  );
}

/* ----------------------------- COED ----------------------------- */

export function listCoed(year: number, month: number): CoedEntry[] {
  return db().getAllSync<CoedEntry>(
    "SELECT * FROM coed_entries WHERE deleted_at IS NULL AND strftime('%Y', date) = ? AND strftime('%m', date) = ? ORDER BY date DESC, id DESC",
    [String(year), String(month).padStart(2, "0")],
  );
}

export function addCoed(date: string, category: CoedCategory, amount: number) {
  const ts = nowISO();
  return db().runSync(
    "INSERT INTO coed_entries (date, category, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [date, category, amount, ts, ts],
  );
}

export function updateCoed(id: number, date: string, category: CoedCategory, amount: number) {
  db().runSync("UPDATE coed_entries SET date = ?, category = ?, amount = ?, updated_at = ? WHERE id = ?", [
    date, category, amount, nowISO(), id,
  ]);
}

export function softDeleteCoed(id: number) {
  db().runSync("UPDATE coed_entries SET deleted_at = ?, updated_at = ? WHERE id = ?", [nowISO(), nowISO(), id]);
}

/* ----------------------------- CANCELLATION ----------------------------- */

export function listCancellation(year: number, month: number, advisorId?: number): (CancellationEntry & { advisor_name: string })[] {
  const conds = ["c.deleted_at IS NULL", "strftime('%Y', c.date) = ?", "strftime('%m', c.date) = ?"];
  const args: any[] = [String(year), String(month).padStart(2, "0")];
  if (advisorId) {
    conds.push("c.advisor_id = ?");
    args.push(advisorId);
  }
  return db().getAllSync<CancellationEntry & { advisor_name: string }>(
    `SELECT c.*, t.name advisor_name FROM cancellation_entries c LEFT JOIN team_members t ON t.id = c.advisor_id
     WHERE ${conds.join(" AND ")} ORDER BY c.date DESC, c.id DESC`,
    args,
  );
}

export function addCancellation(date: string, advisorId: number, qty: number) {
  const ts = nowISO();
  return db().runSync(
    "INSERT INTO cancellation_entries (date, advisor_id, qty, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [date, advisorId, qty, ts, ts],
  );
}

export function updateCancellation(id: number, date: string, advisorId: number, qty: number) {
  db().runSync("UPDATE cancellation_entries SET date = ?, advisor_id = ?, qty = ?, updated_at = ? WHERE id = ?", [
    date, advisorId, qty, nowISO(), id,
  ]);
}

export function softDeleteCancellation(id: number) {
  db().runSync("UPDATE cancellation_entries SET deleted_at = ?, updated_at = ? WHERE id = ?", [nowISO(), nowISO(), id]);
}

/* ----------------------------- WHATSAPP ----------------------------- */

export function getWaReport(date: string): WhatsappReport | null {
  return db().getFirstSync<WhatsappReport>("SELECT * FROM whatsapp_reports WHERE date = ?", [date]);
}

export function upsertWaReport(date: string, fields: Partial<WhatsappReport>) {
  const ts = nowISO();
  const existing = getWaReport(date);
  const f = {
    free_trial: fields.free_trial ?? existing?.free_trial ?? 0,
    appt_tomorrow: fields.appt_tomorrow ?? existing?.appt_tomorrow ?? 0,
    appt_day_after: fields.appt_day_after ?? existing?.appt_day_after ?? 0,
    collection_appt: fields.collection_appt ?? existing?.collection_appt ?? 0,
    collection_show: fields.collection_show ?? existing?.collection_show ?? 0,
    report_time: fields.report_time ?? existing?.report_time ?? "9PM",
  };
  if (existing) {
    db().runSync(
      "UPDATE whatsapp_reports SET free_trial=?, appt_tomorrow=?, appt_day_after=?, collection_appt=?, collection_show=?, report_time=?, updated_at=? WHERE date=?",
      [f.free_trial, f.appt_tomorrow, f.appt_day_after, f.collection_appt, f.collection_show, f.report_time, ts, date],
    );
  } else {
    db().runSync(
      "INSERT INTO whatsapp_reports (date, free_trial, appt_tomorrow, appt_day_after, collection_appt, collection_show, report_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [date, f.free_trial, f.appt_tomorrow, f.appt_day_after, f.collection_appt, f.collection_show, f.report_time, ts, ts],
    );
  }
}

/* ----------------------------- SETTINGS ----------------------------- */

export function getSetting(key: string): string | null {
  const r = db().getFirstSync<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", [key]);
  return r?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db().runSync(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export function addImportLog(source: string, mode: string, summary: string) {
  db().runSync("INSERT INTO import_logs (created_at, source, mode, summary) VALUES (?, ?, ?, ?)", [
    nowISO(), source, mode, summary,
  ]);
}

export function listImportLogs() {
  return db().getAllSync<any>("SELECT * FROM import_logs ORDER BY id DESC LIMIT 20");
}
