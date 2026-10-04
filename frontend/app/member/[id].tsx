import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { fonts, fontSize, makeStyles, spacing, useTheme } from "@/src/theme";
import { AppHeader, Card, KeyValue, ProgressBar, Screen, SectionTitle, StatusPill } from "@/src/components/ui";
import { getMember, listClosings } from "@/src/db/repo";
import { memberSummaries } from "@/src/services/calc";
import { currentYM, displayDateTime, monthLabel } from "@/src/lib/date";
import { formatPercent, formatRupiah } from "@/src/lib/format";

export default function MemberDetail() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string; year?: string; month?: string }>();
  const id = parseInt(params.id, 10);
  const def = currentYM();
  const year = params.year ? parseInt(params.year, 10) : def.year;
  const month = params.month ? parseInt(params.month, 10) : def.month;

  const member = useMemo(() => getMember(id), [id]);
  const summary = useMemo(() => memberSummaries(year, month).find((m) => m.id === id), [id, year, month]);
  const closings = useMemo(() => listClosings(year, month, id), [id, year, month]);

  if (!member || !summary) {
    return <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}><AppHeader title="Detail" back /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title={member.name} subtitle={`${member.position} · ${monthLabel(year, month)}`} back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + spacing["3xl"] }}>
        {summary.hasTarget && (
          <Card testID="member-achievement">
            <Text style={styles.cardLabel}>Achievement</Text>
            <Text style={styles.big}>{formatRupiah(summary.sales.totalAch)}</Text>
            <View style={{ marginVertical: spacing.sm }}><ProgressBar value={summary.achPct} /></View>
            <View style={styles.pctRow}>
              <Text style={styles.pct}>{summary.achPct == null ? "-" : `${summary.achPct.toFixed(1)}%`}</Text>
              <Text style={styles.target}>Target {formatRupiah(summary.personalTarget)}</Text>
            </View>
          </Card>
        )}

        <SectionTitle style={{ marginTop: spacing.lg }}>Sales</SectionTitle>
        <Card>
          <KeyValue label="Dues Unit" value={`${summary.sales.duesUnit}`} />
          <KeyValue label="Dues Gross" value={formatRupiah(summary.sales.duesGross)} />
          <KeyValue label="Dues Achievement" value={formatRupiah(summary.sales.duesAch)} />
          <KeyValue label="Private Gross" value={formatRupiah(summary.sales.privGross)} />
          <KeyValue label="Private Achievement" value={formatRupiah(summary.sales.privAch)} />
          <KeyValue label="Total Gross" value={formatRupiah(summary.sales.totalGross)} />
          <KeyValue label="Total Achievement" value={formatRupiah(summary.sales.totalAch)} valueColor={colors.brandPrimary} />
          <KeyValue label="Projection Gross" value={formatRupiah(summary.projGross)} />
          {summary.hasTarget && <KeyValue label="Sisa Target" value={formatRupiah(Math.max(0, summary.remaining))} />}
        </Card>

        <SectionTitle style={{ marginTop: spacing.lg }}>Production</SectionTitle>
        <Card>
          <KeyValue label="Leads" value={`${summary.prod.leads}`} />
          <KeyValue label="Appointment" value={`${summary.prod.appointment}`} />
          <KeyValue label="Show" value={`${summary.prod.show}`} />
          <KeyValue label="Interview" value={`${summary.prod.interview}`} />
        </Card>

        <SectionTitle style={{ marginTop: spacing.lg }}>Closing ({closings.length})</SectionTitle>
        {closings.length === 0 ? (
          <Text style={styles.empty}>Belum ada closing bulan ini.</Text>
        ) : closings.map((c) => (
          <Card key={c.id} style={{ marginBottom: spacing.sm }}>
            <View style={styles.closeTop}>
              <Text style={styles.closeDate}>{displayDateTime(c.date, c.time)}</Text>
              <Text style={styles.closeGross}>{formatRupiah(c.items.reduce((s, i) => s + i.gross_revenue, 0))}</Text>
            </View>
            {c.items.map((i) => (
              <View key={i.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>{i.product_name} × {i.quantity}</Text>
                <StatusPill status={i.status} />
              </View>
            ))}
          </Card>
        ))}
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  cardLabel: { color: c.muted, fontFamily: fonts.semibold, fontSize: fontSize.base },
  big: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize["2xl"], marginTop: spacing.xs },
  pctRow: { flexDirection: "row", justifyContent: "space-between" },
  pct: { color: c.brandPrimary, fontFamily: fonts.bold, fontSize: fontSize.lg },
  target: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.base },
  empty: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.base, paddingVertical: spacing.sm },
  closeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  closeDate: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.base },
  closeGross: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.base },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs, gap: spacing.sm },
  itemName: { color: c.onSurfaceTertiary, fontFamily: fonts.medium, fontSize: fontSize.base, flex: 1 },
}));
