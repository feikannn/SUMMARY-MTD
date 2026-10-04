// Design tokens for SA Summary. Light + Dark themes (Forest Green brand).
// Keys match the "color" block of /app/design_guidelines.json.

import { useMemo, useSyncExternalStore } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F1F5FB",
  onSurface: "#0F1E33",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#15263F",
  surfaceTertiary: "#E3EDF9",
  onSurfaceTertiary: "#1E3A5F",
  surfaceInverse: "#16325B",
  onSurfaceInverse: "#FFFFFF",
  muted: "#5B6B82",

  brand: "#16325B",
  onBrand: "#FFFFFF",
  brandPrimary: "#1B3A66",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#4A90D9",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#DCEBFB",
  onBrandTertiary: "#16325B",

  success: "#16A34A",
  onSuccess: "#FFFFFF",
  warning: "#D97706",
  onWarning: "#FFFFFF",
  error: "#DC2626",
  onError: "#FFFFFF",
  info: "#1B3A66",
  onInfo: "#FFFFFF",

  accent: "#F5B700",
  onAccent: "#16325B",

  border: "#D6E2F0",
  borderStrong: "#B9CCE4",
  divider: "#E8F0F9",
};

const dark: typeof light = {
  surface: "#0E1A2B",
  onSurface: "#EAF1FA",
  surfaceSecondary: "#16263C",
  onSurfaceSecondary: "#DCE7F3",
  surfaceTertiary: "#1E3147",
  onSurfaceTertiary: "#B9CCE4",
  surfaceInverse: "#EAF1FA",
  onSurfaceInverse: "#0E1A2B",
  muted: "#8EA2BC",

  brand: "#4A90D9",
  onBrand: "#0E1A2B",
  brandPrimary: "#3B82C4",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#6CA8E0",
  onBrandSecondary: "#0E1A2B",
  brandTertiary: "#1C3A5C",
  onBrandTertiary: "#9FC3EA",

  success: "#22C55E",
  onSuccess: "#0E1A2B",
  warning: "#F59E0B",
  onWarning: "#0E1A2B",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#8EA2BC",
  onInfo: "#0E1A2B",

  accent: "#FFCB2E",
  onAccent: "#0E1A2B",

  border: "#263B55",
  borderStrong: "#3A5478",
  divider: "#263B55",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

// Spacing / radius / typography tokens (static, scheme-independent).
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 } as const;
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 } as const;
export const fontSize = { sm: 12, base: 14, lg: 16, xl: 20, "2xl": 24, "3xl": 30 } as const;
export const fonts = {
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
} as const;

// External override so the Settings toggle can pin a scheme regardless of device.
let overrideScheme: ColorScheme | null = null;
const listeners = new Set<() => void>();

export function setColorScheme(scheme: ColorScheme | null) {
  overrideScheme = scheme;
  Appearance.setColorScheme?.(scheme ?? "unspecified");
  listeners.forEach((l) => l());
}
export function getOverrideScheme() {
  return overrideScheme;
}
export function subscribeScheme(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  // Re-render whenever the in-app override changes (works even on web where
  // Appearance.setColorScheme is a no-op).
  const override = useSyncExternalStore(subscribeScheme, getOverrideScheme, getOverrideScheme);
  const effective: ColorScheme = override ?? (system && themes[system] ? system : defaultScheme);
  const scheme = themes[effective] ? effective : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
