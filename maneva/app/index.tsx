import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Componente raíz que maneja la redirección inicial.
 * El parpadeo se evita en el _layout.tsx bloqueando el SplashScreen.
 */
export default function Index() {
  const { user } = useAuthStore();
  const { hasSeenOnboarding } = useUiStore();

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
