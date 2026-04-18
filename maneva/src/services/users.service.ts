import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
type UserPreference = Database["public"]["Tables"]["user_preferences"]["Row"];

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle(); // No lanza error si el perfil aún no existe

  if (error) throw error;
  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<
    Omit<UserProfile, "id" | "user_id" | "created_at" | "updated_at">
  >,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("user_id", userId)
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
