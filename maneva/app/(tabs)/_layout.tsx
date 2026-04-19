import { IconHome, IconMail, IconSettings } from "@/components/ui/icons";
import { Colors } from "@/constants/theme";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.gold.DEFAULT,
        tabBarInactiveTintColor: Colors.premium.gray.DEFAULT,
        tabBarStyle: {
          backgroundColor: Colors.premium.white,
          borderTopWidth: 1,
          borderTopColor: Colors.premium.gray.light,
          height: 60,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <IconHome color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Buzón",
          tabBarIcon: ({ color, size }) => (
            <IconMail color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, size }) => (
            <IconSettings color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
