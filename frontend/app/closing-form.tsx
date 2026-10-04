import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Button, Card, Screen } from "@/src/components/ui";
import { DateField, NumberField, SelectField, Stepper, TextField, TimeField } from "@/src/components/inputs";
import { useToast } from "@/src/components/Toast";
import {
  ClosingItemInput, ClosingType, createClosing, getClosing, listProducts, listTeam, SalesStatus, updateClosing,
} from "@/src/db/repo";
import { STATUS_PCT, SALES_STATUS } from "@/src/db/types";
import { toHM, todayYMD } from "@/src/lib/date";
import { formatRupiah } from "@/src/lib/format";

type Item = ClosingItemInput & { key: string };

function newKey() { return Math.random().toString(36).slice(2); }

export default function ClosingForm() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? parseInt(params.id, 10) : null;

  const team = useMemo(() => listTeam(true), []);
  const duesProducts = useMemo(() => listProducts(false, "DUES"), []);

  const existing = useMemo(() => (editId ? getClosing(editId) : null), [editId]);

  const [advisorId, setAdvisorId] = useState<number | null>(existing?.advisor_id ?? team[0]?.id ?? null);
  const [date, setDate] = useState(existing?.date ?? todayYMD());
  const [time, setTime] = useState(existing?.time ?? toHM(new Date()));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [items, setItems] = useState<Item[]>(
    existing
      ? existing.items.map((i) => ({
          key: newKey(), kind: i.kind, product_id: i.product_id, product_name: i.product_name,
          sessions: i.sessions, unit_price: i.unit_price, quantity: i.quantity, status: i.status,
        }))
      : [],
  );

  const addDues = () => {
    const p = duesProducts[0];
    setItems((prev) => [...prev, { key: newKey(), kind: "DUES", product_id: p?.id ?? null, product_name: p?.name ?? "Dues", sessions: null, unit_price: p?.price ?? 0, quantity: 1, status: "Actual" }]);
  };
  const addPrivate = () => {
    setItems((prev) => [...prev, { key: newKey(), kind: "PRIVATE", product_id: null, product_name: "Private", sessions: 1, unit_price: 0, quantity: 1, status: "Actual" }]);
  };
  const updateItem = (key: string, patch: Partial<Item>) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const removeItem = (key: string) => setItems((prev) => prev.filter((it) => it.key !== key));

  const derivedType = (): ClosingType => {
    const hasD = items.some((i) => i.kind === "DUES");
    const hasP = items.some((i) => i.kind === "PRIVATE");
    if (hasD && hasP) return "DUES_PRIVATE";
    if (hasP) return "PRIVATE";
    return "DUES";
  };

  const totalGross = items.reduce((a, i) => a + i.unit_price * i.quantity, 0);
  const totalAch = items.reduce((a, i) => a + Math.round(i.unit_price * i.quantity * STATUS_PCT[i.status]), 0);

  const save = () => {
    if (!advisorId) { showToast("Pilih SA terlebih dahulu", "error"); return; }
    if (items.length === 0) { showToast("Tambahkan minimal satu item", "error"); return; }
    const payload = {
      date, time, advisor_id: advisorId, type: derivedType(), notes: notes || null,
      items: items.map(({ key, ...rest }) => rest),
    };
    if (editId) updateClosing(editId, payload);
    else createClosing(payload);
    qc.invalidateQueries({ queryKey: ["closings"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    showToast(editId ? "Closing diperbarui" : "Closing tersimpan", "success");
    router.back();
  };

  const statusOptions = SALES_STATUS.map((s) => ({ label: `${s} (${STATUS_PCT[s] * 100}%)`, value: s }));
  const productOptions = duesProducts.map((p) => ({ label: p.name, value: p.id, sub: formatRupiah(p.price) }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title={editId ? "Edit Closing" : "Closing Baru"} back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + spacing["3xl"] }}>
        <SelectField label="SA" value={advisorId} options={team.map((t) => ({ label: `${t.name} · ${t.position}`, value: t.id }))} onChange={setAdvisorId} testID="form-sa" />
        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}><DateField label="Tanggal" value={date} onChange={setDate} testID="form-date" /></View>
          <View style={{ width: 120 }}><TimeField label="Waktu" value={time} onChange={setTime} testID="form-time" /></View>
        </View>

        <Text style={styles.sectionLabel}>Item Closing</Text>
        {items.map((it, idx) => (
          <Card key={it.key} style={{ marginBottom: spacing.md }} testID={`item-${idx}`}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemKind}>{it.kind === "DUES" ? "Dues" : "Private"}</Text>
              <Pressable onPress={() => removeItem(it.key)} testID={`item-remove-${idx}`}><Trash size={18} color={colors.error} /></Pressable>
            </View>
            {it.kind === "DUES" ? (
              <SelectField
                label="Produk"
                value={it.product_id}
                options={productOptions}
                onChange={(pid) => {
                  const p = duesProducts.find((x) => x.id === pid);
                  updateItem(it.key, { product_id: pid as number, product_name: p?.name ?? "", unit_price: p?.price ?? it.unit_price });
                }}
                testID={`item-product-${idx}`}
              />
            ) : (
              <>
                <TextField label="Nama Private" value={it.product_name} onChangeText={(t) => updateItem(it.key, { product_name: t })} testID={`item-privname-${idx}`} />
                <NumberField label="Sesi" value={it.sessions ?? 0} onChange={(v) => updateItem(it.key, { sessions: v })} testID={`item-sessions-${idx}`} />
              </>
            )}
            <NumberField label="Harga / Unit (Rp)" value={it.unit_price} onChange={(v) => updateItem(it.key, { unit_price: v })} testID={`item-price-${idx}`} />
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniLabel}>Qty</Text>
                <Stepper value={it.quantity} onChange={(v) => updateItem(it.key, { quantity: Math.max(1, v) })} testID={`item-qty-${idx}`} />
              </View>
              <View style={{ flex: 2 }}>
                <SelectField label="Status" value={it.status} options={statusOptions} onChange={(s) => updateItem(it.key, { status: s as SalesStatus })} testID={`item-status-${idx}`} />
              </View>
            </View>
            <View style={styles.itemTotals}>
              <Text style={styles.itemTotalText}>Gross {formatRupiah(it.unit_price * it.quantity)}</Text>
              <Text style={styles.itemAchText}>Ach {formatRupiah(Math.round(it.unit_price * it.quantity * STATUS_PCT[it.status]))}</Text>
            </View>
          </Card>
        ))}

        <View style={styles.addRow}>
          <Button title="Dues" variant="secondary" onPress={addDues} icon={<Plus size={18} color={colors.onBrandTertiary} weight="bold" />} testID="add-dues" style={{ flex: 1 }} />
          <Button title="Private" variant="secondary" onPress={addPrivate} icon={<Plus size={18} color={colors.onBrandTertiary} weight="bold" />} testID="add-private" style={{ flex: 1 }} />
        </View>

        <TextField label="Catatan (opsional)" value={notes} onChangeText={setNotes} multiline testID="form-notes" />

        <Card style={styles.grand} testID="form-total">
          <View style={styles.grandRow}><Text style={styles.grandLabel}>Total Gross Revenue</Text><Text style={styles.grandValue}>{formatRupiah(totalGross)}</Text></View>
          <View style={styles.grandRow}><Text style={styles.grandLabel}>Total Achievement</Text><Text style={[styles.grandValue, { color: colors.brandPrimary }]}>{formatRupiah(totalAch)}</Text></View>
        </Card>

        <Button title={editId ? "Simpan Perubahan" : "Simpan Closing"} onPress={save} testID="form-save" style={{ marginTop: spacing.md }} />
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  rowFields: { flexDirection: "row", gap: spacing.md },
  sectionLabel: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg, marginTop: spacing.sm, marginBottom: spacing.md },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  itemKind: { color: c.brandPrimary, fontFamily: fonts.bold, fontSize: fontSize.base, backgroundColor: c.brandTertiary, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, overflow: "hidden" },
  miniLabel: { color: c.onSurfaceTertiary, fontFamily: fonts.semibold, fontSize: fontSize.sm, marginBottom: spacing.xs },
  itemTotals: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.divider },
  itemTotalText: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.base },
  itemAchText: { color: c.brandPrimary, fontFamily: fonts.semibold, fontSize: fontSize.base },
  addRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  grand: { marginTop: spacing.md },
  grandRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  grandLabel: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.base },
  grandValue: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg },
}));
