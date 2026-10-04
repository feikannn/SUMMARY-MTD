import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Moon, Sun, DeviceMobile } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, setColorScheme, useTheme } from "@/src/theme";
import { AppHeader, Card, KeyValue, Screen, SectionTitle } from "@/src/components/ui";
import { getSetting, listTeam, setSetting } from "@/src/db/repo";

type ThemePref = "system" | "light" | "dark";

export default function SettingsScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [pref, setPref] = useState<ThemePref>((getSetting("theme") as ThemePref) ?? "system");
  const teamCount = listTeam(false).length;

  const apply = (p: ThemePref) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPref(p);
    setSetting("theme", p);
    setColorScheme(p === "system" ? null : p);
  };

  const options: { key: ThemePref; label: string; icon: React.ReactNode }[] = [
    { key: "system", label: "Sistem", icon: <DeviceMobile size={22} color={pref === "system" ? colors.onBrandPrimary : colors.onSurfaceTertiary} weight="fill" /> },
    { key: "light", label: "Terang", icon: <Sun size={22} color={pref === "light" ? colors.onBrandPrimary : colors.onSurfaceTertiary} weight="fill" /> },
    { key: "dark", label: "Gelap", icon: <Moon size={22} color={pref === "dark" ? colors.onBrandPrimary : colors.onSurfaceTertiary} weight="fill" /> },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title="Settings" subtitle="Tema & info aplikasi" back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + spacing["3xl"] }}>
        <SectionTitle>Tampilan</SectionTitle>
        <View style={styles.themeRow}>
          {options.map((o) => {
            const active = pref === o.key;
            return (
              <Pressable key={o.key} style={[styles.themeCard, active && styles.themeCardActive]} onPress={() => apply(o.key)} testID={`theme-${o.key}`}>
                <View style={[styles.themeIcon, active && styles.themeIconActive]}>{o.icon}</View>
                <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle style={{ marginTop: spacing.xl }}>Tentang</SectionTitle>
        <Card>
          <KeyValue label="Aplikasi" value="SA Summary" />
          <KeyValue label="Versi" value="1.0.0" />
          <KeyValue label="Database" value="SQLite lokal (offline)" />
          <KeyValue label="Anggota aktif" value={`${teamCount} orang`} />
        </Card>
        <Text style={styles.note}>Aplikasi berjalan 100% offline. Seluruh data tersimpan di perangkat dan dapat dibackup lewat menu Import / Export.</Text>
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  themeRow: { flexDirection: "row", gap: spacing.md },
  themeCard: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  themeCardActive: { borderColor: c.brandPrimary, backgroundColor: c.brandTertiary },
  themeIcon: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  themeIconActive: { backgroundColor: c.brandPrimary },
  themeLabel: { color: c.onSurfaceTertiary, fontFamily: fonts.semibold, fontSize: fontSize.base },
  themeLabelActive: { color: c.brandPrimary },
  note: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.sm, lineHeight: 18, marginTop: spacing.md },
}));
