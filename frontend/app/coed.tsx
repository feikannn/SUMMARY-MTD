import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilSimple, Trash } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Button, Card, EmptyState, Fab, KeyValue, Screen, SectionTitle } from "@/src/components/ui";
import { DateField, MonthNavigator, NumberField, SelectField } from "@/src/components/inputs";
import { useToast } from "@/src/components/Toast";
import { addCoed, listCoed, softDeleteCoed, updateCoed } from "@/src/db/repo";
import { coedTotals } from "@/src/services/calc";
import { CoedCategory, COED_CATEGORIES, CoedEntry } from "@/src/db/types";
import { currentYM, displayDate, monthStart } from "@/src/lib/date";
import { formatRupiah } from "@/src/lib/format";

const catLabel = (c: CoedCategory) => COED_CATEGORIES.find((x) => x.key === c)?.label ?? c;

export default function CoedScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { confirm, showToast } = useToast();
  const qc = useQueryClient();
  const [{ year, month }, setYM] = useState(currentYM());
  const [editing, setEditing] = useState<CoedEntry | null>(null);
  const [adding, setAdding] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["coed", year, month],
    queryFn: () => ({ list: listCoed(year, month), totals: coedTotals(year, month) }),
  });

  const del = async (id: number) => {
    const ok = await confirm({ title: "Hapus entri COED?", confirmText: "Hapus", destructive: true });
    if (!ok) return;
    softDeleteCoed(id);
    qc.invalidateQueries({ queryKey: ["coed"] });
    refetch();
    showToast("Entri dihapus", "success");
  };

  const totals = data?.totals;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title="COED" subtitle="Collection & Earnings Data" back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + 90 }}>
        <MonthNavigator year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />

        <Card style={{ marginTop: spacing.lg }} testID="coed-totals">
          <SectionTitle style={{ marginTop: 0 }}>Total Bulanan</SectionTitle>
          {totals && COED_CATEGORIES.map((c) => <KeyValue key={c.key} label={c.label} value={formatRupiah(totals[c.key])} />)}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>COED Total</Text>
            <Text style={styles.grandValue}>{formatRupiah(totals?.total ?? 0)}</Text>
          </View>
        </Card>

        <SectionTitle style={{ marginTop: spacing.xl }}>Entri</SectionTitle>
        {(data?.list ?? []).length === 0 ? (
          <EmptyState title="Belum ada entri COED" message="Tekan + untuk menambah." />
        ) : (
          data!.list.map((e) => (
            <Card key={e.id} style={{ marginBottom: spacing.sm }} testID={`coed-${e.id}`}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cat}>{catLabel(e.category)}</Text>
                  <Text style={styles.date}>{displayDate(e.date)}</Text>
                </View>
                <Text style={styles.amount}>{formatRupiah(e.amount)}</Text>
                <Pressable onPress={() => setEditing(e)} style={styles.iconBtn} testID={`coed-edit-${e.id}`}><PencilSimple size={16} color={colors.brandPrimary} /></Pressable>
                <Pressable onPress={() => del(e.id)} style={styles.iconBtn} testID={`coed-delete-${e.id}`}><Trash size={16} color={colors.error} /></Pressable>
              </View>
            </Card>
          ))
        )}
      </Screen>
      <Fab onPress={() => setAdding(true)} testID="coed-add-fab" bottom={insets.bottom + 16} />

      <CoedEditor
        visible={adding || !!editing}
        entry={editing}
        defaultDate={monthStart(year, month)}
        onClose={() => { setAdding(false); setEditing(null); }}
        onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ["coed"] }); refetch(); showToast("Entri tersimpan", "success"); }}
      />
    </View>
  );
}

function CoedEditor({ visible, entry, defaultDate, onClose, onSaved }: { visible: boolean; entry: CoedEntry | null; defaultDate: string; onClose: () => void; onSaved: () => void }) {
  const styles = useStyles();
  const { showToast } = useToast();
  const [category, setCategory] = useState<CoedCategory>(entry?.category ?? "COLLECTION");
  const [date, setDate] = useState(entry?.date ?? defaultDate);
  const [amount, setAmount] = useState(entry?.amount ?? 0);

  React.useEffect(() => {
    setCategory(entry?.category ?? "COLLECTION");
    setDate(entry?.date ?? defaultDate);
    setAmount(entry?.amount ?? 0);
  }, [entry, visible, defaultDate]);

  const save = () => {
    if (amount <= 0) { showToast("Nominal harus lebih dari 0", "error"); return; }
    if (entry) updateCoed(entry.id, date, category, amount);
    else addCoed(date, category, amount);
    onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>{entry ? "Edit COED" : "COED Baru"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <SelectField label="Kategori" value={category} options={COED_CATEGORIES.map((c) => ({ label: c.label, value: c.key }))} onChange={(v) => setCategory(v as CoedCategory)} testID="coed-category" />
            <DateField label="Tanggal" value={date} onChange={setDate} testID="coed-date" />
            <NumberField label="Nominal (Rp)" value={amount} onChange={setAmount} testID="coed-amount" />
          </ScrollView>
          <View style={styles.actions}>
            <Button title="Batal" variant="ghost" onPress={onClose} style={{ flex: 1 }} testID="coed-cancel" />
            <Button title="Simpan" onPress={save} style={{ flex: 1 }} testID="coed-save" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cat: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.base },
  date: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
  amount: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.base },
  iconBtn: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceTertiary },
  grandRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.divider },
  grandLabel: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg },
  grandValue: { color: c.brandPrimary, fontFamily: fonts.bold, fontSize: fontSize.lg },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing["2xl"], maxHeight: "85%" },
  sheetTitle: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.xl, marginBottom: spacing.md },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
}));
