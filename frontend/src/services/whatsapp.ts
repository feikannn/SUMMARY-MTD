import {
  cancellationCount,
  coedTotals,
  productionForDay,
  project,
  salesAgg,
  salesUnitForDay,
  targetInfo,
} from "./calc";
import { getWaReport } from "@/src/db/repo";
import { displayDate, fromYMD } from "@/src/lib/date";
import { formatWaNumber } from "@/src/lib/format";

export function buildWhatsappReport(date: string): string {
  const d = fromYMD(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  const manual = getWaReport(date);
  const reportTime = manual?.report_time ?? "9PM";

  const dayProd = productionForDay(date);
  const dayCoed = coedTotals(year, month, date);
  const monthCoed = coedTotals(year, month);

  // Month-to-report-date Dues figures (gross based).
  const monthSales = salesAgg(year, month, undefined, date);
  const duesUnit = monthSales.duesUnit;
  const duesGross = monthSales.duesGross;
  const duesUnitProjo = project(duesUnit, year, month, day);
  const duesGrossProjo = project(duesGross, year, month, day);

  const t = targetInfo(year, month);
  const projoPct = t.dues > 0 ? `${((duesGrossProjo / t.dues) * 100).toFixed(2)}%` : "-";

  const n = (v: number) => formatWaNumber(v);

  const lines = [
    `LE ${displayDate(date)} (${reportTime})`,
    "",
    "Cancellation",
    `Cancel today: ${n(cancellationCount(year, month, undefined, date))}`,
    `Total cancel in month: ${n(cancellationCount(year, month))}`,
    "",
    "Production",
    `Appt Today: ${n(dayProd.appointment)}`,
    `Show: ${n(dayProd.show)}`,
    `Free Trial: ${n(manual?.free_trial ?? 0)}`,
    `Interview: ${n(dayProd.interview)}`,
    `Appt tomorrow: ${n(manual?.appt_tomorrow ?? 0)}`,
    `Appt the day after: ${n(manual?.appt_day_after ?? 0)}`,
    `Leads: ${n(dayProd.leads)}`,
    `Sales Dues (unit): ${n(salesUnitForDay(date))}`,
    "",
    "Collection Report",
    `Collection Appt : ${n(manual?.collection_appt ?? 0)}`,
    `Collection Show : ${n(manual?.collection_show ?? 0)}`,
    "",
    "COED",
    `HO autopay today: ${n(dayCoed.HO_AUTOPAY)}`,
    `Advance payment today: ${n(dayCoed.ADVANCE_PAYMENT)}`,
    `Advance freeze payment today: ${n(dayCoed.ADVANCE_FREEZE)}`,
    `Collection today: ${n(dayCoed.COLLECTION)}`,
    "",
    "Dues in Bank (Month)",
    `Dues Unit: ${n(duesUnit)}`,
    `Dues Unit Projo: ${n(duesUnitProjo)}`,
    `Dues$: ${n(duesGross)}`,
    `Dues$ Projo: ${n(duesGrossProjo)}(${projoPct})`,
    "",
    "COED in Bank (Month)",
    `HO autopay paid: ${n(monthCoed.HO_AUTOPAY)}`,
    `Adv payment paid: ${n(monthCoed.ADVANCE_PAYMENT)}`,
    `Adv freeze paid: ${n(monthCoed.ADVANCE_FREEZE)}`,
    `Collection paid: ${n(monthCoed.COLLECTION)}`,
    `COED total: ${n(monthCoed.total)}`,
  ];

  return lines.join("\n");
}
