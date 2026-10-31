import React from "react";
import { Stack } from "expo-router";
import { SessionProvider } from "../session";
export default function Layout() {
  return (
    <SessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#F7F5EE" },
          animation: "none",
        }}
      />
    </SessionProvider>
  );
}
