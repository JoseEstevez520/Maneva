import { supabase } from "@/lib/supabase";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone?: string,
) {
  // Separar nombre y apellido para el trigger de la base de datos (tabla users)
  const [firstName, ...lastNameParts] = fullName.split(" ");
  const lastName = lastNameParts.join(" ") || "";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone: phone ?? "",
      },
    },
  });
  if (error) throw error;

  // Si Supabase no devuelve sesión al registrarse, iniciamos sesión
  // con las mismas credenciales para garantizar login inmediato.
  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
  }

  // El trigger de Supabase crea la fila en public.users con first_name y last_name
  // pero normalmente no copia el teléfono desde raw_user_meta_data.
  // Lo escribimos explícitamente para garantizar que quede guardado.
  if (phone?.trim()) {
    const { data: sessionData } = await supabase.auth.getUser();
    if (sessionData?.user) {
      await supabase
        .from("users")
        .update({ phone: phone.trim() })
        .eq("id", sessionData.user.id);
      // Fallo silencioso: no bloqueamos el registro si esta escritura falla.
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Devuelve el usuario autenticado actual.
 * Usar este helper en lugar de llamar a supabase.auth.getUser() fuera de services/.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    const normalized = error.message.toLowerCase();
    // Sin sesión activa no debe romper la app; simplemente no hay usuario autenticado.
    if (normalized.includes("auth session missing")) {
      return null;
    }
    throw error;
  }
  return data.user;
}

/**
 * Elimina la cuenta del usuario actual via RPC.
 * Nota: 'delete_my_account' existe en la BD pero aún no está en los tipos generados.
 * Regenerar con: npx supabase gen types typescript --project-id <ID> > src/types/database.types.ts
 */
export async function deleteMyAccount() {
  const { error } = await supabase.rpc("delete_my_account" as never);
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}
