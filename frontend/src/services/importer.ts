import { getDb } from "@/src/db/database";
import { addImportLog } from "@/src/db/repo";
import { nowISO } from "@/src/lib/date";
import { Position, SalesStatus, STATUS_PCT, CoedCategory } from "@/src/db/types";

export type ImportMode = "merge" | "replace";

interface NItem {
  kind: "DUES" | "PRIVATE";
  product_name: string;
  sessions: number | null;
  unit_price: number;
  quantity: number;
  status: SalesStatus;
}
interface NClosing {
  date: string;
  time: string | null;
  timestamp: string;
  advisor_name: string;
  type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: NItem[];
}
interface NProduction {
  date: string; advisor_name: string; leads: number; appointment: number; show: number; interview: number;
  created_at: string; updated_at: string;
}
interface NCoed { date: string; category: CoedCategory; amount: number; created_at: string }
interface NCancel { date: string; advisor_name: string; qty: number; created_at: string }

export interface Normalized {
  format: "rockstar_old" | "sa_summary" | "unknown";
  team: { name: string; position: Position; has_target: number; active: number; created_at: string }[];
  products: { type: "DUES" | "PRIVATE"; name: string; sessions: number | null; price: number; active: number; created_at: string }[];
  monthlyTargets: { year: number; month: number; academy_target: number; dues_target: number; private_target: number }[];
  legacyTargets: { advisor_name: string; revenue_target: number; unit_target: number; private_target: number; month: number; year: number }[];
  closings: NClosing[];
  production: NProduction[];
  coed: NCoed[];
  cancellations: NCancel[];
  whatsapp: any[];
  settings: { key: string; value: string }[];
  unmapped: string[];
}

const ROSTER: Record<string, [Position, number]> = {
  emily: ["Manager", 0],
  cipta: ["Assistant Manager", 1],
  matt: ["Student Advisor", 1],
  eric: ["Student Advisor", 1],
  liam: ["Student Advisor", 1],
};

function mapRole(name: string, role: string | undefined): [Position, number] {
  const k = (name || "").trim().toLowerCase();
  if (ROSTER[k]) return ROSTER[k];
  const r = (role || "").toUpperCase();
  if (r === "MANAGER") return ["Manager", 0];
  if (r.includes("ASSISTANT") || r === "ASM") return ["Assistant Manager", 1];
  return ["Student Advisor", 1];
}

function normStatus(s: any): SalesStatus {
  const v = String(s || "Actual");
  if (v === "Delay" || v === "Decom" || v === "Actual") return v;
  return "Actual";
}

/* ----------------------------- PARSE ----------------------------- */

export function detectFormat(raw: any): Normalized["format"] {
  if (raw?.app === "SA Summary" && raw?.data) return "sa_summary";
  if (raw?.backupType === "rockstar_academy_dashboard" || Array.isArray(raw?.advisors)) return "rockstar_old";
  return "unknown";
}

function buildFromOld(raw: any): Normalized {
  const unmapped: string[] = [];
  const advisorsById = new Map<number, { name: string; role: string }>();
  for (const a of raw.advisors ?? []) advisorsById.set(a.id, { name: a.name, role: a.role });

  const team = (raw.advisors ?? []).map((a: any) => {
    const [position, has_target] = mapRole(a.name, a.role);
    return { name: a.name, position, has_target, active: a.active ? 1 : 0, created_at: nowISO() };
  });

  const products = (raw.products ?? []).map((p: any) => ({
    type: "DUES" as const, name: p.name, sessions: null, price: Math.round(p.price || 0),
    active: p.active ? 1 : 0, created_at: nowISO(),
  }));

  const legacyTargets = (raw.targets ?? []).map((t: any) => ({
    advisor_name: advisorsById.get(t.advisor_id)?.name ?? `#${t.advisor_id}`,
    revenue_target: Math.round(t.revenue_target || 0),
    unit_target: Math.round(t.unit_target || 0),
    private_target: Math.round(t.private_target || 0),
    month: t.month || 0,
    year: t.year || 0,
  }));

  const itemsByClosing = new Map<number, any[]>();
  for (const it of raw.closing_items ?? []) {
    if (!itemsByClosing.has(it.closing_id)) itemsByClosing.set(it.closing_id, []);
    itemsByClosing.get(it.closing_id)!.push(it);
  }

  const closings: NClosing[] = (raw.closings ?? []).map((c: any) => {
    const adv = advisorsById.get(c.advisor_id);
    if (!adv) unmapped.push(`Closing #${c.id}: advisor_id ${c.advisor_id} tidak ditemukan`);
    const items: NItem[] = [];
    for (const it of itemsByClosing.get(c.id) ?? []) {
      items.push({
        kind: "DUES",
        product_name: it.product_name || "Dues",
        sessions: null,
        unit_price: Math.round(it.unit_price || 0),
        quantity: Math.max(1, Math.round(it.quantity || 1)),
        status: normStatus(it.status ?? c.status),
      });
    }
    const privRev = Math.round(c.private_revenue || 0);
    const privQty = Math.round(c.private_qty || 0);
    if (privRev > 0 || privQty > 0 || String(c.type || "").includes("PRIVATE")) {
      const qty = privQty > 0 ? privQty : privRev > 0 ? 1 : 0;
      if (qty > 0) {
        items.push({
          kind: "PRIVATE",
          product_name: "Private",
          sessions: null,
          unit_price: privQty > 0 ? Math.round(privRev / privQty) : privRev,
          quantity: qty,
          status: normStatus(c.private_status ?? c.status),
        });
      }
    }
    return {
      date: c.date,
      time: null,
      timestamp: c.created_at || `${c.date}T00:00:00.000Z`,
      advisor_name: adv?.name ?? "",
      type: c.type || "DUES",
      notes: c.notes || null,
      created_at: c.created_at || nowISO(),
      updated_at: c.updated_at || c.created_at || nowISO(),
      items,
    };
  }).filter((c: NClosing) => c.advisor_name);

  const production: NProduction[] = (raw.daily_production ?? []).map((p: any) => ({
    date: p.date,
    advisor_name: advisorsById.get(p.advisor_id)?.name ?? "",
    leads: p.leads || 0, appointment: p.appointment || 0, show: p.show || 0, interview: p.interview || 0,
    created_at: p.created_at || nowISO(), updated_at: p.updated_at || nowISO(),
  })).filter((p: NProduction) => p.advisor_name);

  const coed: NCoed[] = [];
  for (const c of raw.coed ?? []) {
    const map: [CoedCategory, number][] = [
      ["HO_AUTOPAY", c.ho_autopay], ["ADVANCE_PAYMENT", c.advance_payment],
      ["ADVANCE_FREEZE", c.advance_freeze], ["COLLECTION", c.collection],
    ];
    for (const [cat, amt] of map) {
      if (amt && amt > 0) coed.push({ date: c.date, category: cat, amount: Math.round(amt), created_at: c.created_at || nowISO() });
    }
  }

  const cancellations: NCancel[] = (raw.cancellations ?? []).map((c: any) => ({
    date: c.date,
    advisor_name: advisorsById.get(c.advisor_id)?.name ?? "",
    qty: 1,
    created_at: c.created_at || nowISO(),
  })).filter((c: NCancel) => c.advisor_name);

  const settings = (raw.settings ?? []).map((s: any) => ({ key: s.key, value: String(s.value ?? "") }));

  return {
    format: "rockstar_old", team, products, monthlyTargets: [], legacyTargets,
    closings, production, coed, cancellations, whatsapp: [], settings, unmapped,
  };
}

function buildFromNew(raw: any): Normalized {
  const d = raw.data ?? {};
  const memById = new Map<number, string>();
  for (const m of d.team_members ?? []) memById.set(m.id, m.name);

  const team = (d.team_members ?? []).map((m: any) => ({
    name: m.name, position: m.position as Position, has_target: m.has_target ?? 1,
    active: m.active ?? 1, created_at: m.created_at || nowISO(),
  }));
  const products = (d.products ?? []).map((p: any) => ({
    type: (p.type || "DUES") as "DUES" | "PRIVATE", name: p.name, sessions: p.sessions ?? null,
    price: Math.round(p.price || 0), active: p.active ?? 1, created_at: p.created_at || nowISO(),
  }));
  const monthlyTargets = (d.monthly_targets ?? []).map((t: any) => ({
    year: t.year, month: t.month, academy_target: t.academy_target || 0,
    dues_target: t.dues_target || 0, private_target: t.private_target || 0,
  }));
  const legacyTargets = (d.legacy_personal_targets ?? []).map((t: any) => ({
    advisor_name: t.advisor_name, revenue_target: t.revenue_target || 0, unit_target: t.unit_target || 0,
    private_target: t.private_target || 0, month: t.month || 0, year: t.year || 0,
  }));

  const itemsByClosing = new Map<number, any[]>();
  for (const it of d.closing_items ?? []) {
    if (!itemsByClosing.has(it.closing_id)) itemsByClosing.set(it.closing_id, []);
    itemsByClosing.get(it.closing_id)!.push(it);
  }
  const closings: NClosing[] = (d.closing_transactions ?? []).map((c: any) => ({
    date: c.date, time: c.time ?? null, timestamp: c.timestamp || `${c.date}T00:00:00.000Z`,
    advisor_name: memById.get(c.advisor_id) ?? "", type: c.type || "DUES", notes: c.notes ?? null,
    created_at: c.created_at || nowISO(), updated_at: c.updated_at || nowISO(),
    items: (itemsByClosing.get(c.id) ?? []).map((it: any) => ({
      kind: (it.kind || "DUES") as "DUES" | "PRIVATE", product_name: it.product_name,
      sessions: it.sessions ?? null, unit_price: Math.round(it.unit_price || 0),
      quantity: Math.round(it.quantity || 1), status: normStatus(it.status),
    })),
  })).filter((c: NClosing) => c.advisor_name);

  const production: NProduction[] = (d.daily_production ?? []).map((p: any) => ({
    date: p.date, advisor_name: memById.get(p.advisor_id) ?? "",
    leads: p.leads || 0, appointment: p.appointment || 0, show: p.show || 0, interview: p.interview || 0,
    created_at: p.created_at || nowISO(), updated_at: p.updated_at || nowISO(),
  })).filter((p: NProduction) => p.advisor_name);

  const coed: NCoed[] = (d.coed_entries ?? []).map((c: any) => ({
    date: c.date, category: c.category as CoedCategory, amount: Math.round(c.amount || 0), created_at: c.created_at || nowISO(),
  }));
  const cancellations: NCancel[] = (d.cancellation_entries ?? []).map((c: any) => ({
    date: c.date, advisor_name: memById.get(c.advisor_id) ?? "", qty: c.qty || 1, created_at: c.created_at || nowISO(),
  })).filter((c: NCancel) => c.advisor_name);
  const whatsapp = d.whatsapp_reports ?? [];
  const settings = (d.app_settings ?? []).map((s: any) => ({ key: s.key, value: String(s.value ?? "") }));

  return {
    format: "sa_summary", team, products, monthlyTargets, legacyTargets,
    closings, production, coed, cancellations, whatsapp, settings, unmapped: [],
  };
}

export function parseBackup(text: string): Normalized {
  const raw = JSON.parse(text);
  const fmt = detectFormat(raw);
  if (fmt === "rockstar_old") return buildFromOld(raw);
  if (fmt === "sa_summary") return buildFromNew(raw);
  return {
    format: "unknown", team: [], products: [], monthlyTargets: [], legacyTargets: [],
    closings: [], production: [], coed: [], cancellations: [], whatsapp: [], settings: [],
    unmapped: ["Format backup tidak dikenali. Hanya mendukung backup aplikasi lama (Rockstar) atau export SA Summary."],
  };
}

/* ----------------------------- PREVIEW ----------------------------- */

export interface ImportPreview {
  format: Normalized["format"];
  counts: {
    team: number; products: number; monthlyTargets: number; legacyTargets: number;
    closings: number; closingItems: number; production: number; coed: number;
    cancellations: number; whatsapp: number; settings: number;
  };
  duplicates: { closings: number; coed: number; cancellations: number; production: number };
  unmapped: string[];
}

function memberNameSet(): Set<string> {
  const db = getDb();
  const rows = db.getAllSync<{ name: string }>("SELECT LOWER(name) name FROM team_members WHERE deleted_at IS NULL");
  return new Set(rows.map((r) => r.name));
}

export function previewImport(n: Normalized): ImportPreview {
  const db = getDb();
  let dupClosings = 0, dupCoed = 0, dupCancel = 0, dupProd = 0;
  for (const c of n.closings) {
    const r = db.getFirstSync<{ c: number }>(
      "SELECT COUNT(*) c FROM closing_transactions WHERE date=? AND created_at=?",
      [c.date, c.created_at],
    );
    if ((r?.c ?? 0) > 0) dupClosings++;
  }
  for (const c of n.coed) {
    const r = db.getFirstSync<{ c: number }>(
      "SELECT COUNT(*) c FROM coed_entries WHERE date=? AND category=? AND amount=?",
      [c.date, c.category, c.amount],
    );
    if ((r?.c ?? 0) > 0) dupCoed++;
  }
  for (const c of n.cancellations) {
    const r = db.getFirstSync<{ c: number }>(
      "SELECT COUNT(*) c FROM cancellation_entries WHERE date=? AND created_at=?",
      [c.date, c.created_at],
    );
    if ((r?.c ?? 0) > 0) dupCancel++;
  }
  for (const p of n.production) {
    const r = db.getFirstSync<{ c: number }>(
      "SELECT COUNT(*) c FROM daily_production WHERE date=? AND advisor_id=(SELECT id FROM team_members WHERE LOWER(name)=LOWER(?) LIMIT 1)",
      [p.date, p.advisor_name],
    );
    if ((r?.c ?? 0) > 0) dupProd++;
  }
  return {
    format: n.format,
    counts: {
      team: n.team.length, products: n.products.length, monthlyTargets: n.monthlyTargets.length,
      legacyTargets: n.legacyTargets.length, closings: n.closings.length,
      closingItems: n.closings.reduce((a, c) => a + c.items.length, 0),
      production: n.production.length, coed: n.coed.length,
      cancellations: n.cancellations.length, whatsapp: n.whatsapp.length, settings: n.settings.length,
    },
    duplicates: { closings: dupClosings, coed: dupCoed, cancellations: dupCancel, production: dupProd },
    unmapped: n.unmapped,
  };
}

/* ----------------------------- APPLY ----------------------------- */

export interface ImportResult {
  ok: boolean;
  error?: string;
  added: Record<string, number>;
  skipped: Record<string, number>;
}

export function applyImport(n: Normalized, mode: ImportMode): ImportResult {
  const db = getDb();
  const added: Record<string, number> = { team: 0, products: 0, targets: 0, legacy: 0, closings: 0, production: 0, coed: 0, cancellations: 0, whatsapp: 0, settings: 0 };
  const skipped: Record<string, number> = { closings: 0, coed: 0, cancellations: 0, production: 0, team: 0, products: 0 };
  const ts = nowISO();

  try {
    db.withTransactionSync(() => {
      if (mode === "replace") {
        for (const t of ["closing_items", "closing_transactions", "daily_production", "coed_entries", "cancellation_entries", "whatsapp_reports", "monthly_targets", "legacy_personal_targets", "products", "team_members", "app_settings"]) {
          db.runSync(`DELETE FROM ${t}`);
        }
      }

      const memberId = (name: string): number | null => {
        const r = db.getFirstSync<{ id: number }>("SELECT id FROM team_members WHERE LOWER(name)=LOWER(?) AND deleted_at IS NULL LIMIT 1", [name]);
        return r?.id ?? null;
      };

      // Team
      for (const m of n.team) {
        const existing = memberId(m.name);
        if (existing) { skipped.team++; continue; }
        db.runSync("INSERT INTO team_members (name, position, has_target, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          [m.name, m.position, m.has_target, m.active, m.created_at, ts]);
        added.team++;
      }

      // Products
      for (const p of n.products) {
        const r = db.getFirstSync<{ id: number }>("SELECT id FROM products WHERE LOWER(name)=LOWER(?) AND type=? AND deleted_at IS NULL LIMIT 1", [p.name, p.type]);
        if (r) { skipped.products++; continue; }
        db.runSync("INSERT INTO products (type, name, sessions, price, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [p.type, p.name, p.sessions, p.price, p.active, p.created_at, ts]);
        added.products++;
      }

      // Monthly targets (new format)
      for (const t of n.monthlyTargets) {
        db.runSync("INSERT INTO monthly_targets (year, month, academy_target, dues_target, private_target, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(year,month) DO UPDATE SET academy_target=excluded.academy_target, dues_target=excluded.dues_target, private_target=excluded.private_target, updated_at=excluded.updated_at",
          [t.year, t.month, t.academy_target, t.dues_target, t.private_target, ts, ts]);
        added.targets++;
      }

      // Legacy targets
      for (const t of n.legacyTargets) {
        db.runSync("INSERT INTO legacy_personal_targets (advisor_name, revenue_target, unit_target, private_target, month, year, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [t.advisor_name, t.revenue_target, t.unit_target, t.private_target, t.month, t.year, ts]);
        added.legacy++;
      }

      // Closings
      for (const c of n.closings) {
        const dup = db.getFirstSync<{ c: number }>("SELECT COUNT(*) c FROM closing_transactions WHERE date=? AND created_at=?", [c.date, c.created_at]);
        if ((dup?.c ?? 0) > 0) { skipped.closings++; continue; }
        const aid = memberId(c.advisor_name);
        if (!aid) { skipped.closings++; continue; }
        const res = db.runSync("INSERT INTO closing_transactions (date, time, timestamp, advisor_id, type, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [c.date, c.time, c.timestamp, aid, c.type, c.notes, c.created_at, c.updated_at]);
        const cid = res.lastInsertRowId as number;
        for (const it of c.items) {
          const gross = Math.round(it.unit_price * it.quantity);
          const spct = STATUS_PCT[it.status];
          db.runSync("INSERT INTO closing_items (closing_id, kind, product_id, product_name, sessions, unit_price, quantity, status, status_pct, gross_revenue, achievement_revenue) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)",
            [cid, it.kind, it.product_name, it.sessions, it.unit_price, it.quantity, it.status, spct, gross, Math.round(gross * spct)]);
        }
        added.closings++;
      }

      // Production (unique date+advisor)
      for (const p of n.production) {
        const aid = memberId(p.advisor_name);
        if (!aid) { skipped.production++; continue; }
        const existing = db.getFirstSync<{ id: number }>("SELECT id FROM daily_production WHERE date=? AND advisor_id=?", [p.date, aid]);
        if (existing) {
          if (mode === "merge") { skipped.production++; continue; }
        }
        db.runSync("INSERT INTO daily_production (date, advisor_id, leads, appointment, show, interview, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(date,advisor_id) DO UPDATE SET leads=excluded.leads, appointment=excluded.appointment, show=excluded.show, interview=excluded.interview, updated_at=excluded.updated_at, deleted_at=NULL",
          [p.date, aid, p.leads, p.appointment, p.show, p.interview, p.created_at, p.updated_at]);
        added.production++;
      }

      // COED
      for (const c of n.coed) {
        const dup = db.getFirstSync<{ c: number }>("SELECT COUNT(*) c FROM coed_entries WHERE date=? AND category=? AND amount=?", [c.date, c.category, c.amount]);
        if ((dup?.c ?? 0) > 0) { skipped.coed++; continue; }
        db.runSync("INSERT INTO coed_entries (date, category, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", [c.date, c.category, c.amount, c.created_at, ts]);
        added.coed++;
      }

      // Cancellations
      for (const c of n.cancellations) {
        const aid = memberId(c.advisor_name);
        if (!aid) { skipped.cancellations++; continue; }
        const dup = db.getFirstSync<{ c: number }>("SELECT COUNT(*) c FROM cancellation_entries WHERE date=? AND advisor_id=? AND created_at=?", [c.date, aid, c.created_at]);
        if ((dup?.c ?? 0) > 0) { skipped.cancellations++; continue; }
        db.runSync("INSERT INTO cancellation_entries (date, advisor_id, qty, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", [c.date, aid, c.qty, c.created_at, ts]);
        added.cancellations++;
      }

      // WhatsApp manual inputs
      for (const w of n.whatsapp) {
        db.runSync("INSERT INTO whatsapp_reports (date, free_trial, appt_tomorrow, appt_day_after, collection_appt, collection_show, report_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(date) DO UPDATE SET free_trial=excluded.free_trial, appt_tomorrow=excluded.appt_tomorrow, appt_day_after=excluded.appt_day_after, collection_appt=excluded.collection_appt, collection_show=excluded.collection_show, report_time=excluded.report_time, updated_at=excluded.updated_at",
          [w.date, w.free_trial || 0, w.appt_tomorrow || 0, w.appt_day_after || 0, w.collection_appt || 0, w.collection_show || 0, w.report_time || "9PM", w.created_at || ts, ts]);
        added.whatsapp++;
      }

      // Settings
      for (const s of n.settings) {
        if (s.key === "logo_uri") continue; // stale file path from old device
        db.runSync("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [s.key, s.value]);
        added.settings++;
      }
    });

    addImportLog(n.format, mode, JSON.stringify({ added, skipped }));
    return { ok: true, added, skipped };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e), added, skipped };
  }
}
