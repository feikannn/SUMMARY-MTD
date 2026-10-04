import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { SplashSequence } from "@/src/components/SplashSequence";
import { queryClient } from "@/src/query-client";
import { ToastProvider } from "@/src/components/Toast";
import { initDatabase } from "@/src/db/database";
import { getSetting } from "@/src/db/repo";
import { setColorScheme, useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync().catch(() => {});

function DbGate({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const saved = getSetting("theme");
        if (saved === "dark" || saved === "light") setColorScheme(saved);
        else setColorScheme(null);
      } catch (e) {
        console.warn("DB init error", e);
      }
      setReady(true);
    })();
  }, []);
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const { scheme } = useTheme();
  const [fontsLoaded] = useFonts({
    "PlusJakartaSans-Regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
  });

  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  return (
    <View style={{ flex: 1 }}>
    {fontsLoaded ? (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <KeyboardProvider>
              <ToastProvider>
                <DbGate>
                  <StatusBar style={scheme === "dark" ? "light" : "dark"} />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="closing-form" options={{ presentation: "modal" }} />
                  </Stack>
                </DbGate>
              </ToastProvider>
            </KeyboardProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
    ) : null}
    {!splashDone && <SplashSequence ready={fontsLoaded} onFinish={handleSplashFinish} />}
    </View>
  );
}
