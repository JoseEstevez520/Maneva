import {
  signIn,
  signOut,
  signUp,
  signUpAndMerge,
  sendPhoneOtp,
  verifyPhoneOtp,
} from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { safeStorage } from "@/lib/storage";
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
  if (
    normalized.includes("invalid otp") ||
    normalized.includes("token has expired")
  ) {
    return "Código incorrecto o caducado. Solicita uno nuevo.";
  }

  return error instanceof Error ? error.message : "Error";
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneAlreadyExists, setPhoneAlreadyExists] = useState(false);
  const { user, role } = useAuthStore();

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function loginWithPhone(phone: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      await sendPhoneOtp(phone);
      return true;
    } catch (e: unknown) {
      setError(getFriendlyAuthError(e));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhone(phone: string, token: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      await verifyPhoneOtp(phone, token);
      return true;
    } catch (e: unknown) {
      setError(getFriendlyAuthError(e));
      return false;
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
    setPhoneAlreadyExists(false);
    try {
      await signUp(email, password, fullName, phone);
      await safeStorage.setItem("hasSeenOnboarding", "false");
      return true;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "PHONE_ALREADY_EXISTS") {
        setPhoneAlreadyExists(true);
        return false;
      }
      setError(getFriendlyAuthError(e));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function registerAndMerge(
    email: string,
    password: string,
    fullName: string,
    phone: string,
  ) {
    setLoading(true);
    setError(null);
    try {
      await signUpAndMerge(email, password, fullName, phone);
      await safeStorage.setItem("hasSeenOnboarding", "false");
      return true;
    } catch (e: unknown) {
      setError(getFriendlyAuthError(e));
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

  return {
    user,
    role,
    loading,
    error,
    phoneAlreadyExists,
    login,
    loginWithPhone,
    verifyPhone,
    register,
    registerAndMerge,
    logout,
  };
}
