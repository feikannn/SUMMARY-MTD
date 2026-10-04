import React, { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Database, DownloadSimple, UploadSimple, Warning } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Button, Card, Chip, KeyValue, Screen, SectionTitle } from "@/src/components/ui";
import { useToast } from "@/src/components/Toast";
import { exportDatabaseToJson } from "@/src/services/exporter";
import { applyImport, ImportMode, ImportPreview, Normalized, parseBackup, previewImport } from "@/src/services/importer";
import { readFileText } from "@/src/services/fs";
import { listImportLogs } from "@/src/db/repo";
import { displayDateTime } from "@/src/lib/date";

export default function DataScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { confirm, showToast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [normalized, setNormalized] = useState<Normalized | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [logs, setLogs] = useState(() => listImportLogs());

  const doExport = async () => {
    setBusy(true);
    try { await exportDatabaseToJson(); setLogs(listImportLogs()); showToast("Database diexport", "success"); }
    catch (e: any) { showToast("Gagal export: " + (e?.message ?? ""), "error"); }
    finally { setBusy(false); }
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/json", "*/*"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    setBusy(true);
    try {
      const text = await readFileText(res.assets[0].uri);
      const n = parseBackup(text);
      if (n.format === "unknown") { showToast("Format backup tidak dikenali", "error"); setBusy(false); return; }
      setNormalized(n);
      setPreview(previewImport(n));
      setMode("merge");
    } catch (e: any) {
      showToast("Gagal membaca file: " + (e?.message ?? ""), "error");
    } finally { setBusy(false); }
  };

  const apply = async () => {
    if (!normalized) return;
    if (mode === "replace") {
      const ok = await confirm({ title: "Replace seluruh database?", message: "Semua data saat ini akan diganti. Kami sarankan export backup dulu.", confirmText: "Replace", destructive: true });
      if (!ok) return;
      try { await exportDatabaseToJson(); } catch { /* backup optional */ }
    }
    setBusy(true);
    const result = applyImport(normalized, mode);
    setBusy(false);
    if (!result.ok) { showToast("Import gagal (rollback): " + result.error, "error"); return; }
    const total = Object.values(result.added).reduce((a, b) => a + b, 0);
    qc.invalidateQueries();
    setLogs(listImportLogs());
    setNormalized(null);
    setPreview(null);
    showToast(`Import selesai: ${total} record`, "success");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title="Import / Export" subtitle="Backup & restore JSON" back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + spacing["3xl"] }}>
        <Card testID="export-card">
          <View style={styles.cardHead}><Database size={20} color={colors.brandPrimary} weight="fill" /><Text style={styles.cardTitle}>Export Database</Text></View>
          <Text style={styles.cardSub}>Simpan seluruh data (team, produk, closing, target, production, COED, cancellation, settings) ke satu file JSON.</Text>
          <Button title="Export ke JSON" onPress={doExport} loading={busy} icon={<DownloadSimple size={20} color="#fff" weight="bold" />} testID="btn-export" style={{ marginTop: spacing.md }} />
        </Card>

        <Card style={{ marginTop: spacing.lg }} testID="import-card">
          <View style={styles.cardHead}><UploadSimple size={20} color={colors.brandPrimary} weight="fill" /><Text style={styles.cardTitle}>Import Database</Text></View>
          <Text style={styles.cardSub}>Pilih backup aplikasi lama (Rockstar) atau hasil export SA Summary. Data akan dipreview sebelum diterapkan.</Text>
          <Button title="Pilih File JSON" variant="secondary" onPress={pickFile} loading={busy} testID="btn-pick" style={{ marginTop: spacing.md }} />
        </Card>

        {preview && normalized && (
          <>
            <SectionTitle style={{ marginTop: spacing.lg }}>Preview Import</SectionTitle>
            <Card testID="import-preview">
              <Text style={styles.format}>Format: {preview.format === "rockstar_old" ? "Backup Lama (Rockstar)" : "SA Summary Export"}</Text>
              <KeyValue label="Team" value={`${preview.counts.team}`} />
              <KeyValue label="Products" value={`${preview.counts.products}`} />
              <KeyValue label="Monthly Targets" value={`${preview.counts.monthlyTargets}`} />
              <KeyValue label="Legacy Targets" value={`${preview.counts.legacyTargets}`} />
              <KeyValue label="Closings" value={`${preview.counts.closings} (${preview.counts.closingItems} item)`} />
              <KeyValue label="Daily Production" value={`${preview.counts.production}`} />
              <KeyValue label="COED" value={`${preview.counts.coed}`} />
              <KeyValue label="Cancellation" value={`${preview.counts.cancellations}`} />
              <KeyValue label="Settings" value={`${preview.counts.settings}`} />

              {(preview.duplicates.closings + preview.duplicates.coed + preview.duplicates.cancellations + preview.duplicates.production) > 0 && (
                <View style={styles.warnBox}>
                  <Warning size={16} color={colors.warning} weight="fill" />
                  <Text style={styles.warnText}>
                    Duplikat terdeteksi: {preview.duplicates.closings} closing, {preview.duplicates.production} production, {preview.duplicates.coed} COED, {preview.duplicates.cancellations} cancellation (akan dilewati saat Merge).
                  </Text>
                </View>
              )}
              {preview.unmapped.length > 0 && (
                <View style={styles.warnBox}>
                  <Warning size={16} color={colors.error} weight="fill" />
                  <Text style={styles.warnText}>{preview.unmapped.length} data tidak dapat dipetakan.</Text>
                </View>
              )}

              <Text style={[styles.cardSub, { marginTop: spacing.md }]}>Mode import</Text>
              <View style={styles.modeRow}>
                <Chip label="Merge" active={mode === "merge"} onPress={() => setMode("merge")} testID="mode-merge" />
                <Chip label="Replace" active={mode === "replace"} onPress={() => setMode("replace")} testID="mode-replace" />
              </View>
              <Text style={styles.modeNote}>{mode === "merge" ? "Merge: data lama dipertahankan, hanya menambah yang baru (default & aman)." : "Replace: seluruh database diganti dengan isi backup. Backup otomatis dibuat dulu."}</Text>

              <Button title="Terapkan Import" onPress={apply} loading={busy} testID="btn-apply" style={{ marginTop: spacing.md }} />
            </Card>
          </>
        )}

        {logs.length > 0 && (
          <>
            <SectionTitle style={{ marginTop: spacing.lg }}>Riwayat</SectionTitle>
            {logs.map((l) => (
              <Card key={l.id} style={{ marginBottom: spacing.sm }}>
                <Text style={styles.logTitle}>{l.source} · {l.mode}</Text>
                <Text style={styles.logTime}>{displayDateTime(l.created_at.slice(0, 10), l.created_at.slice(11, 16))}</Text>
              </Card>
            ))}
          </>
        )}
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg },
  cardSub: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.sm, lineHeight: 18 },
  format: { color: c.brandPrimary, fontFamily: fonts.semibold, fontSize: fontSize.base, marginBottom: spacing.sm },
  warnBox: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: c.surfaceTertiary, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  warnText: { color: c.onSurfaceTertiary, fontFamily: fonts.medium, fontSize: fontSize.sm, flex: 1, lineHeight: 18 },
  modeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  modeNote: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.sm, marginTop: spacing.sm, lineHeight: 18 },
  logTitle: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.base, textTransform: "capitalize" },
  logTime: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 2 },
}));
