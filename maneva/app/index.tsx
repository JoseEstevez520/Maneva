import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import { safeStorage } from '@/lib/storage';

/**
 * Componente raíz que maneja la redirección inicial.
 * El parpadeo se evita en el _layout.tsx bloqueando el SplashScreen.
 */
export default function Index() {
  const { user } = useAuthStore();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      const seen = await safeStorage.getItem("onboarding_seen");
      setHasSeenOnboarding(seen === "true");
    };
    checkOnboarding();
  }, []);

  // Esperar a que el estado de onboarding se cargue
  if (hasSeenOnboarding === null) return null;

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
