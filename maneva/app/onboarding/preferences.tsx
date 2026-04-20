import { safeStorage } from "@/lib/storage";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Caption, H1 } from "@/components/ui/Typography";
import { getCurrentUser } from "@/services/auth.service";
import { replaceUserPreferences } from "@/services/users.service";
import { useAuthStore } from "@/store/authStore";

const SERVICES = [
  "Corte",
  "Color",
  "Mechas",
  "Barba",
  "Manicura",
  "Pedicura",
  "Tratamientos",
  "Uñas",
  "Peinados",
  "Extensiones",
];

export default function PreferencesOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = selected.length >= 1 && !saving;

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleService = (service: string) => {
    setError(null);
    setSelected((prev) =>
      prev.includes(service)
        ? prev.filter((item) => item !== service)
        : [...prev, service],
    );
  };

  const handleContinue = async () => {
    if (selected.length < 1) {
      setError("Selecciona al menos un servicio para continuar.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const currentUser = user ?? await getCurrentUser();
      if (!currentUser) {
        setError(
          "Tu sesión no está lista. Vuelve a iniciar sesión e inténtalo de nuevo.",
        );
        return;
      }

      const localServicesKey = `onboarding_services_${currentUser.id}`;

      // Guardado remoto de preferencia multi-valor (una fila por servicio).
      const remoteSave = await Promise.allSettled([
        replaceUserPreferences(currentUser.id, "service_interest", selected),
      ]);
      const servicesSavedRemotely = remoteSave[0].status === "fulfilled";

      // Fallback local para no bloquear la entrada al home si falla RLS/policies.
      await safeStorage.setItem(localServicesKey, JSON.stringify(selected));

      if (!servicesSavedRemotely) {
        console.warn(
          "Service preferences could not be saved remotely. Using local fallback.",
        );
      }

      router.replace("/(tabs)");
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "No pudimos guardar tus preferencias. Inténtalo de nuevo.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft">
      <ScrollView contentContainerClassName="px-6 pt-6 pb-10">
        <View className="flex-row items-center gap-2 mb-8">
          <Image
            source={require("../../assets/images/logo.png")}
            className="w-10 h-10"
            resizeMode="contain"
          />
          <H1 className="font-manrope-extrabold text-xl tracking-tight text-premium-black">
            MANEVA
          </H1>
        </View>

        <View className="mb-6">
          <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] uppercase text-gold mb-2">
            Configuración
          </Caption>
          <H1 className="font-manrope-extrabold text-3xl text-premium-black mb-2">
            Preferencias
          </H1>
          <Body className="font-manrope text-premium-gray">
            Elige los servicios que más te interesan para personalizar tu
            inicio.
          </Body>
        </View>

        <View className="mb-6">
          <Caption className="font-manrope-semibold text-premium-gray text-[11px] uppercase tracking-[1.8px] mb-3">
            Servicios de interés
          </Caption>
          <View className="flex-row flex-wrap gap-2">
            {SERVICES.map((service) => {
              const isActive = selectedSet.has(service);
              return (
                <TouchableOpacity
                  key={service}
                  onPress={() => toggleService(service)}
                  activeOpacity={0.85}
                  className={`self-start shrink-0 px-3 py-2 rounded-full border ${
                    isActive
                      ? "bg-premium-black border-premium-black"
                      : "bg-premium-white border-[#DDDDDD]"
                  }`}
                >
                  <Caption
                    className={`font-manrope-extrabold uppercase tracking-[0.8px] text-[10px] ${
                      isActive ? "text-premium-white" : "text-premium-black"
                    }`}
                  >
                    {service}
                  </Caption>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {error && (
          <View className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3">
            <Body className="font-manrope-medium text-red-600 text-sm">
              {error}
            </Body>
          </View>
        )}

        <TouchableOpacity
          className={`w-full bg-gold rounded-2xl py-4 items-center ${canContinue ? "" : "opacity-50"}`}
          activeOpacity={0.85}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Caption className="font-manrope-extrabold !text-black uppercase tracking-widest text-[11px]">
              Continuar
            </Caption>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
