import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilSimple, Trash } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Button, Card, EmptyState, Fab, KeyValue, Screen, SectionTitle } from "@/src/components/ui";
import { DateField, MonthNavigator, NumberField, SelectField } from "@/src/components/inputs";
import { useToast } from "@/src/components/Toast";
import { addCancellation, listCancellation, listTeam, softDeleteCancellation, updateCancellation } from "@/src/db/repo";
import { cancellationCount } from "@/src/services/calc";
import { CancellationEntry } from "@/src/db/types";
import { currentYM, displayDate, monthStart, todayYMD } from "@/src/lib/date";
import { formatInt } from "@/src/lib/format";

export default function CancellationScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { confirm, showToast } = useToast();
  const qc = useQueryClient();
  const [{ year, month }, setYM] = useState(currentYM());
  const [advisorId, setAdvisorId] = useState<number | null>(null);
  const [editing, setEditing] = useState<(CancellationEntry & { advisor_name: string }) | null>(null);
  const [adding, setAdding] = useState(false);

  const team = useMemo(() => listTeam(true), []);

  const { data, refetch } = useQuery({
    queryKey: ["cancellation", year, month, advisorId],
    queryFn: () => {
      const list = listCancellation(year, month, advisorId ?? undefined);
      const perMember = team.map((t) => ({ name: t.name, count: cancellationCount(year, month, t.id) })).filter((x) => x.count > 0);
      return {
        list,
        today: cancellationCount(year, month, advisorId ?? undefined, todayYMD()),
        monthTotal: cancellationCount(year, month, advisorId ?? undefined),
        perMember,
      };
    },
  });

  const del = async (id: number) => {
    const ok = await confirm({ title: "Hapus cancellation?", confirmText: "Hapus", destructive: true });
    if (!ok) return;
    softDeleteCancellation(id);
    qc.invalidateQueries({ queryKey: ["cancellation"] });
    refetch();
    showToast("Dihapus", "success");
  };

  const teamOptions = [{ label: "Semua anggota", value: 0 }, ...team.map((t) => ({ label: t.name, value: t.id }))];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title="Cancellation" subtitle="Catatan pembatalan" back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + 90 }}>
        <MonthNavigator year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
        <View style={{ marginTop: spacing.md }}>
          <SelectField label="Filter Anggota" value={advisorId ?? 0} options={teamOptions} onChange={(v) => setAdvisorId(v === 0 ? null : (v as number))} testID="cancel-filter" />
        </View>

        <View style={styles.totalsRow}>
          <View style={styles.totalCard}><Text style={styles.totalValue}>{formatInt(data?.today ?? 0)}</Text><Text style={styles.totalLabel}>Hari ini</Text></View>
          <View style={styles.totalCard}><Text style={styles.totalValue}>{formatInt(data?.monthTotal ?? 0)}</Text><Text style={styles.totalLabel}>Bulan ini</Text></View>
        </View>

        {(data?.perMember ?? []).length > 0 && (
          <Card style={{ marginTop: spacing.md }} testID="cancel-permember">
            <SectionTitle style={{ marginTop: 0 }}>Per Anggota</SectionTitle>
            {data!.perMember.map((p) => <KeyValue key={p.name} label={p.name} value={`${formatInt(p.count)}`} />)}
          </Card>
        )}

        <SectionTitle style={{ marginTop: spacing.xl }}>Riwayat</SectionTitle>
        {(data?.list ?? []).length === 0 ? (
          <EmptyState title="Belum ada cancellation" message="Tekan + untuk menambah." />
        ) : (
          data!.list.map((e) => (
            <Card key={e.id} style={{ marginBottom: spacing.sm }} testID={`cancel-${e.id}`}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{e.advisor_name}</Text>
                  <Text style={styles.date}>{displayDate(e.date)}</Text>
                </View>
                <Text style={styles.qty}>{formatInt(e.qty)}×</Text>
                <Pressable onPress={() => setEditing(e)} style={styles.iconBtn} testID={`cancel-edit-${e.id}`}><PencilSimple size={16} color={colors.brandPrimary} /></Pressable>
                <Pressable onPress={() => del(e.id)} style={styles.iconBtn} testID={`cancel-delete-${e.id}`}><Trash size={16} color={colors.error} /></Pressable>
              </View>
            </Card>
          ))
        )}
      </Screen>
      <Fab onPress={() => setAdding(true)} testID="cancel-add-fab" bottom={insets.bottom + 16} />

      <CancelEditor
        visible={adding || !!editing}
        entry={editing}
        team={team}
        defaultDate={monthStart(year, month)}
        onClose={() => { setAdding(false); setEditing(null); }}
        onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ["cancellation"] }); refetch(); showToast("Tersimpan", "success"); }}
      />
    </View>
  );
}

function CancelEditor({ visible, entry, team, defaultDate, onClose, onSaved }: any) {
  const styles = useStyles();
  const { showToast } = useToast();
  const [date, setDate] = useState(entry?.date ?? defaultDate);
  const [advisorId, setAdvisorId] = useState<number | null>(entry?.advisor_id ?? team[0]?.id ?? null);
  const [qty, setQty] = useState(entry?.qty ?? 1);

  React.useEffect(() => {
    setDate(entry?.date ?? defaultDate);
    setAdvisorId(entry?.advisor_id ?? team[0]?.id ?? null);
    setQty(entry?.qty ?? 1);
  }, [entry, visible, defaultDate]);

  const save = () => {
    if (!advisorId) { showToast("Pilih anggota", "error"); return; }
    if (qty <= 0) { showToast("Jumlah minimal 1", "error"); return; }
    if (entry) updateCancellation(entry.id, date, advisorId, qty);
    else addCancellation(date, advisorId, qty);
    onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>{entry ? "Edit Cancellation" : "Cancellation Baru"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <DateField label="Tanggal" value={date} onChange={setDate} testID="cancel-date" />
            <SelectField label="Anggota" value={advisorId} options={team.map((t: any) => ({ label: t.name, value: t.id }))} onChange={(v) => setAdvisorId(v as number)} testID="cancel-advisor" />
            <NumberField label="Jumlah" value={qty} onChange={setQty} testID="cancel-qty" />
          </ScrollView>
          <View style={styles.actions}>
            <Button title="Batal" variant="ghost" onPress={onClose} style={{ flex: 1 }} testID="cancel-cancel" />
            <Button title="Simpan" onPress={save} style={{ flex: 1 }} testID="cancel-save" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  totalsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  totalCard: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg, alignItems: "center" },
  totalValue: { color: c.brandPrimary, fontFamily: fonts.bold, fontSize: fontSize["2xl"] },
  totalLabel: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.base },
  date: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
  qty: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.base },
  iconBtn: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceTertiary },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing["2xl"], maxHeight: "85%" },
  sheetTitle: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.xl, marginBottom: spacing.md },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
}));
