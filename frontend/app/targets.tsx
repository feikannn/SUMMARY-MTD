import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { fonts, fontSize, makeStyles, spacing, useTheme } from "@/src/theme";
import { AppHeader, Button, Card, KeyValue, Screen, SectionTitle } from "@/src/components/ui";
import { MonthNavigator, NumberField } from "@/src/components/inputs";
import { useToast } from "@/src/components/Toast";
import { getTarget, listLegacyTargets, listProducts, upsertTarget } from "@/src/db/repo";
import { membersWithTargetCount } from "@/src/services/calc";
import { currentYM, monthLabel } from "@/src/lib/date";
import { formatInt, formatRupiah } from "@/src/lib/format";

export default function TargetsScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [{ year, month }, setYM] = useState(currentYM());
  const [academy, setAcademy] = useState(0);
  const [dues, setDues] = useState(0);
  const [priv, setPriv] = useState(0);

  useEffect(() => {
    const t = getTarget(year, month);
    setAcademy(t?.academy_target ?? 0);
    setDues(t?.dues_target ?? 0);
    setPriv(t?.private_target ?? 0);
  }, [year, month]);

  const count = membersWithTargetCount();
  const personal = count > 0 ? Math.round(academy / count) : 0;
  const duesProducts = useMemo(() => listProducts(false, "DUES"), []);
  const avgPrice = duesProducts.length ? Math.round(duesProducts.reduce((a, p) => a + p.price, 0) / duesProducts.length) : 0;
  const targetUnit = avgPrice > 0 ? Math.round(dues / avgPrice) : 0;
  const legacy = useMemo(() => listLegacyTargets(), []);

  const save = () => {
    upsertTarget(year, month, academy, dues, priv);
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    showToast(`Target ${monthLabel(year, month)} tersimpan`, "success");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title="Target Management" subtitle="Target per bulan" back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + spacing["3xl"] }}>
        <MonthNavigator year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />

        <Card style={{ marginTop: spacing.lg }}>
          <NumberField label="Target Akademi (team)" value={academy} onChange={setAcademy} testID="target-academy" />
          <NumberField label="Target Dues Gross Revenue" value={dues} onChange={setDues} testID="target-dues" />
          <NumberField label="Target Private Gross Revenue" value={priv} onChange={setPriv} testID="target-private" />
          <Button title="Simpan Target" onPress={save} testID="target-save" style={{ marginTop: spacing.sm }} />
        </Card>

        <SectionTitle style={{ marginTop: spacing.xl }}>Hasil Perhitungan</SectionTitle>
        <Card>
          <KeyValue label="Anggota dengan target" value={`${count} orang`} />
          <KeyValue label="Target Pribadi (per orang)" value={formatRupiah(personal)} valueColor={colors.brandPrimary} />
          <KeyValue label="Estimasi Target Unit Dues" value={avgPrice > 0 ? `${formatInt(targetUnit)} unit` : "N/A"} />
          <KeyValue label="Harga rata-rata produk Dues" value={avgPrice > 0 ? formatRupiah(avgPrice) : "-"} />
        </Card>
        <Text style={styles.note}>Target pribadi = Target Akademi ÷ jumlah anggota aktif yang memiliki target (Student Advisor + Assistant Manager). Manager tidak dihitung.</Text>

        {legacy.length > 0 && (
          <>
            <SectionTitle style={{ marginTop: spacing.xl }}>Target Lama (Import)</SectionTitle>
            <Card>
              {legacy.map((l, i) => (
                <View key={i} style={styles.legacyRow}>
                  <Text style={styles.legacyName}>{l.advisor_name}</Text>
                  <Text style={styles.legacyVal}>Rev {formatRupiah(l.revenue_target)} · {l.unit_target} unit · Priv {formatRupiah(l.private_target)}</Text>
                </View>
              ))}
            </Card>
            <Text style={styles.note}>Data target lama disimpan untuk referensi dan tidak memengaruhi perhitungan model baru.</Text>
          </>
        )}
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  note: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.sm, lineHeight: 18, marginTop: spacing.sm },
  legacyRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  legacyName: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.base },
  legacyVal: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
}));
