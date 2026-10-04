import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type ToastType = "success" | "error" | "info";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface Ctx {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<Ctx | null>(null);

export function useToast() {
  const c = useContext(ToastContext);
  if (!c) throw new Error("useToast must be used within ToastProvider");
  return c;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type });
    Haptics.notificationAsync(
      type === "success" ? Haptics.NotificationFeedbackType.Success : type === "error" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 2600);
  }, [opacity]);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve }));
  }, []);

  const closeConfirm = (val: boolean) => {
    confirmState?.resolve(val);
    setConfirmState(null);
  };

  const toastBg = toast?.type === "success" ? colors.success : toast?.type === "error" ? colors.error : colors.surfaceInverse;

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}

      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { opacity, top: insets.top + spacing.sm, backgroundColor: toastBg }]}
          testID="app-toast"
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      <Modal visible={!!confirmState} transparent animationType="fade" onRequestClose={() => closeConfirm(false)}>
        <Pressable style={styles.backdrop} onPress={() => closeConfirm(false)}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text style={styles.dialogTitle}>{confirmState?.title}</Text>
            {!!confirmState?.message && <Text style={styles.dialogMsg}>{confirmState.message}</Text>}
            <View style={styles.dialogActions}>
              <Pressable style={[styles.dialogBtn, styles.cancelBtn]} onPress={() => closeConfirm(false)} testID="confirm-cancel">
                <Text style={styles.cancelText}>{confirmState?.cancelText ?? "Batal"}</Text>
              </Pressable>
              <Pressable
                style={[styles.dialogBtn, confirmState?.destructive ? styles.destructiveBtn : styles.confirmBtn]}
                onPress={() => closeConfirm(true)}
                testID="confirm-ok"
              >
                <Text style={styles.confirmText}>{confirmState?.confirmText ?? "OK"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ToastContext.Provider>
  );
}

const useStyles = makeStyles((c) => ({
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    zIndex: 9999,
  },
  toastText: { color: "#FFFFFF", fontFamily: fonts.semibold, fontSize: fontSize.base, textAlign: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  dialog: { width: "100%", maxWidth: 380, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl },
  dialogTitle: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.xl, marginBottom: spacing.sm },
  dialogMsg: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.base, lineHeight: 20, marginBottom: spacing.lg },
  dialogActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  dialogBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
  cancelBtn: { backgroundColor: c.surfaceTertiary },
  confirmBtn: { backgroundColor: c.brandPrimary },
  destructiveBtn: { backgroundColor: c.error },
  cancelText: { color: c.onSurfaceSecondary, fontFamily: fonts.semibold, fontSize: fontSize.base },
  confirmText: { color: "#FFFFFF", fontFamily: fonts.semibold, fontSize: fontSize.base },
}));
