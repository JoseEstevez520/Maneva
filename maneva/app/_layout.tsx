import { safeStorage } from "@/lib/storage";
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { 
  useFonts, 
  Manrope_400Regular, 
  Manrope_500Medium, 
  Manrope_600SemiBold, 
  Manrope_700Bold, 
  Manrope_800ExtraBold 
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';


// Evitar que el SplashScreen se oculte automáticamente
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { setUser, clearAuth } = useAuthStore();
  const { hasSeenOnboarding, setHasSeenOnboarding } = useUiStore();
  const [appIsReady, setAppIsReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Lógica de inicialización completa
  useEffect(() => {
    async function prepare() {
      try {
        // 1. Cargar datos de onboarding y sesión inicial en paralelo
        const [onboardingSeen, { data: { session } }] = await Promise.all([
          safeStorage.getItem("onboarding_seen"),
          supabase.auth.getSession(),
        ]);

        if (onboardingSeen === "true") {
          setHasSeenOnboarding(true);
        }

        if (session?.user) {
          setUser(session.user);
        } else {
          clearAuth();
        }

      } catch (e) {
        console.warn(e);
      } finally {
        // Marcamos como listo cuando las fuentes Y los datos están cargados
        if (fontsLoaded || fontError) {
          setAppIsReady(true);
        }
      }
    }

    prepare();
  }, [fontsLoaded, fontError, setUser, clearAuth, setHasSeenOnboarding]);

  // Auth Guard y Redirección inicial
  useEffect(() => {
    if (!appIsReady) return;

    const inAuthScreen = segments[0] === 'login' || segments[0] === 'register';
    const inOnboarding = segments[0] === 'onboarding';

    // Lógica de redirección inicial para evitar parpadeos
    const checkNavigation = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!hasSeenOnboarding && !inOnboarding) {
        router.replace('/onboarding');
      } else if (session?.user) {
        if (inAuthScreen || inOnboarding || segments.length === 0) {
          router.replace('/(tabs)');
        }
      } else if (!inAuthScreen && !inOnboarding) {
        router.replace('/login');
      }

      // UNA VEZ QUE EL ROUTER HA SIDO INSTRUIDO, ocultamos el Splash
      // Damos un pequeño respiro para que el router procese el replace
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 50);
    };

    checkNavigation();

    // Listener para cambios de sesión futuros
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          if (segments[0] === 'login' || segments[0] === 'register') {
            router.replace('/(tabs)');
          }
        } else {
          clearAuth();
          if (segments[0] !== 'login' && segments[0] !== 'register' && segments[0] !== 'onboarding') {
            router.replace('/login');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [appIsReady, segments, hasSeenOnboarding, router, setUser, clearAuth]);

  if (!appIsReady) {
    return null;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
