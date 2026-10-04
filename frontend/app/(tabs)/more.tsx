import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CaretRight, ChatText, Cube, Database, FileText, Gear, Target, UsersThree, XCircle, Wallet,
} from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Card, Screen } from "@/src/components/ui";

interface Item { label: string; sub: string; route: string; icon: React.ReactNode; testID: string }

export default function MoreScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const ic = (El: any) => <El size={22} color={colors.brandPrimary} weight="fill" />;

  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Management",
      items: [
        { label: "Targets", sub: "Target akademi, dues & private per bulan", route: "/targets", icon: ic(Target), testID: "nav-targets" },
        { label: "Products", sub: "Kelola produk dues & private", route: "/products", icon: ic(Cube), testID: "nav-products" },
        { label: "Team", sub: "Anggota team & status aktif", route: "/team", icon: ic(UsersThree), testID: "nav-team" },
      ],
    },
    {
      title: "Finance",
      items: [
        { label: "COED", sub: "HO Autopay, Advance, Collection", route: "/coed", icon: ic(Wallet), testID: "nav-coed" },
        { label: "Cancellation", sub: "Catatan pembatalan per anggota", route: "/cancellation", icon: ic(XCircle), testID: "nav-cancellation" },
      ],
    },
    {
      title: "Reports",
      items: [
        { label: "Reports", sub: "MTD report, export PDF & Excel", route: "/reports", icon: ic(FileText), testID: "nav-reports" },
        { label: "WhatsApp Report", sub: "Laporan harian siap copy", route: "/whatsapp", icon: ic(ChatText), testID: "nav-whatsapp" },
      ],
    },
    {
      title: "Data & Pengaturan",
      items: [
        { label: "Import / Export", sub: "Backup & restore database JSON", route: "/data", icon: ic(Database), testID: "nav-data" },
        { label: "Settings", sub: "Tema, logo & info aplikasi", route: "/settings", icon: ic(Gear), testID: "nav-settings" },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader title="Lainnya" subtitle="Manajemen & laporan" />
      <Screen scroll>
        {groups.map((g) => (
          <View key={g.title} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.groupTitle}>{g.title}</Text>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {g.items.map((it, idx) => (
                <Pressable
                  key={it.route}
                  testID={it.testID}
                  onPress={() => router.push(it.route as any)}
                  style={({ pressed }) => [styles.row, idx < g.items.length - 1 && styles.rowBorder, pressed && { opacity: 0.6 }]}
                >
                  <View style={styles.iconWrap}>{it.icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{it.label}</Text>
                    <Text style={styles.rowSub}>{it.sub}</Text>
                  </View>
                  <CaretRight size={18} color={colors.muted} />
                </Pressable>
              ))}
            </Card>
          </View>
        ))}
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  groupTitle: { color: c.muted, fontFamily: fonts.semibold, fontSize: fontSize.sm, marginBottom: spacing.sm, marginLeft: spacing.xs, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  rowPressable: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 },
  iconWrap: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowLabel: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.lg },
  rowSub: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.sm, marginTop: 2 },
}));
