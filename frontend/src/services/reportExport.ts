import * as Print from "expo-print";
import * as XLSX from "xlsx";

import { getDb } from "@/src/db/database";
import { listTeam, getSetting } from "@/src/db/repo";
import { project, salesAgg, targetInfo } from "./calc";
import { displayDate, fromYMD, monthLabel } from "@/src/lib/date";
import { formatRupiah, formatInt, formatPercent, pct } from "@/src/lib/format";
import { writeBase64File, shareFile } from "./fs";

const db = () => getDb();

interface MemberReport {
  name: string;
  position: string;
  hasTarget: boolean;
  leads: number; appointment: number; show: number; interview: number;
  duesUnit: number; duesGross: number; duesAch: number;
  privGross: number; privAch: number; totalGross: number; totalAch: number;
  personalTarget: number;
}

export interface ReportData {
  title: string;
  periodLabel: string;
  start: string;
  end: string;
  members: MemberReport[];
  totals: Omit<MemberReport, "name" | "position" | "hasTarget" | "personalTarget">;
  gap: {
    duesTarget: number; duesGross: number; target80: number; target100: number;
    remainingTo80: number; remainingTo100: number; projGross: number;
  };
}

export function buildReportData(year: number, month: number, start: string, end: string, title = "MTD Report"): ReportData {
  const team = listTeam(true);
  const info = targetInfo(year, month);
  const members: MemberReport[] = team.map((m) => {
    const p = db().getFirstSync<any>(
      `SELECT COALESCE(SUM(leads),0) leads, COALESCE(SUM(appointment),0) appointment, COALESCE(SUM(show),0) show, COALESCE(SUM(interview),0) interview
       FROM daily_production WHERE deleted_at IS NULL AND advisor_id=? AND date BETWEEN ? AND ?`,
      [m.id, start, end],
    );
    const s = db().getFirstSync<any>(
      `SELECT
        COALESCE(SUM(CASE WHEN i.kind='DUES' THEN i.quantity ELSE 0 END),0) duesUnit,
        COALESCE(SUM(CASE WHEN i.kind='DUES' THEN i.gross_revenue ELSE 0 END),0) duesGross,
        COALESCE(SUM(CASE WHEN i.kind='DUES' THEN i.achievement_revenue ELSE 0 END),0) duesAch,
        COALESCE(SUM(CASE WHEN i.kind='PRIVATE' THEN i.gross_revenue ELSE 0 END),0) privGross,
        COALESCE(SUM(CASE WHEN i.kind='PRIVATE' THEN i.achievement_revenue ELSE 0 END),0) privAch
       FROM closing_items i JOIN closing_transactions c ON c.id=i.closing_id
       WHERE c.deleted_at IS NULL AND c.advisor_id=? AND c.date BETWEEN ? AND ?`,
      [m.id, start, end],
    );
    const totalGross = (s?.duesGross ?? 0) + (s?.privGross ?? 0);
    const totalAch = (s?.duesAch ?? 0) + (s?.privAch ?? 0);
    return {
      name: m.name, position: m.position, hasTarget: m.has_target === 1,
      leads: p?.leads ?? 0, appointment: p?.appointment ?? 0, show: p?.show ?? 0, interview: p?.interview ?? 0,
      duesUnit: s?.duesUnit ?? 0, duesGross: s?.duesGross ?? 0, duesAch: s?.duesAch ?? 0,
      privGross: s?.privGross ?? 0, privAch: s?.privAch ?? 0, totalGross, totalAch,
      personalTarget: m.has_target === 1 ? info.personal : 0,
    };
  });

  const totals = members.reduce(
    (a, m) => ({
      leads: a.leads + m.leads, appointment: a.appointment + m.appointment, show: a.show + m.show, interview: a.interview + m.interview,
      duesUnit: a.duesUnit + m.duesUnit, duesGross: a.duesGross + m.duesGross, duesAch: a.duesAch + m.duesAch,
      privGross: a.privGross + m.privGross, privAch: a.privAch + m.privAch,
      totalGross: a.totalGross + m.totalGross, totalAch: a.totalAch + m.totalAch,
    }),
    { leads: 0, appointment: 0, show: 0, interview: 0, duesUnit: 0, duesGross: 0, duesAch: 0, privGross: 0, privAch: 0, totalGross: 0, totalAch: 0 },
  );

  // Gap: month-to-end gross, projected using day-of-end.
  const endDay = fromYMD(end).getDate();
  const monthDues = salesAgg(year, month, undefined, end).duesGross;
  const target80 = Math.round(info.dues * 0.8);
  return {
    title,
    periodLabel: `${displayDate(start)} - ${displayDate(end)} (${monthLabel(year, month)})`,
    start, end, members, totals,
    gap: {
      duesTarget: info.dues, duesGross: monthDues, target80, target100: info.dues,
      remainingTo80: target80 - monthDues, remainingTo100: info.dues - monthDues,
      projGross: project(monthDues, year, month, endDay),
    },
  };
}

/* ----------------------------- PDF ----------------------------- */

function reportHtml(data: ReportData): string {
  const logo = getSetting("logo_uri");
  const rp = (v: number) => formatRupiah(v);
  const salesRows = data.members.map((m) => `
    <tr>
      <td class="l">${m.name}<div class="sub">${m.position}</div></td>
      <td>${m.duesUnit}</td>
      <td>${rp(m.duesGross)}</td>
      <td>${rp(m.duesAch)}</td>
      <td>${rp(m.privGross)}</td>
      <td>${rp(m.privAch)}</td>
      <td>${rp(m.totalGross)}</td>
      <td>${rp(m.totalAch)}</td>
      <td>${m.hasTarget ? rp(m.personalTarget) : "-"}</td>
      <td>${m.hasTarget ? formatPercent(m.totalAch, m.personalTarget) : "-"}</td>
    </tr>`).join("");
  const prodRows = data.members.map((m) => `
    <tr><td class="l">${m.name}</td><td>${m.leads}</td><td>${m.appointment}</td><td>${m.show}</td><td>${m.interview}</td></tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    * { font-family: -apple-system, Helvetica, Arial, sans-serif; }
    body { padding: 24px; color: #111827; }
    h1 { font-size: 22px; margin: 0 0 2px; color: #2A6E4B; }
    .meta { color: #6B7280; font-size: 12px; margin-bottom: 18px; }
    h2 { font-size: 15px; margin: 22px 0 8px; border-left: 4px solid #2A6E4B; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #E5E7EB; padding: 6px 8px; text-align: right; }
    th { background: #E7F3ED; color: #2E5A44; font-weight: 600; }
    td.l, th.l { text-align: left; }
    .sub { color: #9CA3AF; font-size: 9px; }
    tfoot td { font-weight: 700; background: #F3F4F6; }
    .gap td { border: none; padding: 4px 0; text-align: left; font-size: 13px; }
    .gap .v { font-weight: 700; text-align: right; }
    img.logo { height: 44px; margin-bottom: 8px; }
  </style></head><body>
    ${logo ? `<img class="logo" src="${logo}"/>` : ""}
    <h1>SA Summary - ${data.title}</h1>
    <div class="meta">${data.periodLabel}</div>

    <h2>Daily Production</h2>
    <table>
      <thead><tr><th class="l">Team Member</th><th>Leads</th><th>Appt</th><th>Show</th><th>Interview</th></tr></thead>
      <tbody>${prodRows}</tbody>
      <tfoot><tr><td class="l">TOTAL TEAM</td><td>${data.totals.leads}</td><td>${data.totals.appointment}</td><td>${data.totals.show}</td><td>${data.totals.interview}</td></tr></tfoot>
    </table>

    <h2>Sales</h2>
    <table>
      <thead><tr><th class="l">Member</th><th>Unit</th><th>Dues Gross</th><th>Dues Ach</th><th>Priv Gross</th><th>Priv Ach</th><th>Total Gross</th><th>Total Ach</th><th>Target</th><th>Ach%</th></tr></thead>
      <tbody>${salesRows}</tbody>
      <tfoot><tr><td class="l">TOTAL TEAM</td><td>${data.totals.duesUnit}</td><td>${rp(data.totals.duesGross)}</td><td>${rp(data.totals.duesAch)}</td><td>${rp(data.totals.privGross)}</td><td>${rp(data.totals.privAch)}</td><td>${rp(data.totals.totalGross)}</td><td>${rp(data.totals.totalAch)}</td><td>-</td><td>-</td></tr></tfoot>
    </table>

    <h2>Target Gap (Dues Gross Revenue)</h2>
    <table class="gap">
      <tr><td>Target Dues Gross</td><td class="v">${rp(data.gap.duesTarget)}</td></tr>
      <tr><td>Dues Gross saat ini</td><td class="v">${rp(data.gap.duesGross)}</td></tr>
      <tr><td>Kurang menuju 80% (${rp(data.gap.target80)})</td><td class="v">${rp(Math.max(0, data.gap.remainingTo80))}</td></tr>
      <tr><td>Kurang menuju 100% (${rp(data.gap.target100)})</td><td class="v">${rp(Math.max(0, data.gap.remainingTo100))}</td></tr>
      <tr><td>Projection Dues Gross</td><td class="v">${rp(data.gap.projGross)}</td></tr>
    </table>
  </body></html>`;
}

export async function exportReportPdf(data: ReportData): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html: reportHtml(data) });
  await shareFile(uri, "application/pdf", data.title);
  return uri;
}

/* ----------------------------- EXCEL ----------------------------- */

export async function exportMonthlyExcel(year: number, month: number): Promise<string> {
  const data = buildReportData(year, month, `${year}-${String(month).padStart(2, "0")}-01`, `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`, "Monthly Closing Summary");
  const wb = XLSX.utils.book_new();

  const salesAoa = [
    ["Member", "Position", "Dues Unit", "Dues Gross", "Dues Achievement", "Private Gross", "Private Achievement", "Total Gross", "Total Achievement", "Target", "Ach %"],
    ...data.members.map((m) => [
      m.name, m.position, m.duesUnit, m.duesGross, m.duesAch, m.privGross, m.privAch, m.totalGross, m.totalAch,
      m.hasTarget ? m.personalTarget : "-", m.hasTarget ? (pct(m.totalAch, m.personalTarget)?.toFixed(1) + "%" ?? "-") : "-",
    ]),
    ["TOTAL", "", data.totals.duesUnit, data.totals.duesGross, data.totals.duesAch, data.totals.privGross, data.totals.privAch, data.totals.totalGross, data.totals.totalAch, "", ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesAoa), "Sales");

  const prodAoa = [
    ["Member", "Leads", "Appointment", "Show", "Interview"],
    ...data.members.map((m) => [m.name, m.leads, m.appointment, m.show, m.interview]),
    ["TOTAL", data.totals.leads, data.totals.appointment, data.totals.show, data.totals.interview],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prodAoa), "Production");

  const gapAoa = [
    ["Metric", "Value"],
    ["Period", data.periodLabel],
    ["Target Dues Gross", data.gap.duesTarget],
    ["Dues Gross Current", data.gap.duesGross],
    ["Target 80%", data.gap.target80],
    ["Remaining to 80%", Math.max(0, data.gap.remainingTo80)],
    ["Remaining to 100%", Math.max(0, data.gap.remainingTo100)],
    ["Projection Dues Gross", data.gap.projGross],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gapAoa), "Target Gap");

  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const file = writeBase64File(`sa_summary_${year}-${String(month).padStart(2, "0")}.xlsx`, base64);
  await shareFile(file.uri, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Monthly Summary Excel");
  return file.uri;
}

export { formatInt };
