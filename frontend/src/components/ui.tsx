import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CaretLeft, Plus } from "phosphor-react-native";
import * as Haptics from "expo-haptics";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { SalesStatus } from "@/src/db/types";

/* ----------------------------- Screen ----------------------------- */

export function Screen({ children, scroll, contentStyle }: { children: React.ReactNode; scroll?: boolean; contentStyle?: ViewStyle }) {
  const styles = useStyles();
  if (scroll) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[{ padding: spacing.lg, paddingBottom: spacing["3xl"] }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }
  return <View style={[styles.screen, contentStyle]}>{children}</View>;
}

/* ----------------------------- Header ----------------------------- */

export function AppHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerRow}>
        {back ? (
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="header-back" hitSlop={10}>
            <CaretLeft size={22} color={colors.onSurface} weight="bold" />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
}

/* ----------------------------- Card ----------------------------- */

export function Card({ children, style, onPress, testID }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; testID?: string }) {
  const styles = useStyles();
  if (onPress) {
    return (
      <Pressable
        onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}
        style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}
        testID={testID}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]} testID={testID}>{children}</View>;
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const styles = useStyles();
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

/* ----------------------------- Progress ----------------------------- */

export function ProgressBar({ value, color }: { value: number | null; color?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const clamped = value == null ? 0 : Math.max(0, Math.min(100, value));
  const barColor = color ?? (clamped >= 100 ? colors.success : colors.accent);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: barColor }]} />
    </View>
  );
}

/* ----------------------------- StatCard ----------------------------- */

export function StatCard({
  label,
  value,
  sub,
  progress,
  accent,
  testID,
  style,
}: {
  label: string;
  value: string;
  sub?: string;
  progress?: number | null;
  accent?: boolean;
  testID?: string;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.statCard, style]} testID={testID}>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statValueAccent]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      {!!sub && <Text style={styles.statSub} numberOfLines={1}>{sub}</Text>}
      {progress !== undefined && <View style={{ marginTop: spacing.sm }}><ProgressBar value={progress} /></View>}
    </View>
  );
}

/* ----------------------------- Status Pill ----------------------------- */

export function StatusPill({ status }: { status: SalesStatus }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const map: Record<SalesStatus, { bg: string; fg: string }> = {
    Actual: { bg: colors.success, fg: colors.onSuccess },
    Delay: { bg: colors.warning, fg: colors.onWarning },
    Decom: { bg: colors.error, fg: colors.onError },
  };
  const c = map[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{status}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress, testID }: { label: string; active?: boolean; onPress?: () => void; testID?: string }) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} testID={testID}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/* ----------------------------- Button ----------------------------- */

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  testID,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  testID?: string;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg =
    variant === "primary" ? colors.brandPrimary :
    variant === "danger" ? colors.error :
    variant === "secondary" ? colors.brandTertiary : "transparent";
  const fg =
    variant === "primary" || variant === "danger" ? "#FFFFFF" :
    variant === "secondary" ? colors.onBrandTertiary : colors.brandPrimary;
  return (
    <Pressable
      onPress={() => { if (!disabled && !loading) { Haptics.selectionAsync().catch(() => {}); onPress(); } }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === "ghost" && { backgroundColor: "transparent" },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
        style,
      ]}
      disabled={disabled || loading}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ----------------------------- FAB ----------------------------- */

export function Fab({ onPress, testID, bottom }: { onPress: () => void; testID?: string; bottom: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] }]}
      testID={testID}
    >
      <Plus size={26} color={colors.onBrandPrimary} weight="bold" />
    </Pressable>
  );
}

/* ----------------------------- States ----------------------------- */

export function LoadingState() {
  const { colors } = useTheme();
  return (
    <View style={{ padding: spacing["3xl"], alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.brandPrimary} />
    </View>
  );
}

export function EmptyState({ title, message, icon }: { title: string; message?: string; icon?: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!message && <Text style={styles.emptyMsg}>{message}</Text>}
    </View>
  );
}

export function KeyValue({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: {
    backgroundColor: c.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  backBtn: { width: 34, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceTertiary },
  headerTitle: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize["2xl"] },
  headerSubtitle: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  sectionTitle: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg, marginBottom: spacing.md, marginTop: spacing.sm },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: radius.pill },
  statCard: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  statLabel: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, minHeight: 30 },
  statValue: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.xl, marginTop: 2 },
  statValueAccent: { color: c.brandPrimary },
  statSub: { color: c.onSurfaceTertiary, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  pillText: { fontFamily: fonts.semibold, fontSize: fontSize.sm },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { color: c.onSurfaceTertiary, fontFamily: fonts.semibold, fontSize: fontSize.base },
  chipTextActive: { color: c.onBrandPrimary },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: fontSize.lg },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  empty: { padding: spacing["3xl"], alignItems: "center", gap: spacing.sm },
  emptyTitle: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.lg, textAlign: "center", marginTop: spacing.sm },
  emptyMsg: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.base, textAlign: "center", lineHeight: 20 },
  kv: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs, gap: spacing.md },
  kvLabel: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.base, flexShrink: 1 },
  kvValue: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.base, textAlign: "right" },
}));
