import { getDb } from "@/src/db/database";
import { activeTeam, getTarget, listTeam } from "@/src/db/repo";
import { daysInMonth, elapsedDays } from "@/src/lib/date";
import { pct } from "@/src/lib/format";
import { CoedCategory } from "@/src/db/types";

const db = () => getDb();

export interface SalesAgg {
  duesGross: number;
  duesAch: number;
  duesUnit: number;
  privGross: number;
  privAch: number;
  totalGross: number;
  totalAch: number;
}

const EMPTY_SALES: SalesAgg = {
  duesGross: 0, duesAch: 0, duesUnit: 0, privGross: 0, privAch: 0, totalGross: 0, totalAch: 0,
};

export interface ProductionAgg {
  leads: number;
  appointment: number;
  show: number;
  interview: number;
}

function mm(month: number) {
  return String(month).padStart(2, "0");
}

export function salesAgg(year: number, month: number, advisorId?: number, upToDate?: string): SalesAgg {
  const conds = ["c.deleted_at IS NULL", "strftime('%Y',c.date)=?", "strftime('%m',c.date)=?"];
  const args: any[] = [String(year), mm(month)];
  if (advisorId) { conds.push("c.advisor_id=?"); args.push(advisorId); }
  if (upToDate) { conds.push("c.date<=?"); args.push(upToDate); }
  const r = db().getFirstSync<any>(
    `SELECT
      COALESCE(SUM(CASE WHEN i.kind='DUES' THEN i.gross_revenue ELSE 0 END),0) duesGross,
      COALESCE(SUM(CASE WHEN i.kind='DUES' THEN i.achievement_revenue ELSE 0 END),0) duesAch,
      COALESCE(SUM(CASE WHEN i.kind='DUES' THEN i.quantity ELSE 0 END),0) duesUnit,
      COALESCE(SUM(CASE WHEN i.kind='PRIVATE' THEN i.gross_revenue ELSE 0 END),0) privGross,
      COALESCE(SUM(CASE WHEN i.kind='PRIVATE' THEN i.achievement_revenue ELSE 0 END),0) privAch
     FROM closing_items i JOIN closing_transactions c ON c.id=i.closing_id
     WHERE ${conds.join(" AND ")}`,
    args,
  );
  const duesGross = r?.duesGross ?? 0;
  const duesAch = r?.duesAch ?? 0;
  const privGross = r?.privGross ?? 0;
  const privAch = r?.privAch ?? 0;
  return {
    duesGross, duesAch, duesUnit: r?.duesUnit ?? 0, privGross, privAch,
    totalGross: duesGross + privGross,
    totalAch: duesAch + privAch,
  };
}

export function productionAgg(year: number, month: number, advisorId?: number, upToDate?: string): ProductionAgg {
  const conds = ["deleted_at IS NULL", "strftime('%Y',date)=?", "strftime('%m',date)=?"];
  const args: any[] = [String(year), mm(month)];
  if (advisorId) { conds.push("advisor_id=?"); args.push(advisorId); }
  if (upToDate) { conds.push("date<=?"); args.push(upToDate); }
  const r = db().getFirstSync<any>(
    `SELECT COALESCE(SUM(leads),0) leads, COALESCE(SUM(appointment),0) appointment,
     COALESCE(SUM(show),0) show, COALESCE(SUM(interview),0) interview
     FROM daily_production WHERE ${conds.join(" AND ")}`,
    args,
  );
  return { leads: r?.leads ?? 0, appointment: r?.appointment ?? 0, show: r?.show ?? 0, interview: r?.interview ?? 0 };
}

export function productionForDay(date: string): ProductionAgg {
  const r = db().getFirstSync<any>(
    `SELECT COALESCE(SUM(leads),0) leads, COALESCE(SUM(appointment),0) appointment,
     COALESCE(SUM(show),0) show, COALESCE(SUM(interview),0) interview
     FROM daily_production WHERE deleted_at IS NULL AND date=?`,
    [date],
  );
  return { leads: r?.leads ?? 0, appointment: r?.appointment ?? 0, show: r?.show ?? 0, interview: r?.interview ?? 0 };
}

export function salesUnitForDay(date: string): number {
  const r = db().getFirstSync<{ u: number }>(
    `SELECT COALESCE(SUM(i.quantity),0) u FROM closing_items i JOIN closing_transactions c ON c.id=i.closing_id
     WHERE c.deleted_at IS NULL AND i.kind='DUES' AND c.date=?`,
    [date],
  );
  return r?.u ?? 0;
}

export function cancellationCount(year: number, month: number, advisorId?: number, exactDate?: string): number {
  const conds = ["deleted_at IS NULL"];
  const args: any[] = [];
  if (exactDate) { conds.push("date=?"); args.push(exactDate); }
  else { conds.push("strftime('%Y',date)=?", "strftime('%m',date)=?"); args.push(String(year), mm(month)); }
  if (advisorId) { conds.push("advisor_id=?"); args.push(advisorId); }
  const r = db().getFirstSync<{ q: number }>(
    `SELECT COALESCE(SUM(qty),0) q FROM cancellation_entries WHERE ${conds.join(" AND ")}`,
    args,
  );
  return r?.q ?? 0;
}

export type CoedTotals = Record<CoedCategory, number> & { total: number };

export function coedTotals(year: number, month: number, exactDate?: string): CoedTotals {
  const conds = ["deleted_at IS NULL"];
  const args: any[] = [];
  if (exactDate) { conds.push("date=?"); args.push(exactDate); }
  else { conds.push("strftime('%Y',date)=?", "strftime('%m',date)=?"); args.push(String(year), mm(month)); }
  const rows = db().getAllSync<{ category: CoedCategory; s: number }>(
    `SELECT category, COALESCE(SUM(amount),0) s FROM coed_entries WHERE ${conds.join(" AND ")} GROUP BY category`,
    args,
  );
  const out: CoedTotals = { HO_AUTOPAY: 0, ADVANCE_PAYMENT: 0, ADVANCE_FREEZE: 0, COLLECTION: 0, total: 0 };
  for (const r of rows) {
    out[r.category] = r.s;
    out.total += r.s;
  }
  return out;
}

/* ----------------------------- FUNNEL ----------------------------- */

export interface Funnel {
  leads: number;
  appointment: number;
  show: number;
  interview: number;
  duesUnit: number;
  apptConv: number | null; // appt/leads
  showRate: number | null; // show/appt
  closeRate: number | null; // duesUnit/interview
  leadsConv: number | null; // duesUnit/leads
}

export function funnel(year: number, month: number, advisorId?: number): Funnel {
  const p = productionAgg(year, month, advisorId);
  const s = salesAgg(year, month, advisorId);
  return {
    leads: p.leads,
    appointment: p.appointment,
    show: p.show,
    interview: p.interview,
    duesUnit: s.duesUnit,
    apptConv: pct(p.appointment, p.leads),
    showRate: pct(p.show, p.appointment),
    closeRate: pct(s.duesUnit, p.interview),
    leadsConv: pct(s.duesUnit, p.leads),
  };
}

/* ----------------------------- PROJECTION ----------------------------- */

// Projection = valueToDate / elapsedDay * daysInMonth.
export function project(valueToDate: number, year: number, month: number, asOfDay?: number): number {
  const dim = daysInMonth(year, month);
  const day = asOfDay ?? elapsedDays(year, month);
  if (day <= 0) return 0;
  return Math.round((valueToDate / day) * dim);
}

/* ----------------------------- TARGETS & DIVISION ----------------------------- */

export function membersWithTargetCount(): number {
  return activeTeam().filter((m) => m.has_target === 1).length;
}

export interface TargetInfo {
  academy: number;
  dues: number;
  private: number;
  personal: number; // academy / count
  targetCount: number;
}

export function targetInfo(year: number, month: number): TargetInfo {
  const t = getTarget(year, month);
  const count = membersWithTargetCount();
  const academy = t?.academy_target ?? 0;
  return {
    academy,
    dues: t?.dues_target ?? 0,
    private: t?.private_target ?? 0,
    targetCount: count,
    personal: count > 0 ? Math.round(academy / count) : 0,
  };
}

/* ----------------------------- DASHBOARD SUMMARY ----------------------------- */

export interface DashboardData {
  year: number;
  month: number;
  sales: SalesAgg;
  prod: ProductionAgg;
  target: TargetInfo;
  funnel: Funnel;
  // projection (based on gross)
  projDuesGross: number;
  projDuesUnit: number;
  projPrivGross: number;
  projAcademy: number; // projection of total achievement
  // gap on dues gross
  target80: number;
  target100: number;
  remainingTo80: number;
  remainingTo100: number;
  // academy %
  academyPct: number | null;
  duesPct: number | null;
  privPct: number | null;
  remainingAcademy: number;
}

export function dashboard(year: number, month: number): DashboardData {
  const sales = salesAgg(year, month);
  const prod = productionAgg(year, month);
  const target = targetInfo(year, month);
  const f = funnel(year, month);
  const target80 = Math.round(target.dues * 0.8);
  const target100 = target.dues;
  return {
    year, month, sales, prod, target, funnel: f,
    projDuesGross: project(sales.duesGross, year, month),
    projDuesUnit: project(sales.duesUnit, year, month),
    projPrivGross: project(sales.privGross, year, month),
    projAcademy: project(sales.totalAch, year, month),
    target80, target100,
    remainingTo80: target80 - sales.duesGross,
    remainingTo100: target100 - sales.duesGross,
    academyPct: pct(sales.totalAch, target.academy),
    duesPct: pct(sales.duesGross, target.dues),
    privPct: pct(sales.privGross, target.private),
    remainingAcademy: target.academy - sales.totalAch,
  };
}

/* ----------------------------- PER MEMBER ----------------------------- */

export interface MemberSummary {
  id: number;
  name: string;
  position: string;
  hasTarget: boolean;
  active: boolean;
  sales: SalesAgg;
  prod: ProductionAgg;
  personalTarget: number;
  achPct: number | null;
  projGross: number;
  remaining: number;
}

export function memberSummaries(year: number, month: number): MemberSummary[] {
  const team = listTeam(true);
  const info = targetInfo(year, month);
  return team.map((m) => {
    const sales = salesAgg(year, month, m.id);
    const prod = productionAgg(year, month, m.id);
    const hasTarget = m.has_target === 1;
    const personalTarget = hasTarget ? info.personal : 0;
    return {
      id: m.id,
      name: m.name,
      position: m.position,
      hasTarget,
      active: m.active === 1,
      sales,
      prod,
      personalTarget,
      achPct: hasTarget ? pct(sales.totalAch, personalTarget) : null,
      projGross: project(sales.totalGross, year, month),
      remaining: personalTarget - sales.totalAch,
    };
  });
}

/* ----------------------------- NEED-TO-HIT (unit requirement) ----------------------------- */

// Units needed to cover remaining gross given an average/selected product price.
export function unitsNeeded(remainingGross: number, unitPrice: number): number | null {
  if (!unitPrice || unitPrice <= 0) return null;
  if (remainingGross <= 0) return 0;
  return Math.ceil(remainingGross / unitPrice);
}
