import AsyncStorage from "@react-native-async-storage/async-storage";
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
    const seen = await AsyncStorage.getItem("onboarding_seen");

    if (seen === "true") {
      setHasSeenOnboarding(true);
    }

    setCheckedOnboarding(true);
  };

  checkOnboarding();
}, []);


  // Auth Guard — escucha cambios de sesión y redirige
  useEffect(() => {
  if (!checkedOnboarding) return;

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      const inAuthScreen =
        segments[0] === 'login' || segments[0] === 'register';

      const inOnboarding = segments[0] === 'onboarding';

      if (!hasSeenOnboarding && !inOnboarding) {
        router.replace('/onboarding' as any);
        return;
      }

      if (session?.user) {
        setUser(session.user);

        if (inAuthScreen) {
          router.replace('/(tabs)');
        }
      } else {
        clearAuth();

        if (!inAuthScreen) {
          router.replace('/login');
        }
      }
    }
  );

  return () => subscription.unsubscribe();
}, [segments, checkedOnboarding, hasSeenOnboarding]);

  if (!loaded && !error) {
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
