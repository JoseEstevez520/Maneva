import { signIn, signOut, signUp } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";

function getFriendlyAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const normalized = raw.toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "Has intentado registrarte demasiadas veces en poco tiempo. Espera 60 segundos e inténtalo de nuevo.";
  }

  if (normalized.includes("user already registered")) {
    return "Este correo ya está registrado. Prueba a iniciar sesión.";
  }

  return error instanceof Error ? error.message : "Error";
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, role } = useAuthStore();

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      // El Auth Guard en _layout.tsx gestiona la redirección automáticamente
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function register(
    email: string,
    password: string,
    fullName: string,
    phone?: string,
  ) {
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, fullName, phone);
      await AsyncStorage.setItem("hasSeenOnboarding", "false");
      return true;
    } catch (e: unknown) {
      const friendlyMessage = getFriendlyAuthError(e);
      setError(friendlyMessage);

      return false;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setError(null);
    try {
      await signOut();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return { user, role, loading, error, login, register, logout };
}
