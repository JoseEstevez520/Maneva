import { ScreenLayout } from "@/components/ui/ScreenLayout";
import { H2 } from "@/components/ui/Typography";
import React from "react";
import { View } from "react-native";

export default function SettingsScreen() {
  return (
    <ScreenLayout header="brand">
      <View className="flex-1 px-4 mt-8">
        <H2 className="mb-6">Ajustes</H2>
      </View>
    </ScreenLayout>
  );
}
