import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Copy } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Button, Card, Screen, SectionTitle } from "@/src/components/ui";
import { DateField, NumberField, TextField } from "@/src/components/inputs";
import { useToast } from "@/src/components/Toast";
import { getWaReport, upsertWaReport } from "@/src/db/repo";
import { buildWhatsappReport } from "@/src/services/whatsapp";
import { todayYMD } from "@/src/lib/date";

export default function WhatsappScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [date, setDate] = useState(todayYMD());
  const [reportTime, setReportTime] = useState("9PM");
  const [freeTrial, setFreeTrial] = useState(0);
  const [apptTomorrow, setApptTomorrow] = useState(0);
  const [apptDayAfter, setApptDayAfter] = useState(0);
  const [collAppt, setCollAppt] = useState(0);
  const [collShow, setCollShow] = useState(0);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const w = getWaReport(date);
    setReportTime(w?.report_time ?? "9PM");
    setFreeTrial(w?.free_trial ?? 0);
    setApptTomorrow(w?.appt_tomorrow ?? 0);
    setApptDayAfter(w?.appt_day_after ?? 0);
    setCollAppt(w?.collection_appt ?? 0);
    setCollShow(w?.collection_show ?? 0);
    setPreview("");
  }, [date]);

  const persist = () => {
    upsertWaReport(date, {
      report_time: reportTime, free_trial: freeTrial, appt_tomorrow: apptTomorrow,
      appt_day_after: apptDayAfter, collection_appt: collAppt, collection_show: collShow,
    });
  };

  const build = () => {
    persist();
    setPreview(buildWhatsappReport(date));
  };

  const copy = async () => {
    persist();
    const text = buildWhatsappReport(date);
    setPreview(text);
    await Clipboard.setStringAsync(text);
    showToast("Report disalin ke clipboard", "success");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title="WhatsApp Report" subtitle="Laporan harian siap copy" back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + spacing["3xl"] }}>
        <DateField label="Tanggal Laporan" value={date} onChange={setDate} testID="wa-date" />
        <TextField label="Jam Laporan" value={reportTime} onChangeText={setReportTime} testID="wa-time" />

        <SectionTitle style={{ marginTop: spacing.md }}>Input Manual</SectionTitle>
        <Card>
          <NumberField label="Free Trial" value={freeTrial} onChange={setFreeTrial} testID="wa-freetrial" />
          <NumberField label="Appointment Tomorrow" value={apptTomorrow} onChange={setApptTomorrow} testID="wa-appt-tomorrow" />
          <NumberField label="Appointment The Day After" value={apptDayAfter} onChange={setApptDayAfter} testID="wa-appt-dayafter" />
          <NumberField label="Collection Appointment" value={collAppt} onChange={setCollAppt} testID="wa-coll-appt" />
          <NumberField label="Collection Show" value={collShow} onChange={setCollShow} testID="wa-coll-show" />
        </Card>
        <Text style={styles.note}>Data lain (cancellation, production, COED, Dues$, Dues$ Projo) otomatis diambil dari database.</Text>

        <Button title="Build Preview" variant="secondary" onPress={build} testID="wa-build" style={{ marginTop: spacing.md }} />

        {!!preview && (
          <>
            <SectionTitle style={{ marginTop: spacing.lg }}>Preview</SectionTitle>
            <Card>
              <Text style={styles.preview} selectable testID="wa-preview">{preview}</Text>
            </Card>
          </>
        )}

        <Button title="COPY REPORT" onPress={copy} icon={<Copy size={20} color="#fff" weight="fill" />} testID="wa-copy" style={{ marginTop: spacing.md }} />
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  note: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.sm, lineHeight: 18, marginTop: spacing.sm },
  preview: { color: c.onSurface, fontFamily: "monospace", fontSize: fontSize.base, lineHeight: 20 },
}));
