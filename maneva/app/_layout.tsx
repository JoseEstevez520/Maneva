import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import "react-native-reanimated";
import "../global.css";
import * as NavigationBar from "expo-navigation-bar";

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

/**
 * Configura la barra de navegación del sistema Android en modo edge-to-edge:
 * el contenido de la app se renderiza debajo de la barra (home, atrás, recientes)
 * y esta queda translúcida, sin el bloque opaco de color del sistema.
 *
 * ALTERNATIVAS (cambiar las dos líneas de abajo):
 *
 * — Inmersivo: la barra se oculta al entrar en la pantalla y reaparece al
 *   deslizar desde el borde. Útil para reproductores de video o galerías,
 *   pero intrusivo en apps de uso cotidiano.
 *   NavigationBar.setVisibilityAsync("hidden")
 *   NavigationBar.setBehaviorAsync("overlay-swipe")
 *
 * — Color sólido personalizado: la barra queda visible con un color fijo.
 *   NavigationBar.setBackgroundColorAsync("#FFFFFF")
 *   NavigationBar.setButtonStyleAsync("dark")  // iconos oscuros sobre fondo claro
 *
 * — Sin cambios (comportamiento por defecto del SO): simplemente
 *   eliminar este useEffect completo.
 *
 * Nota: solo afecta a Android. En iOS el área inferior la gestiona
 * SafeAreaView y no existe una barra de navegación equivalente.
 */
async function configureNavigationBar() {
  // Con edge-to-edge habilitado en Android, setPositionAsync y setBackgroundColorAsync
  // muestran warnings porque no son compatibles. Mantenemos solo el estilo de iconos.
  await NavigationBar.setButtonStyleAsync("dark")
}

export default function RootLayout() {
  const segments = useSegments();
  const { setUser, clearAuth } = useAuthStore();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [redirectHref, setRedirectHref] = useState<string | null>(null);

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

  // Configurar la barra de navegación Android al montar la app.
  // El catch evita una promesa rechazada silenciosa en dispositivos sin soporte.
  useEffect(() => {
    configureNavigationBar().catch((e) => {
      console.warn('NavigationBar config failed:', e)
    })
  }, []);

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

    const checkState = async (session: Session | null) => {
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
              setRedirectHref("/onboarding");
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
              setRedirectHref("/onboarding/location");
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
              setRedirectHref("/onboarding/preferences");
            }
            return;
          }

          // Onboarding completo — redirigir al home desde pantallas de auth o raíz
          if (isAuthGroup || segments.length === 0) {
            setRedirectHref("/(tabs)");
          }
        } catch (e) {
          console.error("Error reading Onboarding flag:", e);
        }
      } else {
        clearAuth();

        if (!isAuthGroup) {
          setRedirectHref("/welcome");
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
  }, [segments, loaded, clearAuth, setUser]);

  if (!loaded && !error) {
    return null;
  }

  if (redirectHref) {
    return <Redirect href={redirectHref} />;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="salon/[id]" options={{ headerShown: false }} />
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
          name="chat"
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
