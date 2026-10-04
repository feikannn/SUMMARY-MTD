import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardText } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Button, Card, EmptyState, Screen, SectionTitle } from "@/src/components/ui";
import { DateField, NumberField } from "@/src/components/inputs";
import { useToast } from "@/src/components/Toast";
import { getProductionForDate, listProductionHistory, ProductionRow, upsertProductionBatch } from "@/src/db/repo";
import { todayYMD, ymOf, displayDate } from "@/src/lib/date";
import { formatInt } from "@/src/lib/format";
import { useRefetchOnFocus } from "@/src/hooks";

export default function ProductionScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayYMD());
  const [rows, setRows] = useState<ProductionRow[]>([]);

  const { data, refetch } = useQuery({
    queryKey: ["production", date],
    queryFn: () => {
      const { year, month } = ymOf(date);
      return { rows: getProductionForDate(date), history: listProductionHistory(year, month) };
    },
  });
  useRefetchOnFocus(refetch);
  useEffect(() => { if (data) setRows(data.rows); }, [data]);

  const update = (advisorId: number, field: keyof ProductionRow, val: number) => {
    setRows((prev) => prev.map((r) => (r.advisor_id === advisorId ? { ...r, [field]: val } : r)));
  };

  const save = () => {
    upsertProductionBatch(date, rows.map((r) => ({
      advisor_id: r.advisor_id, leads: r.leads, appointment: r.appointment, show: r.show, interview: r.interview,
    })));
    qc.invalidateQueries({ queryKey: ["production"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    showToast("Daily production tersimpan", "success");
    refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader title="Daily Production" subtitle="Input produksi harian team" />
      <Screen scroll contentStyle={{ paddingBottom: spacing["3xl"] }}>
        <DateField label="Tanggal" value={date} onChange={setDate} testID="production-date" />

        {rows.length === 0 ? (
          <EmptyState title="Belum ada anggota aktif" message="Tambahkan anggota team di menu Team." icon={<ClipboardText size={40} color={colors.muted} />} />
        ) : (
          rows.map((r) => (
            <Card key={r.advisor_id} style={{ marginBottom: spacing.md }} testID={`production-row-${r.advisor_id}`}>
              <Text style={styles.name}>{r.advisor_name}</Text>
              <View style={styles.grid}>
                <View style={styles.cell}><NumberField label="Leads" value={r.leads} onChange={(v) => update(r.advisor_id, "leads", v)} testID={`prod-leads-${r.advisor_id}`} /></View>
                <View style={styles.cell}><NumberField label="Appointment" value={r.appointment} onChange={(v) => update(r.advisor_id, "appointment", v)} testID={`prod-appt-${r.advisor_id}`} /></View>
                <View style={styles.cell}><NumberField label="Show" value={r.show} onChange={(v) => update(r.advisor_id, "show", v)} testID={`prod-show-${r.advisor_id}`} /></View>
                <View style={styles.cell}><NumberField label="Interview" value={r.interview} onChange={(v) => update(r.advisor_id, "interview", v)} testID={`prod-interview-${r.advisor_id}`} /></View>
              </View>
            </Card>
          ))
        )}

        {rows.length > 0 && <Button title="Simpan Production" onPress={save} testID="production-save" style={{ marginTop: spacing.sm }} />}

        <SectionTitle style={{ marginTop: spacing.xl }}>Histori Bulan Ini</SectionTitle>
        {(data?.history ?? []).length === 0 ? (
          <Text style={styles.emptyHistory}>Belum ada histori produksi bulan ini.</Text>
        ) : (
          data!.history.map((h) => (
            <View key={h.id} style={styles.historyRow} testID={`history-${h.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.histName}>{h.advisor_name}</Text>
                <Text style={styles.histDate}>{displayDate(h.date)}</Text>
              </View>
              <Text style={styles.histMetrics}>L {formatInt(h.leads)} · A {formatInt(h.appointment)} · S {formatInt(h.show)} · I {formatInt(h.interview)}</Text>
            </View>
          ))
        )}
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  name: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg, marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  cell: { width: "48%" },
  emptyHistory: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.base, paddingVertical: spacing.md },
  historyRow: { flexDirection: "row", alignItems: "center", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.md, marginBottom: spacing.sm },
  histName: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.base },
  histDate: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
  histMetrics: { color: c.onSurfaceTertiary, fontFamily: fonts.medium, fontSize: fontSize.sm, flexShrink: 1, textAlign: "right" },
}));
