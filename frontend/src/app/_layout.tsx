import React from "react";
import { Stack } from "expo-router";
import { SessionProvider } from "../session";
import { ThemeProvider, useTheme } from "../theme";
function Screens() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream }, animation: "none" }} />;
}
export default function Layout() {
  return <ThemeProvider><SessionProvider><Screens /></SessionProvider></ThemeProvider>;
}
