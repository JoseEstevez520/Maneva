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
  const trimmedPhone = phone?.trim() || undefined;

  if (trimmedPhone) {
    const exists = await checkPhoneExists(trimmedPhone);
    if (exists) {
      const err = new Error("PHONE_ALREADY_EXISTS");
      err.name = "PHONE_ALREADY_EXISTS";
      throw err;
    }
  }

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
        phone: trimmedPhone ?? "",
      },
    },
  });
  if (error) throw error;

  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
  }

  if (trimmedPhone) {
    const { data: sessionData } = await supabase.auth.getUser();
    if (sessionData?.user) {
      await supabase
        .from("users")
        .update({ phone: normalizePhoneE164(trimmedPhone) })
        .eq("id", sessionData.user.id);
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes("auth session missing")) {
      return null;
    }
    throw error;
  }
  return data.user;
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

// ── Merge WhatsApp account ───────────────────────────────────────────────────

export async function signUpAndMerge(
  email: string,
  password: string,
  fullName: string,
  phone: string,
) {
  const trimmedPhone = phone.trim();
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
        phone: trimmedPhone,
      },
    },
  });
  if (error) throw error;

  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
  }

  // Merge: transfiere citas y mensajes de la cuenta WhatsApp a esta nueva cuenta.
  // No es fatal si falla — el usuario queda registrado igualmente.
  const { error: mergeError } = await supabase.functions.invoke(
    "merge-whatsapp-account",
    { body: { phone: normalizePhoneE164(trimmedPhone) } },
  );
  if (mergeError) {
    console.warn("[signUpAndMerge] merge failed:", mergeError.message);
  }

  return data;
}

// ── Phone OTP ────────────────────────────────────────────────────────────────

export async function checkPhoneExists(phone: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("check-phone", {
    body: { phone: normalizePhoneE164(phone) },
  });
  if (error) return false;
  return (data as { exists: boolean })?.exists ?? false;
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizePhoneE164(phone),
  });
  if (error) throw error;
}

export async function verifyPhoneOtp(
  phone: string,
  token: string,
): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    phone: normalizePhoneE164(phone),
    token,
    type: "sms",
  });
  if (error) throw error;
}

// Convierte número español a E.164 (+34XXXXXXXXX)
function normalizePhoneE164(phone: string): string {
  const stripped = phone.replace(/[\s\-().]/g, "");
  if (stripped.startsWith("+")) return stripped;
  if (stripped.startsWith("0034")) return `+${stripped.slice(2)}`;
  if (stripped.startsWith("34") && stripped.length >= 11) return `+${stripped}`;
  if (stripped.length === 9) return `+34${stripped}`;
  return `+${stripped}`;
}
