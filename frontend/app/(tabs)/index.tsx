import React, { useState } from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CaretRight, Target, TrendUp, Users } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Card, ProgressBar, Screen, SectionTitle, StatCard } from "@/src/components/ui";
import { MonthNavigator } from "@/src/components/inputs";
import { FunnelView } from "@/src/components/Funnel";
import { dashboard, memberSummaries, unitsNeeded } from "@/src/services/calc";
import { listProducts } from "@/src/db/repo";
import { currentYM } from "@/src/lib/date";
import { formatCompactRupiah, formatInt, formatPercent, formatRupiah } from "@/src/lib/format";
import { useRefetchOnFocus } from "@/src/hooks";

export default function DashboardScreen() {
  const [{ year, month }, setYM] = useState(currentYM());
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  const { data, refetch } = useQuery({
    queryKey: ["dashboard", year, month],
    queryFn: () => {
      const d = dashboard(year, month);
      const members = memberSummaries(year, month);
      const duesProducts = listProducts(false, "DUES");
      const avgPrice = duesProducts.length
        ? Math.round(duesProducts.reduce((a, p) => a + p.price, 0) / duesProducts.length)
        : 0;
      return { d, members, avgPrice };
    },
  });
  useRefetchOnFocus(refetch);

  if (!data) return <Screen><AppHeader title="Dashboard" /></Screen>;

  const { d, members, avgPrice } = data;
  const targetUnit = avgPrice > 0 ? Math.round(d.target.dues / avgPrice) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader title="SA Summary" subtitle="Team Performance Dashboard" />
      <Screen scroll>
        <MonthNavigator year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />

        {/* Academy KPI hero */}
        <Card style={{ marginTop: spacing.lg }} testID="kpi-academy">
          <View style={styles.heroRow}>
            <Target size={20} color={colors.brandPrimary} weight="fill" />
            <Text style={styles.heroTitle}>Target Akademi</Text>
          </View>
          <Text style={styles.heroValue}>{formatRupiah(d.sales.totalAch)}</Text>
          <Text style={styles.heroSub}>dari target {formatRupiah(d.target.academy)}</Text>
          <View style={{ marginTop: spacing.md }}>
            <ProgressBar value={d.academyPct} />
          </View>
          <View style={styles.heroFooter}>
            <Text style={styles.heroPct}>{d.academyPct == null ? "-" : `${d.academyPct.toFixed(1)}%`}</Text>
            <Text style={styles.heroRemaining}>Sisa {formatRupiah(Math.max(0, d.remainingAcademy))}</Text>
          </View>
        </Card>

        {/* Dues + Private */}
        <View style={styles.grid}>
          <StatCard testID="kpi-dues-gross" style={styles.gridItem} label="Dues Gross" value={formatCompactRupiah(d.sales.duesGross)} sub={`Target ${formatCompactRupiah(d.target.dues)}`} progress={d.duesPct} />
          <StatCard testID="kpi-dues-ach" style={styles.gridItem} label="Dues Achievement" value={formatCompactRupiah(d.sales.duesAch)} sub={d.duesPct == null ? "-" : `${d.duesPct.toFixed(0)}% gross`} />
          <StatCard testID="kpi-priv-gross" style={styles.gridItem} label="Private Gross" value={formatCompactRupiah(d.sales.privGross)} sub={`Target ${formatCompactRupiah(d.target.private)}`} progress={d.privPct} />
          <StatCard testID="kpi-priv-ach" style={styles.gridItem} label="Private Achievement" value={formatCompactRupiah(d.sales.privAch)} />
          <StatCard testID="kpi-dues-unit" style={styles.gridItem} label="Dues Unit" value={formatInt(d.sales.duesUnit)} sub={`Target ${formatInt(targetUnit)} unit`} />
          <StatCard testID="kpi-remaining" style={styles.gridItem} label="Sisa Target Gross" value={formatCompactRupiah(Math.max(0, d.remainingTo100))} accent />
        </View>

        {/* Target 80/100 */}
        <SectionTitle>Kebutuhan Target (Dues Gross)</SectionTitle>
        <Card testID="target-gap">
          <Row label="Dues Gross saat ini" value={formatRupiah(d.sales.duesGross)} />
          <Row label="Target 80%" value={formatRupiah(d.target80)} />
          <Row label="Menuju 80%" value={d.target.dues > 0 ? formatRupiah(Math.max(0, d.remainingTo80)) : "-"} accent />
          <Row label="Target 100%" value={formatRupiah(d.target100)} />
          <Row label="Menuju 100%" value={d.target.dues > 0 ? formatRupiah(Math.max(0, d.remainingTo100)) : "-"} accent />
          <Row label="Unit dibutuhkan (100%)" value={
            d.target.dues > 0 && avgPrice > 0
              ? `${formatInt(unitsNeeded(Math.max(0, d.remainingTo100), avgPrice) ?? 0)} unit`
              : "N/A"
          } />
        </Card>

        {/* Projection */}
        <SectionTitle>Projection Akhir Bulan</SectionTitle>
        <Card testID="projection">
          <View style={styles.projHeader}>
            <TrendUp size={18} color={colors.brandPrimary} weight="bold" />
            <Text style={styles.projTitle}>Berdasarkan Gross Total Revenue</Text>
          </View>
          <Row label="Dues Gross (proj)" value={formatRupiah(d.projDuesGross)} />
          <Row label="Dues Unit (proj)" value={`${formatInt(d.projDuesUnit)} unit`} />
          <Row label="Private Gross (proj)" value={formatRupiah(d.projPrivGross)} />
          <Row label="Achievement (proj)" value={formatRupiah(d.projAcademy)} />
          <Row label="Selisih vs Target Dues" value={d.target.dues > 0 ? formatRupiah(d.projDuesGross - d.target.dues) : "-"} accent />
        </Card>

        {/* Funnel */}
        <SectionTitle>Funnel Analytics</SectionTitle>
        <Card testID="funnel-card">
          <FunnelView data={d.funnel} />
        </Card>

        {/* Team cards */}
        <View style={styles.teamHeader}>
          <SectionTitle style={{ marginBottom: 0 }}>Team Achievement</SectionTitle>
          <Users size={18} color={colors.muted} />
        </View>
        {members.map((m) => (
          <Card
            key={m.id}
            testID={`member-card-${m.id}`}
            onPress={() => router.push(`/member/${m.id}?year=${year}&month=${month}`)}
            style={{ marginBottom: spacing.md }}
          >
            <View style={styles.memberTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.name}{!m.active ? "  (nonaktif)" : ""}</Text>
                <Text style={styles.memberRole}>{m.position}</Text>
              </View>
              <CaretRight size={18} color={colors.muted} />
            </View>
            {m.hasTarget ? (
              <>
                <View style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
                  <ProgressBar value={m.achPct} />
                </View>
                <View style={styles.memberMetaRow}>
                  <Text style={styles.memberPct}>{m.achPct == null ? "-" : `${m.achPct.toFixed(1)}%`}</Text>
                  <Text style={styles.memberTarget}>Target {formatCompactRupiah(m.personalTarget)}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.contribBadge}>Manager · Kontribusi team</Text>
            )}
            <View style={styles.memberStats}>
              <MiniStat label="Total Gross" value={formatCompactRupiah(m.sales.totalGross)} />
              <MiniStat label="Achievement" value={formatCompactRupiah(m.sales.totalAch)} />
              <MiniStat label="Dues Unit" value={formatInt(m.sales.duesUnit)} />
            </View>
            <View style={styles.memberStats}>
              <MiniStat label="Dues Gross" value={formatCompactRupiah(m.sales.duesGross)} />
              <MiniStat label="Private Gross" value={formatCompactRupiah(m.sales.privGross)} />
              <MiniStat label="Projection" value={formatCompactRupiah(m.projGross)} />
            </View>
          </Card>
        ))}
      </Screen>
    </View>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent && styles.rowValueAccent]}>{value}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heroTitle: { color: c.muted, fontFamily: fonts.semibold, fontSize: fontSize.base },
  heroValue: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize["3xl"], marginTop: spacing.sm },
  heroSub: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.base, marginTop: 2 },
  heroFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  heroPct: { color: c.onAccent, backgroundColor: c.accent, fontFamily: fonts.bold, fontSize: fontSize.base, paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.pill, overflow: "hidden" },
  heroRemaining: { color: c.onSurfaceTertiary, fontFamily: fonts.medium, fontSize: fontSize.base },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  gridItem: { width: "48.5%" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  rowLabel: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.base, flex: 1 },
  rowValue: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.base },
  rowValueAccent: { color: c.brandPrimary, fontFamily: fonts.bold },
  projHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  projTitle: { color: c.onSurfaceTertiary, fontFamily: fonts.semibold, fontSize: fontSize.sm },
  teamHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.lg, marginBottom: spacing.md },
  memberTop: { flexDirection: "row", alignItems: "center" },
  memberName: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg },
  memberRole: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
  memberMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  memberPct: { color: c.brandPrimary, fontFamily: fonts.bold, fontSize: fontSize.base },
  memberTarget: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm },
  contribBadge: { color: c.onBrandTertiary, backgroundColor: c.brandTertiary, alignSelf: "flex-start", paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, fontFamily: fonts.semibold, fontSize: fontSize.sm, marginTop: spacing.sm, marginBottom: spacing.sm, overflow: "hidden" },
  memberStats: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  miniStat: { flex: 1, backgroundColor: c.surfaceTertiary, borderRadius: radius.sm, padding: spacing.sm },
  miniValue: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.base },
  miniLabel: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm - 1, marginTop: 2 },
}));
