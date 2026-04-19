import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Caption, H1, H2, H3 } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { deleteMyAccount } from "@/services/auth.service";

// ── Sección con título y tarjeta ────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

// ── Fila de información (solo lectura) ──────────────────────────────────────
function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={`px-5 py-4 ${!last ? "border-b border-[#F0F0F0]" : ""}`}
    >
      <Caption className="font-manrope-semibold text-[10px] uppercase tracking-[1.5px] text-premium-gray mb-1">
        {label}
      </Caption>
      <Body className="font-manrope-medium text-premium-black">{value || "—"}</Body>
    </View>
  );
}

// ── Avatar con iniciales ─────────────────────────────────────────────────────
function Avatar({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <View className="w-20 h-20 rounded-full bg-premium-black items-center justify-center mb-4">
      <H2 className="text-white font-manrope-extrabold text-2xl">{initials}</H2>
    </View>
  );
}

// ── Pantalla principal ───────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { user } = useAuthStore();
  const { data: profile, loading, error, updateProfile } = useUserProfile();
  const { logout } = useAuth();

  // Estado del formulario de edición
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Sincronizar campos cuando lleguen los datos
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const handleEdit = () => {
    setSaveError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    // Restaurar valores originales
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setPhone(profile?.phone ?? "");
    setSaveError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      setSaveError("El nombre no puede estar vacío.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      setEditing(false);
    } catch (e: unknown) {
      setSaveError(
        e instanceof Error ? e.message : "No se pudo guardar. Inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que quieres cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Eliminar cuenta",
      "Esta acción es irreversible. Todos tus datos se eliminarán permanentemente. ¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar cuenta",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMyAccount();
            } catch (e: unknown) {
              Alert.alert(
                "Error",
                e instanceof Error
                  ? e.message
                  : "No se pudo eliminar la cuenta. Inténtalo más tarde."
              );
            }
          },
        },
      ]
    );
  };

  if (loading && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-premium-white-soft items-center justify-center">
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const displayFirstName = profile?.first_name ?? "";
  const displayLastName = profile?.last_name ?? "";
  const email = user?.email ?? "";

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cabecera de página ── */}
        <View className="flex-row items-center gap-2 mb-8">
          <H1 className="font-manrope-extrabold text-xl tracking-tight text-premium-black">
            Perfil
          </H1>
        </View>

        {/* ── Avatar + nombre + email ── */}
        <View className="items-center mb-8">
          <Avatar firstName={displayFirstName} lastName={displayLastName} />
          <H3 className="font-manrope-extrabold text-premium-black text-center">
            {[displayFirstName, displayLastName].filter(Boolean).join(" ") || "Sin nombre"}
          </H3>
          <Body className="font-manrope text-premium-gray text-center mt-1">
            {email}
          </Body>
        </View>

        {/* ── Error global de carga ── */}
        {error && !editing && (
          <View className="mb-5">
            <ErrorMessage message={error} />
          </View>
        )}

        {/* ── Datos personales ── */}
        <Section title="Datos personales">
          {editing ? (
            <View className="px-5 py-4 gap-4">
              <Input
                label="Nombre"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Tu nombre"
              />
              <Input
                label="Apellidos"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Tus apellidos"
              />
              <Input
                label="Teléfono"
                value={phone}
                onChangeText={setPhone}
                placeholder="+34 600 000 000"
              />

              {saveError && (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <Body className="font-manrope-medium text-red-600 text-sm">
                    {saveError}
                  </Body>
                </View>
              )}

              <View className="flex-row gap-3 mt-1">
                <View className="flex-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                </View>
                <View className="flex-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving}
                  >
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
                onPress={handleEdit}
                activeOpacity={0.7}
              >
                <Caption className="font-manrope-extrabold uppercase tracking-widest text-[11px] text-premium-black">
                  Editar datos
                </Caption>
              </TouchableOpacity>
            </>
          )}
        </Section>

        {/* ── Cuenta ── */}
        <Section title="Cuenta">
          <InfoRow label="Correo electrónico" value={email} last />
        </Section>

        {/* ── Sesión ── */}
        <Section title="Sesión">
          <TouchableOpacity
            className="px-5 py-4 flex-row items-center justify-between"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Body className="font-manrope-semibold text-premium-black">
              Cerrar sesión
            </Body>
            <Caption className="font-manrope-medium text-premium-gray text-xs">
              →
            </Caption>
          </TouchableOpacity>
        </Section>

        {/* ── Zona de peligro ── */}
        <Section title="Zona de peligro">
          <TouchableOpacity
            className="px-5 py-4 flex-row items-center justify-between"
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Body className="font-manrope-semibold text-red-600">
              Eliminar cuenta
            </Body>
            <Caption className="font-manrope-medium text-red-400 text-xs">
              →
            </Caption>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
