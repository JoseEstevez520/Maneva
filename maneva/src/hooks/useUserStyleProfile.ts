import { useCallback, useEffect, useState } from "react";
import {
  getAllUserPreferences,
  getLanguages,
  getUserPreference,
  getUserStyleProfile,
  replaceUserPreferences,
  setUserPreference,
  upsertUserStyleProfile,
} from "@/services/users.service";
import { useAuthStore } from "@/store/authStore";
import { Database } from "@/types/database.types";

type UserStyleProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
type Language = Database["public"]["Tables"]["languages"]["Row"];

export function useUserStyleProfile() {
  const { user } = useAuthStore();

  const [styleProfile, setStyleProfile] = useState<UserStyleProfile | null>(
    null,
  );
  const [languages, setLanguages] = useState<Language[]>([]);
  const [city, setCity] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [styleData, langsData, cityPref, servicesList] = await Promise.all([
        getUserStyleProfile(user.id),
        getLanguages(),
        getUserPreference(user.id, "city"),
        getAllUserPreferences(user.id, "service_interest"),
      ]);
      setStyleProfile(styleData);
      setLanguages(langsData);
      setCity(cityPref?.preference_value ?? "");
      setServices(servicesList);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Error cargando preferencias",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveStyleProfile = async (
    updates: Partial<
      Omit<UserStyleProfile, "id" | "user_id" | "created_at" | "updated_at">
    >,
  ) => {
    if (!user) return;
    await upsertUserStyleProfile(user.id, updates);
    const fresh = await getUserStyleProfile(user.id);
    setStyleProfile(fresh);
  };

  const saveCity = async (newCity: string) => {
    if (!user) return;
    await setUserPreference(user.id, "city", newCity.trim());
    setCity(newCity.trim());
  };

  const saveServices = async (newServices: string[]) => {
    if (!user) return;
    await replaceUserPreferences(user.id, "service_interest", newServices);
    setServices(newServices);
  };

  return {
    styleProfile,
    languages,
    city,
    services,
    loading,
    error,
    refresh: fetchAll,
    saveStyleProfile,
    saveCity,
    saveServices,
  };
}
