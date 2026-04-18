import { Button } from "@/components/ui/Button";
import { ScreenLayout } from "@/components/ui/ScreenLayout";
import { H2 } from "@/components/ui/Typography";
import { supabase } from "@/lib/supabase";
import { deleteMyAccount } from "@/services/auth.service";
import React, { useState } from "react";
import { Alert, View } from "react-native";

export default function SettingsScreen() {
  const [deleting, setDeleting] = useState(false);

  const extractErrorMessage = (error: unknown) => {
    if (error && typeof error === "object") {
      const maybe = error as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
      const parts = [maybe.message, maybe.details, maybe.hint]
        .filter((part) => Boolean(part && part.trim()))
        .join("\n");
      if (parts) return parts;
      if (maybe.code) return `Error ${maybe.code}`;
    }

    if (error instanceof Error) return error.message;
    return "No se pudo eliminar la cuenta.";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Eliminar cuenta",
      "Esta accion eliminara tu cuenta de forma permanente. No se puede deshacer.\n\nDeseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteMyAccount();

              // Si la cuenta se borra, la sesión puede quedar inválida y signOut puede fallar.
              // No debe bloquear el flujo de éxito.
              try {
                await supabase.auth.signOut();
              } catch {
                // Ignorado a propósito.
              }

              Alert.alert(
                "Cuenta eliminada",
                "Tu cuenta se elimino correctamente.",
              );
            } catch (e: unknown) {
              const message = extractErrorMessage(e);
              const lower = message.toLowerCase();
              const hint =
                lower.includes("delete_my_account") ||
                lower.includes("could not find the function")
                  ? "\n\nFalta crear la funcion SQL delete_my_account en Supabase (scripts/delete_my_account.sql)."
                  : "";
              Alert.alert("Error", `${message}${hint}`);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenLayout header="brand">
      <View className="flex-1 px-4 mt-8">
        <H2 className="mb-6">Ajustes</H2>

        <View className="mt-auto mb-10 gap-3">
          <Button variant="danger" onPress={handleLogout}>
            Cerrar sesión
          </Button>
          <Button
            variant="danger"
            onPress={handleDeleteAccount}
            loading={deleting}
          >
            Eliminar cuenta
          </Button>
        </View>
      </View>
    </ScreenLayout>
  );
}
