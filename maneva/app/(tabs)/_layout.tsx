import React from "react";
import { IconHome, IconMail, IconSettings, IconSparkles } from "@/components/ui/icons";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useUiStore } from "@/store/uiStore";
import { Tabs, useRouter } from "expo-router";
import { View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { useEffect } from "react";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * FAB del asistente IA.
 * Se monta sobre la tab bar con posición absoluta.
 */
function AIAssistantFAB() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const isDark = useUiStore(s => s.colorScheme) === 'dark';
  const mountScale = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    mountScale.value = withDelay(400, withSpring(1, { damping: 12, stiffness: 180 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mountScale.value * pressScale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => router.push("/chat")}
      onPressIn={() => {
        pressScale.value = withSpring(0.88, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      style={[
        animatedStyle,
        {
          position: "absolute",
          bottom: 80,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: isDark
            ? themeColors.premium.surface.soft
            : themeColors.premium.white,
          borderWidth: 1.5,
          borderColor: themeColors.gold.DEFAULT,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: themeColors.gold.DEFAULT,
          shadowOffset: { width: 0, height: isDark ? 0 : 3 },
          shadowOpacity: isDark ? 0.5 : 0.25,
          shadowRadius: isDark ? 10 : 8,
          elevation: isDark ? 0 : 6,
        },
      ]}
    >
      <IconSparkles size={22} color={themeColors.gold.DEFAULT} strokeWidth={2} />
    </AnimatedPressable>
  );
}

export default function TabLayout() {
  const themeColors = useThemeColors();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: themeColors.gold.DEFAULT,
          tabBarInactiveTintColor: themeColors.premium.gray.DEFAULT,
          tabBarStyle: {
            backgroundColor: themeColors.premium.white,
            borderTopWidth: 1,
            borderTopColor: themeColors.premium.gray.light,
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

      <AIAssistantFAB />
    </View>
  );
}
