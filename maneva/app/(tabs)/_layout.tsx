import React from "react";
import { IconHome, IconMail, IconSettings, IconSparkles } from "@/components/ui/icons";
import { Colors } from "@/constants/theme";
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
 * Se monta sobre la tab bar con posición absoluta. La animación de entrada
 * tiene un pequeño delay para que no compita visualmente con la carga de tabs.
 */
function AIAssistantFAB() {
  const router = useRouter();
  const mountScale = useSharedValue(0);
  const pressScale = useSharedValue(1);

  // Animación de entrada al montar
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
          backgroundColor: Colors.premium.white,
          borderWidth: 1.5,
          borderColor: Colors.gold.DEFAULT,
          alignItems: "center",
          justifyContent: "center",
          // Sombra sutil dorada — presente pero sin romper el UI limpio
          shadowColor: Colors.gold.DEFAULT,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 6,
        },
      ]}
    >
      <IconSparkles size={22} color={Colors.gold.DEFAULT} strokeWidth={2} />
    </AnimatedPressable>
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
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

      {/* FAB del asistente IA — flota sobre todas las tabs */}
      <AIAssistantFAB />
    </View>
  );
}
