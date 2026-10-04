import React from "react";
import { Text, View } from "react-native";
import { ArrowDown } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { Funnel as FunnelData } from "@/src/services/calc";
import { formatInt } from "@/src/lib/format";

function pctLabel(v: number | null): string {
  return v == null ? "-" : `${v.toFixed(1)}%`;
}

export function FunnelView({ data }: { data: FunnelData }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const max = Math.max(data.leads, data.appointment, data.show, data.interview, data.duesUnit, 1);

  const steps = [
    { label: "Leads", value: data.leads },
    { label: "Appointment", value: data.appointment, conv: data.apptConv },
    { label: "Show", value: data.show, conv: data.showRate },
    { label: "Interview", value: data.interview },
    { label: "Dues Unit", value: data.duesUnit, conv: data.closeRate },
  ];

  return (
    <View testID="funnel-view">
      {steps.map((s, i) => {
        const width = `${Math.max(14, (s.value / max) * 100)}%` as const;
        return (
          <View key={s.label}>
            {i > 0 && (
              <View style={styles.connector}>
                <ArrowDown size={14} color={colors.muted} weight="bold" />
                {s.conv !== undefined && (
                  <View style={styles.convBadge}>
                    <Text style={styles.convText}>{pctLabel(s.conv ?? null)}</Text>
                  </View>
                )}
              </View>
            )}
            <View style={styles.barRow}>
              <View style={[styles.bar, { width }]}>
                <Text style={styles.barLabel} numberOfLines={1}>{s.label}</Text>
              </View>
              <Text style={styles.barValue}>{formatInt(s.value)}</Text>
            </View>
          </View>
        );
      })}
      <View style={styles.overallRow}>
        <Text style={styles.overallLabel}>Leads → Dues</Text>
        <Text style={styles.overallValue}>{pctLabel(data.leadsConv)}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  connector: { alignItems: "center", flexDirection: "row", justifyContent: "center", gap: spacing.sm, paddingVertical: 2 },
  convBadge: { backgroundColor: c.brandTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  convText: { color: c.onBrandTertiary, fontFamily: fonts.semibold, fontSize: fontSize.sm },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bar: {
    backgroundColor: c.brandPrimary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    minWidth: 90,
  },
  barLabel: { color: c.onBrandPrimary, fontFamily: fonts.semibold, fontSize: fontSize.base },
  barValue: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg, width: 56, textAlign: "right" },
  overallRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.divider },
  overallLabel: { color: c.onSurfaceTertiary, fontFamily: fonts.semibold, fontSize: fontSize.base },
  overallValue: { color: c.brandPrimary, fontFamily: fonts.bold, fontSize: fontSize.xl },
}));
