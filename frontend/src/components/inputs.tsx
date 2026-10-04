import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { CaretDown, CaretLeft, CaretRight, Check, Minus, Plus } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { displayDate, fromYMD, monthLabel, toHM, toYMD } from "@/src/lib/date";
import { formatInt } from "@/src/lib/format";

/* ----------------------------- Field wrapper ----------------------------- */

export function FieldLabel({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.label}>{children}</Text>;
}

/* ----------------------------- Text ----------------------------- */

export function TextField({
  label, value, onChangeText, placeholder, testID, autoFocus, multiline,
}: {
  label?: string; value: string; onChangeText: (t: string) => void; placeholder?: string; testID?: string; autoFocus?: boolean; multiline?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      {!!label && <FieldLabel>{label}</FieldLabel>}
      <TextInput
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        testID={testID}
        autoFocus={autoFocus}
        multiline={multiline}
      />
    </View>
  );
}

/* ----------------------------- Number ----------------------------- */

export function NumberField({
  label, value, onChange, placeholder, testID,
}: {
  label?: string; value: number; onChange: (n: number) => void; placeholder?: string; testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [text, setText] = useState(value ? String(value) : "");
  React.useEffect(() => { setText(value ? String(value) : ""); }, [value]);
  return (
    <View style={styles.fieldWrap}>
      {!!label && <FieldLabel>{label}</FieldLabel>}
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(t) => {
          const clean = t.replace(/[^0-9]/g, "");
          setText(clean);
          onChange(clean ? parseInt(clean, 10) : 0);
        }}
        keyboardType="number-pad"
        placeholder={placeholder ?? "0"}
        placeholderTextColor={colors.muted}
        testID={testID}
      />
      {value > 0 && <Text style={styles.hint}>{formatInt(value)}</Text>}
    </View>
  );
}

/* ----------------------------- Stepper ----------------------------- */

export function Stepper({ value, onChange, testID }: { value: number; onChange: (n: number) => void; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.stepper} testID={testID}>
      <Pressable onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepBtn} testID={testID ? `${testID}-minus` : undefined}>
        <Minus size={16} color={colors.onSurface} weight="bold" />
      </Pressable>
      <Text style={styles.stepVal}>{value}</Text>
      <Pressable onPress={() => onChange(value + 1)} style={styles.stepBtn} testID={testID ? `${testID}-plus` : undefined}>
        <Plus size={16} color={colors.onSurface} weight="bold" />
      </Pressable>
    </View>
  );
}

/* ----------------------------- Date ----------------------------- */

export function DateField({ label, value, onChange, testID }: { label?: string; value: string; onChange: (ymd: string) => void; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [show, setShow] = useState(false);

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: fromYMD(value),
        mode: "date",
        onChange: (_e, d) => { if (d) onChange(toYMD(d)); },
      });
    } else {
      setShow(true);
    }
  };

  if (Platform.OS === "web") {
    return (
      <View style={styles.fieldWrap}>
        {!!label && <FieldLabel>{label}</FieldLabel>}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          testID={testID}
        />
      </View>
    );
  }

  return (
    <View style={styles.fieldWrap}>
      {!!label && <FieldLabel>{label}</FieldLabel>}
      <Pressable style={styles.selectInput} onPress={open} testID={testID}>
        <Text style={styles.selectText}>{displayDate(value)}</Text>
        <CaretDown size={18} color={colors.muted} />
      </Pressable>
      {Platform.OS === "ios" && show && (
        <Modal transparent animationType="slide" visible={show} onRequestClose={() => setShow(false)}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShow(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <DateTimePicker
                value={fromYMD(value)}
                mode="date"
                display="spinner"
                onChange={(_e, d) => { if (d) onChange(toYMD(d)); }}
                themeVariant={colors.surface === "#121212" ? "dark" : "light"}
              />
              <Pressable style={styles.sheetDone} onPress={() => setShow(false)}>
                <Text style={styles.sheetDoneText}>Selesai</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

export function TimeField({ label, value, onChange, testID }: { label?: string; value: string; onChange: (hm: string) => void; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  const base = () => { const d = new Date(); const [h, m] = (value || "00:00").split(":"); d.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0); return d; };

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: base(), mode: "time", is24Hour: true, onChange: (_e, d) => { if (d) onChange(toHM(d)); } });
    } else setShow(true);
  };

  if (Platform.OS === "web") {
    return (
      <View style={styles.fieldWrap}>
        {!!label && <FieldLabel>{label}</FieldLabel>}
        <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="HH:MM" placeholderTextColor={colors.muted} testID={testID} />
      </View>
    );
  }

  return (
    <View style={styles.fieldWrap}>
      {!!label && <FieldLabel>{label}</FieldLabel>}
      <Pressable style={styles.selectInput} onPress={open} testID={testID}>
        <Text style={styles.selectText}>{value || "00:00"}</Text>
        <CaretDown size={18} color={colors.muted} />
      </Pressable>
      {Platform.OS === "ios" && show && (
        <Modal transparent animationType="slide" visible={show} onRequestClose={() => setShow(false)}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShow(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <DateTimePicker value={base()} mode="time" display="spinner" is24Hour onChange={(_e, d) => { if (d) onChange(toHM(d)); }} />
              <Pressable style={styles.sheetDone} onPress={() => setShow(false)}>
                <Text style={styles.sheetDoneText}>Selesai</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

/* ----------------------------- Select ----------------------------- */

export interface Option<T> { label: string; value: T; sub?: string }

export function SelectField<T extends string | number>({
  label, value, options, onChange, placeholder, testID,
}: {
  label?: string; value: T | null; options: Option<T>[]; onChange: (v: T) => void; placeholder?: string; testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={styles.fieldWrap}>
      {!!label && <FieldLabel>{label}</FieldLabel>}
      <Pressable style={styles.selectInput} onPress={() => setOpen(true)} testID={testID}>
        <Text style={[styles.selectText, !selected && { color: colors.muted }]} numberOfLines={1}>
          {selected ? selected.label : (placeholder ?? "Pilih")}
        </Text>
        <CaretDown size={18} color={colors.muted} />
      </Pressable>
      <Modal transparent animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {!!label && <Text style={styles.sheetTitle}>{label}</Text>}
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    style={styles.optionRow}
                    onPress={() => { onChange(o.value); setOpen(false); }}
                    testID={testID ? `${testID}-option-${o.value}` : undefined}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionText, active && { color: colors.brandPrimary, fontFamily: fonts.semibold }]}>{o.label}</Text>
                      {!!o.sub && <Text style={styles.optionSub}>{o.sub}</Text>}
                    </View>
                    {active && <Check size={18} color={colors.brandPrimary} weight="bold" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ----------------------------- Month navigator ----------------------------- */

export function MonthNavigator({ year, month, onChange, testID }: { year: number; month: number; onChange: (y: number, m: number) => void; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const go = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    onChange(y, m);
  };
  return (
    <View style={styles.monthNav} testID={testID}>
      <Pressable onPress={() => go(-1)} style={styles.monthBtn} testID="month-prev"><CaretLeft size={18} color={colors.onSurface} weight="bold" /></Pressable>
      <Text style={styles.monthLabel} testID="month-label">{monthLabel(year, month)}</Text>
      <Pressable onPress={() => go(1)} style={styles.monthBtn} testID="month-next"><CaretRight size={18} color={colors.onSurface} weight="bold" /></Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  fieldWrap: { marginBottom: spacing.md },
  label: { color: c.onSurfaceTertiary, fontFamily: fonts.semibold, fontSize: fontSize.sm, marginBottom: spacing.xs },
  input: {
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: c.onSurface,
    fontFamily: fonts.medium,
    fontSize: fontSize.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  hint: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.sm, marginTop: 4 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: c.surfaceTertiary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border },
  stepBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  stepVal: { minWidth: 36, textAlign: "center", color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg },
  selectInput: {
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 50,
  },
  selectText: { color: c.onSurface, fontFamily: fonts.medium, fontSize: fontSize.lg, flex: 1 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing["2xl"] },
  sheetTitle: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg, marginBottom: spacing.md },
  sheetDone: { backgroundColor: c.brandPrimary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm },
  sheetDoneText: { color: c.onBrandPrimary, fontFamily: fonts.semibold, fontSize: fontSize.lg },
  optionRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  optionText: { color: c.onSurface, fontFamily: fonts.medium, fontSize: fontSize.lg },
  optionSub: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.sm, marginTop: 2 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.xs },
  monthBtn: { width: 40, height: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceTertiary },
  monthLabel: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.lg },
}));
