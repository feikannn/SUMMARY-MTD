import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { FileArrowDown, FilePdf, FileXls } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, spacing, useTheme } from "@/src/theme";
import { AppHeader, Button, Card, KeyValue, Screen, SectionTitle } from "@/src/components/ui";
import { DateField, MonthNavigator } from "@/src/components/inputs";
import { useToast } from "@/src/components/Toast";
import { buildReportData, exportMonthlyExcel, exportReportPdf } from "@/src/services/reportExport";
import { currentYM, monthEnd, monthStart } from "@/src/lib/date";
import { formatPercent, formatRupiah } from "@/src/lib/format";

export default function ReportsScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [{ year, month }, setYM] = useState(currentYM());
  const [start, setStart] = useState(monthStart(year, month));
  const [end, setEnd] = useState(monthEnd(year, month));
  const [busy, setBusy] = useState(false);

  useEffect(() => { setStart(monthStart(year, month)); setEnd(monthEnd(year, month)); }, [year, month]);

  const { data } = useQuery({
    queryKey: ["report", year, month, start, end],
    queryFn: () => buildReportData(year, month, start, end),
  });

  const doPdf = async () => {
    if (!data) return;
    setBusy(true);
    try { await exportReportPdf(data); showToast("PDF siap dibagikan", "success"); }
    catch (e: any) { showToast("Gagal export PDF: " + (e?.message ?? ""), "error"); }
    finally { setBusy(false); }
  };
  const doExcel = async () => {
    setBusy(true);
    try { await exportMonthlyExcel(year, month); showToast("Excel siap dibagikan", "success"); }
    catch (e: any) { showToast("Gagal export Excel: " + (e?.message ?? ""), "error"); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title="Reports" subtitle="MTD report & export" back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + spacing["3xl"] }}>
        <MonthNavigator year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}><DateField label="Dari" value={start} onChange={setStart} testID="report-start" /></View>
          <View style={{ flex: 1 }}><DateField label="Sampai" value={end} onChange={setEnd} testID="report-end" /></View>
        </View>

        {data && (
          <>
            <SectionTitle>Daily Production (Total Team)</SectionTitle>
            <Card testID="report-prod">
              <KeyValue label="Leads" value={`${data.totals.leads}`} />
              <KeyValue label="Appointment" value={`${data.totals.appointment}`} />
              <KeyValue label="Show" value={`${data.totals.show}`} />
              <KeyValue label="Interview" value={`${data.totals.interview}`} />
            </Card>

            <SectionTitle style={{ marginTop: spacing.lg }}>Sales per Anggota</SectionTitle>
            {data.members.map((m) => (
              <Card key={m.name} style={{ marginBottom: spacing.sm }} testID={`report-member-${m.name}`}>
                <View style={styles.memberHead}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberPct}>{m.hasTarget ? formatPercent(m.totalAch, m.personalTarget) : "—"}</Text>
                </View>
                <KeyValue label="Dues Unit" value={`${m.duesUnit}`} />
                <KeyValue label="Dues Gross" value={formatRupiah(m.duesGross)} />
                <KeyValue label="Dues Achievement" value={formatRupiah(m.duesAch)} />
                <KeyValue label="Private Gross" value={formatRupiah(m.privGross)} />
                <KeyValue label="Private Achievement" value={formatRupiah(m.privAch)} />
                <KeyValue label="Total Gross" value={formatRupiah(m.totalGross)} />
                <KeyValue label="Total Achievement" value={formatRupiah(m.totalAch)} />
                <KeyValue label="Target" value={m.hasTarget ? formatRupiah(m.personalTarget) : "-"} />
              </Card>
            ))}

            <SectionTitle style={{ marginTop: spacing.lg }}>Target Gap (Dues Gross)</SectionTitle>
            <Card testID="report-gap">
              <KeyValue label="Dues Gross saat ini" value={formatRupiah(data.gap.duesGross)} />
              <KeyValue label="Menuju 80%" value={data.gap.duesTarget > 0 ? formatRupiah(Math.max(0, data.gap.remainingTo80)) : "-"} />
              <KeyValue label="Menuju 100%" value={data.gap.duesTarget > 0 ? formatRupiah(Math.max(0, data.gap.remainingTo100)) : "-"} />
              <KeyValue label="Projection Dues Gross" value={formatRupiah(data.gap.projGross)} valueColor={colors.brandPrimary} />
            </Card>
          </>
        )}

        <SectionTitle style={{ marginTop: spacing.xl }}>Export</SectionTitle>
        <Button title="Export PDF (rentang terpilih)" onPress={doPdf} loading={busy} icon={<FilePdf size={20} color="#fff" weight="fill" />} testID="export-pdf" />
        <View style={{ height: spacing.sm }} />
        <Button title="Export Excel (Monthly Summary)" variant="secondary" onPress={doExcel} loading={busy} icon={<FileXls size={20} color={colors.onBrandTertiary} weight="fill" />} testID="export-excel" />
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  dateRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  memberHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  memberName: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg },
  memberPct: { color: c.brandPrimary, fontFamily: fonts.bold, fontSize: fontSize.base },
}));
