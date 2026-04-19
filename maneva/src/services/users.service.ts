import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";

// users → identidad básica (nombre, teléfono, idioma)
type UserBasicInfo = Database["public"]["Tables"]["users"]["Row"];
// user_preferences → preferencias del onboarding (ciudad, servicios, etc.)
type UserPreference = Database["public"]["Tables"]["user_preferences"]["Row"];

export async function getUserProfile(
  userId: string,
): Promise<UserBasicInfo | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserBasicInfo, "id" | "created_at" | "updated_at">>,
): Promise<UserBasicInfo> {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserPreference(
  userId: string,
  preferenceKey: string,
): Promise<UserPreference | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("preference_key", preferenceKey)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function setUserPreference(
  userId: string,
  preferenceKey: string,
  preferenceValue: string,
): Promise<void> {
  const payload = {
    user_id: userId,
    preference_key: preferenceKey,
    preference_value: preferenceValue,
  };

  // Intento 1: insertar directo (funciona si no existe o no hay restricción única).
  const { error: insertError } = await supabase
    .from("user_preferences")
    .insert(payload);

  if (!insertError) return;

  // Intento 2: actualizar la preferencia existente.
  const { error: updateError } = await supabase
    .from("user_preferences")
    .update({ preference_value: preferenceValue })
    .eq("user_id", userId)
    .eq("preference_key", preferenceKey);

  if (updateError) {
    throw updateError;
  }
}

export async function replaceUserPreferences(
  userId: string,
  preferenceKey: string,
  values: string[],
): Promise<void> {
  const sanitizedValues = Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  );

  const { error: deleteError } = await supabase
    .from("user_preferences")
    .delete()
    .eq("user_id", userId)
    .eq("preference_key", preferenceKey);

  if (deleteError) throw deleteError;

  if (sanitizedValues.length === 0) return;

  const rows = sanitizedValues.map((value) => ({
    user_id: userId,
    preference_key: preferenceKey,
    preference_value: value,
  }));

  const { error: insertError } = await supabase
    .from("user_preferences")
    .insert(rows);

  if (insertError) throw insertError;
}
