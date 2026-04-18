import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";

import { supabase } from "@/lib/supabase";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";

// Evitar que el SplashScreen se oculte automáticamente
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { setUser, clearAuth } = useAuthStore();

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

  // Auth Guard — escucha cambios de sesión y redirige
  useEffect(() => {
    let isMounted = true;

    const checkState = async (session: any) => {
      // Evitar redirigir antes de que las fuentes y el layout base estén cargados
      if (!isMounted || !loaded) return;

      // Grupos de autenticación básicos
      const isLoginOrRegister =
        segments[0] === "login" || segments[0] === "register";
      // Todas las pantallas de antes de ver el contenido principal
      const isAuthGroup =
        isLoginOrRegister ||
        segments[0] === "onboarding" ||
        segments[0] === "welcome";
      const isLocationSetup =
        segments[0] === "onboarding" && segments[1] === "location";

      if (session?.user) {
        setUser(session.user);

        try {
          // Primero respetamos el onboarding visual de slides para cuentas nuevas.
          const hasSeen = await AsyncStorage.getItem("hasSeenOnboarding");

          if (hasSeen !== "true") {
            if (segments[0] !== "onboarding" || segments[1] === "location") {
              router.replace("/onboarding");
            }
            return;
          }

          const cityPreference = await getUserPreference(
            session.user.id,
            "city",
          );
          const localCityFallback = await AsyncStorage.getItem(
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

          // Si ya vio onboarding y tiene ciudad, manda al home desde auth screens.
          if (isAuthGroup) {
            router.replace("/(tabs)");
          }
        } catch (e) {
          console.error("Error reading Onboarding flag:", e);
        }
      } else {
        clearAuth();

        // Si NO está logueado, redirige a la pantalla de bienvenida
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

    // Initial check en caso de que cambien los segments o al cargar por primera vez
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
