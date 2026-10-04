import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Receipt, Trash } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Card, EmptyState, Fab, Screen, StatusPill } from "@/src/components/ui";
import { MonthNavigator, SelectField } from "@/src/components/inputs";
import { useToast } from "@/src/components/Toast";
import { usesNativeTabs } from "@/src/navigation";
import { listClosings, listTeam, softDeleteClosing } from "@/src/db/repo";
import { currentYM, displayDateTime } from "@/src/lib/date";
import { formatRupiah } from "@/src/lib/format";
import { useRefetchOnFocus } from "@/src/hooks";

export default function ClosingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm, showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [{ year, month }, setYM] = useState(currentYM());
  const [advisorId, setAdvisorId] = useState<number | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["closings", year, month, advisorId],
    queryFn: () => ({
      list: listClosings(year, month, advisorId ?? undefined),
      team: listTeam(true),
    }),
  });
  useRefetchOnFocus(refetch);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const list = data?.list ?? [];
  const totalGross = list.reduce((a, c) => a + c.items.reduce((s, i) => s + i.gross_revenue, 0), 0);
  const totalAch = list.reduce((a, c) => a + c.items.reduce((s, i) => s + i.achievement_revenue, 0), 0);

  const onDelete = async (id: number) => {
    const ok = await confirm({ title: "Hapus closing?", message: "Closing akan dihapus (soft delete) dan tidak muncul di laporan.", confirmText: "Hapus", destructive: true });
    if (!ok) return;
    softDeleteClosing(id);
    qc.invalidateQueries({ queryKey: ["closings"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    showToast("Closing dihapus", "success");
    refetch();
  };

  const teamOptions = [{ label: "Semua SA", value: 0 }, ...(data?.team ?? []).map((t) => ({ label: t.name, value: t.id }))];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader title="Closing" subtitle="Catatan penjualan harian" />
      <Screen scroll contentStyle={{ paddingBottom: bottomChrome + 90 }}>
        <MonthNavigator year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />

        <View style={{ marginTop: spacing.md }}>
          <SelectField
            label="Filter SA"
            value={advisorId ?? 0}
            options={teamOptions}
            onChange={(v) => setAdvisorId(v === 0 ? null : (v as number))}
            testID="closing-filter-sa"
          />
        </View>

        <Card style={styles.summary} testID="closing-summary">
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Gross</Text>
            <Text style={styles.summaryValue}>{formatRupiah(totalGross)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Achievement</Text>
            <Text style={styles.summaryValue}>{formatRupiah(totalAch)}</Text>
          </View>
        </Card>

        {list.length === 0 ? (
          <EmptyState title="Belum ada closing" message="Tekan tombol + untuk mencatat closing pertama." icon={<Receipt size={40} color={colors.muted} />} />
        ) : (
          list.map((c) => (
            <Card key={c.id} style={{ marginTop: spacing.md }} onPress={() => router.push(`/closing-form?id=${c.id}`)} testID={`closing-${c.id}`}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.advisor}>{c.advisor_name}</Text>
                  <Text style={styles.date}>{displayDateTime(c.date, c.time)} · {c.type.replace("_", " + ")}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.gross}>{formatRupiah(c.items.reduce((s, i) => s + i.gross_revenue, 0))}</Text>
                  <Text style={styles.ach}>Ach {formatRupiah(c.items.reduce((s, i) => s + i.achievement_revenue, 0))}</Text>
                </View>
              </View>
              {c.items.map((i) => (
                <View key={i.id} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{i.kind === "PRIVATE" ? "🎯 " : ""}{i.product_name} × {i.quantity}</Text>
                  <StatusPill status={i.status} />
                </View>
              ))}
              <Text style={styles.deleteLink} onPress={() => onDelete(c.id)} testID={`closing-delete-${c.id}`}>
                <Trash size={12} color={colors.error} />  Hapus
              </Text>
            </Card>
          ))
        )}
      </Screen>
      <Fab onPress={() => router.push("/closing-form")} testID="closing-add-fab" bottom={bottomChrome + 16} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  summary: { flexDirection: "row", marginTop: spacing.md, alignItems: "center" },
  summaryItem: { flex: 1 },
  summaryDivider: { width: 1, height: 36, backgroundColor: c.divider, marginHorizontal: spacing.md },
  summaryLabel: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm },
  summaryValue: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg, marginTop: 2 },
  rowTop: { flexDirection: "row", alignItems: "flex-start" },
  advisor: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg },
  date: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
  gross: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg },
  ach: { color: c.brandPrimary, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm, gap: spacing.sm },
  itemName: { color: c.onSurfaceTertiary, fontFamily: fonts.medium, fontSize: fontSize.base, flex: 1 },
  deleteLink: { color: c.error, fontFamily: fonts.semibold, fontSize: fontSize.sm, marginTop: spacing.md },
}));
