import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Body, Caption, H1, H2, H3 } from "@/components/ui/Typography";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserStyleProfile } from "@/hooks/useUserStyleProfile";
import { deleteMyAccount } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

const SERVICES = [
  "Corte", "Color", "Mechas", "Barba", "Manicura",
  "Pedicura", "Tratamientos", "Uñas", "Peinados", "Extensiones",
];
const HAIR_TYPES = ["Liso", "Ondulado", "Rizado", "Muy rizado", "Afro"];
const STYLE_OPTIONS = ["Clásico", "Moderno", "Casual", "Elegante", "Natural", "Atrevido"];

// ── Primitivos de UI ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] uppercase text-gold mb-3 px-1">
        {title}
      </Caption>
      <View className="bg-white rounded-2xl overflow-hidden border border-[#F0F0F0]">
        {children}
      </View>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`px-5 py-4 ${!last ? "border-b border-[#F0F0F0]" : ""}`}>
      <Caption className="font-manrope-semibold text-[10px] uppercase tracking-[1.5px] text-premium-gray mb-1">
        {label}
      </Caption>
      <Body className="font-manrope-medium text-premium-black">{value || "—"}</Body>
    </View>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <View className="mx-5 mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
      <Body className="font-manrope-medium text-red-600 text-sm">{message}</Body>
    </View>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
  singleSelect = false,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  singleSelect?: boolean;
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const isActive = selectedSet.has(option);
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onToggle(option)}
            activeOpacity={0.85}
            className={`self-start px-3 py-2 rounded-full border ${
              isActive ? "bg-premium-black border-premium-black" : "bg-white border-[#DDDDDD]"
            }`}
          >
            <Caption
              className={`font-manrope-extrabold uppercase tracking-[0.8px] text-[10px] ${
                isActive ? "text-white" : "text-premium-black"
              }`}
            >
              {option}
            </Caption>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <View className="w-20 h-20 rounded-full bg-premium-black items-center justify-center mb-4">
      <H2 className="text-white font-manrope-extrabold text-2xl">{initials}</H2>
    </View>
  );
}

// ── Pantalla principal ───────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { data: profile, loading: loadingProfile, error: profileError, updateProfile } = useUserProfile();
  const {
    styleProfile, languages, city, services,
    loading: loadingStyle, error: styleError,
    saveStyleProfile, saveCity, saveServices,
  } = useUserStyleProfile();

  // ── Datos personales ──
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  // ── Ciudad ──
  const [editingCity, setEditingCity] = useState(false);
  const [cityDraft, setCityDraft] = useState("");
  const [savingCity, setSavingCity] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);

  useEffect(() => { setCityDraft(city); }, [city]);

  // ── Servicios de interés ──
  const [servicesDraft, setServicesDraft] = useState<string[]>([]);
  const [savingServices, setSavingServices] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);

  useEffect(() => { setServicesDraft(services); }, [services]);

  const servicesDirty = useMemo(
    () => JSON.stringify([...servicesDraft].sort()) !== JSON.stringify([...services].sort()),
    [servicesDraft, services],
  );

  // ── Estilo personal ──
  const [hairDraft, setHairDraft] = useState<string[]>([]);
  const [stylesDraft, setStylesDraft] = useState<string[]>([]);
  const [simpleDraft, setSimpleDraft] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [styleFormError, setStyleFormError] = useState<string | null>(null);

  useEffect(() => {
    if (styleProfile !== undefined) {
      setHairDraft(styleProfile?.hair_type ? [styleProfile.hair_type] : []);
      setStylesDraft(
        styleProfile?.preferred_styles
          ? styleProfile.preferred_styles.split(",").filter(Boolean)
          : [],
      );
      setSimpleDraft(styleProfile?.simple_mode ?? false);
    }
  }, [styleProfile]);

  const styleDirty = useMemo(() => {
    const origHair = styleProfile?.hair_type ?? "";
    const origStyles = styleProfile?.preferred_styles ?? "";
    const origSimple = styleProfile?.simple_mode ?? false;
    return (
      (hairDraft[0] ?? "") !== origHair ||
      [...stylesDraft].sort().join(",") !== origStyles.split(",").sort().join(",") ||
      simpleDraft !== origSimple
    );
  }, [hairDraft, stylesDraft, simpleDraft, styleProfile]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSavePersonal = async () => {
    if (!firstName.trim()) {
      setPersonalError("El nombre no puede estar vacío.");
      return;
    }
    setSavingPersonal(true);
    setPersonalError(null);
    try {
      await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() });
      setEditingPersonal(false);
    } catch (e: unknown) {
      setPersonalError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleCancelPersonal = () => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setPhone(profile?.phone ?? "");
    setPersonalError(null);
    setEditingPersonal(false);
  };

  const handleLanguagePress = () => {
    if (!languages.length) return;
    const currentLangId = profile?.language_id;
    Alert.alert(
      "Idioma",
      "Selecciona tu idioma preferido",
      [
        ...languages.map((lang) => ({
          text: lang.name + (lang.id === currentLangId ? " ✓" : ""),
          onPress: async () => {
            try {
              await updateProfile({ language_id: lang.id });
            } catch {
              Alert.alert("Error", "No se pudo cambiar el idioma.");
            }
          },
        })),
        { text: "Cancelar", style: "cancel" as const },
      ],
    );
  };

  const handleSaveCity = async () => {
    if (!cityDraft.trim()) {
      setCityError("La ciudad no puede estar vacía.");
      return;
    }
    setSavingCity(true);
    setCityError(null);
    try {
      await saveCity(cityDraft);
      setEditingCity(false);
    } catch (e: unknown) {
      setCityError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSavingCity(false);
    }
  };

  const toggleService = (service: string) => {
    setServicesError(null);
    setServicesDraft((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  };

  const handleSaveServices = async () => {
    if (!servicesDraft.length) {
      setServicesError("Selecciona al menos un servicio.");
      return;
    }
    setSavingServices(true);
    setServicesError(null);
    try {
      await saveServices(servicesDraft);
    } catch (e: unknown) {
      setServicesError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSavingServices(false);
    }
  };

  const toggleHair = (value: string) => {
    setStyleFormError(null);
    setHairDraft((prev) => (prev[0] === value ? [] : [value]));
  };

  const toggleStyle = (value: string) => {
    setStyleFormError(null);
    setStylesDraft((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  };

  const handleSimpleModeToggle = async (value: boolean) => {
    setSimpleDraft(value);
    try {
      await saveStyleProfile({ simple_mode: value });
    } catch {
      setSimpleDraft(!value);
    }
  };

  const handleSaveStyle = async () => {
    setSavingStyle(true);
    setStyleFormError(null);
    try {
      await saveStyleProfile({
        hair_type: hairDraft[0] ?? null,
        preferred_styles: stylesDraft.length ? stylesDraft.join(",") : null,
      });
    } catch (e: unknown) {
      setStyleFormError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSavingStyle(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: () => logout() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Eliminar cuenta",
      "Esta acción es irreversible. Todos tus datos se eliminarán permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar cuenta",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMyAccount();
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "No se pudo eliminar la cuenta.");
            }
          },
        },
      ],
    );
  };

  // ── Derivados ────────────────────────────────────────────────────────────

  const isLoading = (loadingProfile || loadingStyle) && !profile && !styleProfile;
  const displayFirstName = profile?.first_name ?? "";
  const displayLastName = profile?.last_name ?? "";
  const email = user?.email ?? "";
  const currentLanguage = languages.find((l) => l.id === profile?.language_id);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-premium-white-soft items-center justify-center">
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cabecera ── */}
        <H1 className="font-manrope-extrabold text-xl tracking-tight text-premium-black mb-8">
          Perfil
        </H1>

        {/* ── Avatar ── */}
        <View className="items-center mb-8">
          <Avatar firstName={displayFirstName} lastName={displayLastName} />
          <H3 className="font-manrope-extrabold text-premium-black text-center">
            {[displayFirstName, displayLastName].filter(Boolean).join(" ") || "Sin nombre"}
          </H3>
          <Body className="font-manrope text-premium-gray text-center mt-1">{email}</Body>
        </View>

        {/* ── Errores globales de carga ── */}
        {profileError && !editingPersonal && (
          <View className="mb-5"><ErrorMessage message={profileError} /></View>
        )}
        {styleError && (
          <View className="mb-5"><ErrorMessage message={styleError} /></View>
        )}

        {/* ════════════════════════════════════════════════
            DATOS PERSONALES
        ════════════════════════════════════════════════ */}
        <Section title="Datos personales">
          {editingPersonal ? (
            <View className="px-5 py-4 gap-4">
              <Input label="Nombre" value={firstName} onChangeText={setFirstName} placeholder="Tu nombre" />
              <Input label="Apellidos" value={lastName} onChangeText={setLastName} placeholder="Tus apellidos" />
              <Input label="Teléfono" value={phone} onChangeText={setPhone} placeholder="+34 600 000 000" keyboardType="phone-pad" />
              {personalError && <SectionError message={personalError} />}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button variant="secondary" size="sm" onPress={handleCancelPersonal} disabled={savingPersonal}>
                    Cancelar
                  </Button>
                </View>
                <View className="flex-1">
                  <Button variant="primary" size="sm" onPress={handleSavePersonal} loading={savingPersonal} disabled={savingPersonal}>
                    Guardar
                  </Button>
                </View>
              </View>
            </View>
          ) : (
            <>
              <InfoRow label="Nombre" value={displayFirstName} />
              <InfoRow label="Apellidos" value={displayLastName} />
              <InfoRow label="Teléfono" value={profile?.phone ?? ""} last />
              <TouchableOpacity
                className="mx-5 mb-4 mt-1 border border-[#E0E0E0] rounded-xl py-3 items-center"
                onPress={() => { setPersonalError(null); setEditingPersonal(true); }}
                activeOpacity={0.7}
              >
                <Caption className="font-manrope-extrabold uppercase tracking-widest text-[11px] text-premium-black">
                  Editar datos
                </Caption>
              </TouchableOpacity>
            </>
          )}
        </Section>

        {/* ════════════════════════════════════════════════
            CUENTA
        ════════════════════════════════════════════════ */}
        <Section title="Cuenta">
          <InfoRow label="Correo electrónico" value={email} />
          <TouchableOpacity
            className="px-5 py-4 flex-row items-center justify-between border-t border-[#F0F0F0]"
            onPress={handleLanguagePress}
            activeOpacity={0.7}
            disabled={!languages.length}
          >
            <View>
              <Caption className="font-manrope-semibold text-[10px] uppercase tracking-[1.5px] text-premium-gray mb-1">
                Idioma
              </Caption>
              <Body className="font-manrope-medium text-premium-black">
                {currentLanguage?.name ?? "—"}
              </Body>
            </View>
            <Caption className="font-manrope-medium text-premium-gray text-xs">→</Caption>
          </TouchableOpacity>
        </Section>

        {/* ════════════════════════════════════════════════
            PREFERENCIAS DE BÚSQUEDA
        ════════════════════════════════════════════════ */}
        <Section title="Preferencias de búsqueda">
          {/* Ciudad */}
          {editingCity ? (
            <View className="px-5 py-4 gap-3 border-b border-[#F0F0F0]">
              <Input label="Ciudad" value={cityDraft} onChangeText={setCityDraft} placeholder="Ej: Madrid" />
              {cityError && <SectionError message={cityError} />}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button variant="secondary" size="sm" onPress={() => { setCityDraft(city); setCityError(null); setEditingCity(false); }} disabled={savingCity}>
                    Cancelar
                  </Button>
                </View>
                <View className="flex-1">
                  <Button variant="primary" size="sm" onPress={handleSaveCity} loading={savingCity} disabled={savingCity}>
                    Guardar
                  </Button>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              className="px-5 py-4 flex-row items-center justify-between border-b border-[#F0F0F0]"
              onPress={() => { setCityError(null); setEditingCity(true); }}
              activeOpacity={0.7}
            >
              <View>
                <Caption className="font-manrope-semibold text-[10px] uppercase tracking-[1.5px] text-premium-gray mb-1">
                  Ciudad
                </Caption>
                <Body className="font-manrope-medium text-premium-black">{city || "—"}</Body>
              </View>
              <Caption className="font-manrope-medium text-premium-gray text-xs">→</Caption>
            </TouchableOpacity>
          )}

          {/* Servicios */}
          <View className="px-5 py-4">
            <Caption className="font-manrope-semibold text-[10px] uppercase tracking-[1.5px] text-premium-gray mb-3">
              Servicios de interés
            </Caption>
            <ChipGroup options={SERVICES} selected={servicesDraft} onToggle={toggleService} />
            {servicesError && <View className="mt-3"><SectionError message={servicesError} /></View>}
            {servicesDirty && (
              <View className="mt-4">
                <Button variant="primary" size="sm" onPress={handleSaveServices} loading={savingServices} disabled={savingServices}>
                  Guardar servicios
                </Button>
              </View>
            )}
          </View>
        </Section>

        {/* ════════════════════════════════════════════════
            TU ESTILO
        ════════════════════════════════════════════════ */}
        <Section title="Tu estilo">
          {/* Tipo de pelo */}
          <View className="px-5 py-4 border-b border-[#F0F0F0]">
            <Caption className="font-manrope-semibold text-[10px] uppercase tracking-[1.5px] text-premium-gray mb-3">
              Tipo de pelo
            </Caption>
            <ChipGroup options={HAIR_TYPES} selected={hairDraft} onToggle={toggleHair} singleSelect />
          </View>

          {/* Estilos preferidos */}
          <View className="px-5 py-4 border-b border-[#F0F0F0]">
            <Caption className="font-manrope-semibold text-[10px] uppercase tracking-[1.5px] text-premium-gray mb-3">
              Estilos preferidos
            </Caption>
            <ChipGroup options={STYLE_OPTIONS} selected={stylesDraft} onToggle={toggleStyle} />
          </View>

          {/* Modo simple */}
          <View className="px-5 py-4 flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Body className="font-manrope-semibold text-premium-black">Modo simple</Body>
              <Caption className="font-manrope text-premium-gray text-[11px] mt-0.5">
                Muestra solo lo esencial, sin opciones avanzadas
              </Caption>
            </View>
            <Switch
              value={simpleDraft}
              onValueChange={handleSimpleModeToggle}
              trackColor={{ false: "#E5E5E5", true: "#D4AF37" }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Botón guardar estilo */}
          {(styleFormError || styleDirty) && (
            <View className="px-5 pb-4 gap-2">
              {styleFormError && <SectionError message={styleFormError} />}
              {styleDirty && (
                <Button variant="primary" size="sm" onPress={handleSaveStyle} loading={savingStyle} disabled={savingStyle}>
                  Guardar estilo
                </Button>
              )}
            </View>
          )}
        </Section>

        {/* ════════════════════════════════════════════════
            SESIÓN
        ════════════════════════════════════════════════ */}
        <Section title="Sesión">
          <TouchableOpacity
            className="px-5 py-4 flex-row items-center justify-between"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Body className="font-manrope-semibold text-premium-black">Cerrar sesión</Body>
            <Caption className="font-manrope-medium text-premium-gray text-xs">→</Caption>
          </TouchableOpacity>
        </Section>

        {/* ════════════════════════════════════════════════
            ZONA DE PELIGRO
        ════════════════════════════════════════════════ */}
        <Section title="Zona de peligro">
          <TouchableOpacity
            className="px-5 py-4 flex-row items-center justify-between"
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Body className="font-manrope-semibold text-red-600">Eliminar cuenta</Body>
            <Caption className="font-manrope-medium text-red-400 text-xs">→</Caption>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
