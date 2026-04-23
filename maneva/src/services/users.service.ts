import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";

// users → identidad básica (nombre, teléfono, idioma)
type UserBasicInfo = Database["public"]["Tables"]["users"]["Row"];
type Employee = Database["public"]["Tables"]["employees"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];
// user_preferences → preferencias del onboarding (ciudad, servicios, etc.)
type UserPreference = Database["public"]["Tables"]["user_preferences"]["Row"];
// user_profiles → estilo personal (tipo de pelo, estilos preferidos, modo simple)
type UserStyleProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
// languages → idiomas disponibles
type Language = Database["public"]["Tables"]["languages"]["Row"];

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

  // Detectar si el DB devuelve un valor distinto al enviado (trigger sobrescribiendo).
  if (__DEV__) {
    for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
      if (data[key] !== (updates as Record<string, unknown>)[key]) {
        console.warn(
          `[updateUserProfile] Campo "${String(key)}" no se guardó. Enviado: ${(updates as Record<string, unknown>)[key]}, DB devolvió: ${data[key]}. Posible trigger o RLS bloqueando la escritura.`,
        );
      }
    }
  }

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
  // Borra el valor anterior y lo reemplaza. Consistente con replaceUserPreferences
  // y no depende de que exista o no un UNIQUE constraint en la tabla.
  const { error: deleteError } = await supabase
    .from("user_preferences")
    .delete()
    .eq("user_id", userId)
    .eq("preference_key", preferenceKey);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("user_preferences")
    .insert({
      user_id: userId,
      preference_key: preferenceKey,
      preference_value: preferenceValue,
    });

  if (insertError) throw insertError;
}

// Devuelve todos los valores de una preferencia multi-valor (ej: service_interest)
export async function getAllUserPreferences(
  userId: string,
  preferenceKey: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("preference_value")
    .eq("user_id", userId)
    .eq("preference_key", preferenceKey);

  if (error) throw error;
  return (data ?? []).map((r) => r.preference_value ?? '').filter(Boolean);
}

export async function getLanguages(): Promise<Language[]> {
  const { data, error } = await supabase
    .from("languages")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getUserStyleProfile(
  userId: string,
): Promise<UserStyleProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertUserStyleProfile(
  userId: string,
  updates: Partial<
    Omit<UserStyleProfile, "id" | "user_id" | "created_at" | "updated_at">
  >,
): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" });

  if (error) throw error;
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

// ─── Estilistas favoritos ───────────────────────────────────────────────────

export type EmployeeWithUser = Employee & {
  users: Pick<User, 'first_name' | 'last_name'> | null
}

/** Devuelve todos los empleados activos con su nombre de usuario. */
export async function getAllActiveEmployees(): Promise<EmployeeWithUser[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, photo_url, bio, position, specialties, location_id, users(first_name, last_name)')
    .eq('active', true)
    .order('id')

  if (error) throw error
  return (data ?? []) as EmployeeWithUser[]
}

/** Devuelve los IDs de empleados marcados como favoritos por el usuario. */
export async function getFavoriteEmployeeIds(userId: string): Promise<string[]> {
  return getAllUserPreferences(userId, 'favorite_stylist')
}

/** Añade un empleado a favoritos. */
export async function addFavoriteEmployee(userId: string, employeeId: string): Promise<void> {
  const current = await getFavoriteEmployeeIds(userId)
  if (current.includes(employeeId)) return
  await replaceUserPreferences(userId, 'favorite_stylist', [...current, employeeId])
}

/** Elimina un empleado de favoritos. */
export async function removeFavoriteEmployee(userId: string, employeeId: string): Promise<void> {
  const current = await getFavoriteEmployeeIds(userId)
  await replaceUserPreferences(userId, 'favorite_stylist', current.filter((id) => id !== employeeId))
}

// ─── Cortes de referencia ───────────────────────────────────────────────────

/** Devuelve las URLs de los cortes de referencia del usuario. */
export async function getReferenceCuts(userId: string): Promise<string[]> {
  return getAllUserPreferences(userId, 'reference_cut')
}

/** Añade una URL de corte de referencia. */
export async function addReferenceCut(userId: string, url: string): Promise<void> {
  const current = await getReferenceCuts(userId)
  await replaceUserPreferences(userId, 'reference_cut', [...current, url])
}

/** Elimina una URL de corte de referencia. */
export async function removeReferenceCut(userId: string, url: string): Promise<void> {
  const current = await getReferenceCuts(userId)
  await replaceUserPreferences(userId, 'reference_cut', current.filter((u) => u !== url))
}
