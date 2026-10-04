import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilSimple } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Button, Card, Fab, Screen } from "@/src/components/ui";
import { SelectField, TextField } from "@/src/components/inputs";
import { useToast } from "@/src/components/Toast";
import { addMember, listTeam, setMemberActive, updateMember } from "@/src/db/repo";
import { Position, POSITIONS, positionHasTarget, TeamMember } from "@/src/db/types";

export default function TeamScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const { data: team = [], refetch } = useQuery({ queryKey: ["team"], queryFn: () => listTeam(true) });
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [adding, setAdding] = useState(false);

  const toggle = (m: TeamMember) => {
    setMemberActive(m.id, m.active !== 1);
    qc.invalidateQueries({ queryKey: ["team"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title="Team" subtitle="Anggota & status aktif" back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + 90 }}>
        {team.map((m) => (
          <Card key={m.id} style={{ marginBottom: spacing.sm }} testID={`team-${m.id}`}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, m.active !== 1 && { color: colors.muted }]}>{m.name}</Text>
                <Text style={styles.role}>{m.position}{m.has_target === 1 ? " · punya target" : " · tanpa target pribadi"}</Text>
              </View>
              <Pressable onPress={() => setEditing(m)} style={styles.editBtn} testID={`team-edit-${m.id}`}>
                <PencilSimple size={18} color={colors.brandPrimary} />
              </Pressable>
              <Switch value={m.active === 1} onValueChange={() => toggle(m)} trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }} testID={`team-toggle-${m.id}`} />
            </View>
          </Card>
        ))}
        <Text style={styles.note}>Anggota nonaktif tidak muncul pada input harian baru, namun histori datanya tetap tersimpan.</Text>
      </Screen>
      <Fab onPress={() => setAdding(true)} testID="team-add-fab" bottom={insets.bottom + 16} />

      <MemberEditor
        visible={adding || !!editing}
        member={editing}
        onClose={() => { setAdding(false); setEditing(null); }}
        onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ["team"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); refetch(); showToast("Anggota tersimpan", "success"); }}
      />
    </View>
  );
}

function MemberEditor({ visible, member, onClose, onSaved }: { visible: boolean; member: TeamMember | null; onClose: () => void; onSaved: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [name, setName] = useState(member?.name ?? "");
  const [position, setPosition] = useState<Position>((member?.position as Position) ?? "Student Advisor");
  const [hasTarget, setHasTarget] = useState(member ? member.has_target === 1 : true);

  React.useEffect(() => {
    setName(member?.name ?? "");
    const pos = (member?.position as Position) ?? "Student Advisor";
    setPosition(pos);
    setHasTarget(member ? member.has_target === 1 : positionHasTarget(pos));
  }, [member, visible]);

  const onPosition = (p: Position) => { setPosition(p); setHasTarget(positionHasTarget(p)); };

  const save = () => {
    if (!name.trim()) { showToast("Nama wajib diisi", "error"); return; }
    if (member) updateMember(member.id, name.trim(), position, hasTarget);
    else addMember(name.trim(), position, hasTarget);
    onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>{member ? "Edit Anggota" : "Anggota Baru"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextField label="Nama" value={name} onChangeText={setName} testID="member-name" />
            <SelectField label="Posisi" value={position} options={POSITIONS.map((p) => ({ label: p, value: p }))} onChange={(v) => onPosition(v as Position)} testID="member-position" />
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Memiliki target pribadi</Text>
                <Text style={styles.switchSub}>Manager biasanya tidak memiliki target pribadi</Text>
              </View>
              <Switch value={hasTarget} onValueChange={setHasTarget} trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }} testID="member-hastarget" />
            </View>
          </ScrollView>
          <View style={styles.actions}>
            <Button title="Batal" variant="ghost" onPress={onClose} style={{ flex: 1 }} testID="member-cancel" />
            <Button title="Simpan" onPress={save} style={{ flex: 1 }} testID="member-save" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.lg },
  role: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.base, marginTop: 2 },
  editBtn: { width: 38, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: c.brandTertiary },
  note: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.sm, lineHeight: 18, marginTop: spacing.md },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing["2xl"], maxHeight: "85%" },
  sheetTitle: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.xl, marginBottom: spacing.md },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  switchLabel: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.base },
  switchSub: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.sm, marginTop: 2 },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
}));
