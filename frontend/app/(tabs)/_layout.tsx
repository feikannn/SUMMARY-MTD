import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { ChartBar, House, ListChecks, Receipt } from "phosphor-react-native";

import { fonts, fontSize, useTheme } from "@/src/theme";
import { usesNativeTabs } from "@/src/navigation";

export default function TabsLayout() {
  const { colors } = useTheme();

  if (usesNativeTabs) {
    // iOS 26+ native liquid-glass tabs.
    const { NativeTabs } = require("expo-router/unstable-native-tabs");
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" />
          <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="production">
          <NativeTabs.Trigger.Icon sf="chart.bar.fill" />
          <NativeTabs.Trigger.Label>Produksi</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="closing">
          <NativeTabs.Trigger.Icon sf="checklist" />
          <NativeTabs.Trigger.Label>Closing</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="more">
          <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" />
          <NativeTabs.Trigger.Label>Lainnya</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.divider,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: fontSize.sm - 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <House color={color} size={size} weight="fill" /> }}
      />
      <Tabs.Screen
        name="production"
        options={{ title: "Produksi", tabBarIcon: ({ color, size }) => <ChartBar color={color} size={size} weight="fill" /> }}
      />
      <Tabs.Screen
        name="closing"
        options={{ title: "Closing", tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} weight="fill" /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "Lainnya", tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} weight="fill" /> }}
      />
    </Tabs>
  );
}
