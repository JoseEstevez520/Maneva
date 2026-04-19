import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import "../global.css";

import { supabase } from "@/lib/supabase";
import { safeStorage } from "@/lib/storage";
import { getUserPreference } from "@/services/users.service";
import { useAuthStore } from "@/store/authStore";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import * as SplashScreen from "expo-splash-screen";

// Evitar que el SplashScreen se oculte automáticamente
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { setUser, clearAuth } = useAuthStore();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    const checkOnboarding = async () => {
      const seen = await safeStorage.getItem("hasSeenOnboarding");

      if (seen === "true") {
        setHasSeenOnboarding(true);
      }

      setCheckedOnboarding(true);
    };

    checkOnboarding();
  }, []);

  // Auth Guard — escucha cambios de sesión y redirige
  useEffect(() => {
    let isMounted = true;

    const checkState = async (session: any) => {
      if (!isMounted || !loaded) return;

      const isLoginOrRegister =
        segments[0] === "login" || segments[0] === "register";
      const isAuthGroup =
        isLoginOrRegister ||
        segments[0] === "onboarding" ||
        segments[0] === "welcome";
      const isLocationSetup =
        segments[0] === "onboarding" && segments[1] === "location";
      const isPreferencesSetup =
        segments[0] === "onboarding" && segments[1] === "preferences";

      if (session?.user) {
        setUser(session.user);

        try {
          // Verificar si el usuario ya vio los slides de onboarding
          const hasSeen = await safeStorage.getItem("hasSeenOnboarding");

          if (hasSeen !== "true") {
            if (segments[0] !== "onboarding" || segments[1] === "location") {
              router.replace("/onboarding");
            }
            return;
          }

          // Verificar preferencia de ciudad
          const cityPreference = await getUserPreference(
            session.user.id,
            "city",
          );
          const localCityFallback = await safeStorage.getItem(
            `onboarding_city_${session.user.id}`,
          );
          const hasCityPreference = Boolean(
            cityPreference?.preference_value?.trim() ||
              localCityFallback?.trim(),
          );

          if (!hasCityPreference) {
            if (!isLocationSetup) {
              router.replace("/onboarding/location");
            }
            return;
          }

          // Verificar preferencia de servicios
          const servicePreference = await getUserPreference(
            session.user.id,
            "service_interest",
          );
          const localServicesFallback = await safeStorage.getItem(
            `onboarding_services_${session.user.id}`,
          );
          const hasServicePreference = Boolean(
            servicePreference?.preference_value?.trim() ||
              (localServicesFallback && localServicesFallback !== "[]"),
          );

          if (!hasServicePreference) {
            if (!isPreferencesSetup) {
              router.replace("/onboarding/preferences");
            }
            return;
          }

          // Onboarding completo — redirigir al home desde pantallas de auth o raíz
          if (isAuthGroup || segments.length === 0) {
            router.replace("/(tabs)");
          }
        } catch (e) {
          console.error("Error reading Onboarding flag:", e);
        }
      } else {
        clearAuth();

        if (!isAuthGroup) {
          router.replace("/welcome");
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkState(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkState(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [segments, loaded, clearAuth, router, setUser]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="onboarding/location"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="onboarding/preferences"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen
          name="search"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
