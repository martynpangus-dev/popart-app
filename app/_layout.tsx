import { Tabs } from "expo-router";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs screenOptions={{ headerTitleAlign: "center" }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Marketplace",
          }}
        />
        <Tabs.Screen
          name="contributor-dashboard"
          options={{
            title: "Contributor",
          }}
        />
        <Tabs.Screen
          name="my-collections"
          options={{
            title: "My Collections",
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
          }}
        />
        {/* Details screen (hidden from tab bar) */}
        <Tabs.Screen
          name="collection/[id]"
          options={{
            href: null,
            title: "Collection",
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}
