import { useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const isLoginOrRegister = segments[0] === 'login' || segments[0] === 'register';
      // Todas las pantallas de antes de ver el contenido principal
      const isAuthGroup = isLoginOrRegister || segments[0] === 'onboarding' || segments[0] === 'welcome';

      if (session?.user) {
        setUser(session.user);
        
        try {
          // Si ESTÁ logueado, validamos si ya vio el onboarding
          const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
          
          if (hasSeen !== 'true') {
            // Si no lo ha visto, se queda o es redirigido al onboarding
            if (segments[0] !== 'onboarding') {
              router.replace('/onboarding');
            }
          } else {
            // Si ya lo vio y se encuentra en login, register, welcome o onboarding, mándalo a home
            if (isAuthGroup) {
              router.replace('/(tabs)');
            }
          }
        } catch (e) {
          console.error('Error reading Onboarding flag:', e);
        }
      } else {
        clearAuth();
        
        // Si NO está logueado, redirige a la pantalla de bienvenida
        if (!isAuthGroup) {
          router.replace('/welcome');
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        checkState(session);
      }
    );

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
        <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
