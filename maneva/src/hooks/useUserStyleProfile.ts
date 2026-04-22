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
type PreferredTimeSlot = "morning" | "afternoon" | "custom";

function resolvePreferredTimeSlot(preferredHour: number | null, preferenceValue: string | null) {
  if (preferenceValue === "custom") return "custom";
  if (preferenceValue === "morning" || preferenceValue === "afternoon") return preferenceValue;

  if (!preferredHour) return "morning";
  return preferredHour >= 16 ? "afternoon" : "morning";
}

export function useUserStyleProfile() {
  const { user } = useAuthStore();

  const [styleProfile, setStyleProfile] = useState<UserStyleProfile | null>(
    null,
  );
  const [languages, setLanguages] = useState<Language[]>([]);
  const [city, setCity] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [preferredHour, setPreferredHour] = useState<number | null>(null);
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<PreferredTimeSlot>("morning");
  const [availabilityRanges, setAvailabilityRanges] = useState<string[]>([]);
  const [activeAvailabilityRange, setActiveAvailabilityRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [
        styleData,
        langsData,
        cityPref,
        servicesList,
        preferredHourPref,
        preferredTimeSlotPref,
        availabilityRangesPref,
        activeAvailabilityRangePref,
      ] = await Promise.all([
        getUserStyleProfile(user.id),
        getLanguages(),
        getUserPreference(user.id, "city"),
        getAllUserPreferences(user.id, "service_interest"),
        getUserPreference(user.id, "preferred_hour"),
        getUserPreference(user.id, "preferred_time_slot"),
        getAllUserPreferences(user.id, "availability_range"),
        getUserPreference(user.id, "active_availability_range"),
      ]);
      setStyleProfile(styleData);
      setLanguages(langsData);
      setCity(cityPref?.preference_value ?? "");
      setServices(servicesList);
      const parsedPreferredHour = preferredHourPref?.preference_value
        ? Number(preferredHourPref.preference_value)
        : NaN;
      setPreferredHour(
        Number.isFinite(parsedPreferredHour) ? parsedPreferredHour : null,
      );
      setPreferredTimeSlot(
        resolvePreferredTimeSlot(
          Number.isFinite(parsedPreferredHour) ? parsedPreferredHour : null,
          preferredTimeSlotPref?.preference_value ?? null,
        ),
      );
      setAvailabilityRanges(availabilityRangesPref);
      setActiveAvailabilityRange(
        activeAvailabilityRangePref?.preference_value && availabilityRangesPref.includes(activeAvailabilityRangePref.preference_value)
          ? activeAvailabilityRangePref.preference_value
          : availabilityRangesPref.length > 0
            ? availabilityRangesPref[availabilityRangesPref.length - 1]
            : "",
      );
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

  const savePreferredHour = async (hour: number) => {
    if (!user) return;
    await setUserPreference(user.id, "preferred_hour", String(hour));
    setPreferredHour(hour);
  };

  const savePreferredTimeSlot = async (timeSlot: PreferredTimeSlot) => {
    if (!user) return;
    await setUserPreference(user.id, "preferred_time_slot", timeSlot);
    setPreferredTimeSlot(timeSlot);
  };

  const saveAvailabilityRange = async (range: string) => {
    if (!user) return;
    const normalizedRange = range.trim();
    const nextRanges = Array.from(new Set([...availabilityRanges, normalizedRange]));

    await replaceUserPreferences(user.id, "availability_range", nextRanges);
    await setUserPreference(user.id, "active_availability_range", normalizedRange);
    await setUserPreference(user.id, "preferred_time_slot", "custom");

    setAvailabilityRanges(nextRanges);
    setActiveAvailabilityRange(normalizedRange);
    setPreferredTimeSlot("custom");
  };

  const activateAvailabilityRange = async (range: string) => {
    if (!user) return;
    const normalizedRange = range.trim();
    await setUserPreference(user.id, "active_availability_range", normalizedRange);
    await setUserPreference(user.id, "preferred_time_slot", "custom");
    setActiveAvailabilityRange(normalizedRange);
    setPreferredTimeSlot("custom");
  };

  const deleteAvailabilityRange = async (range: string) => {
    if (!user) return;
    const normalizedRange = range.trim();
    const nextRanges = availabilityRanges.filter((item) => item !== normalizedRange);

    await replaceUserPreferences(user.id, "availability_range", nextRanges);
    setAvailabilityRanges(nextRanges);

    if (activeAvailabilityRange === normalizedRange) {
      const nextActiveRange = nextRanges.length > 0 ? nextRanges[nextRanges.length - 1] : "";
      await setUserPreference(user.id, "active_availability_range", nextActiveRange);
      setActiveAvailabilityRange(nextActiveRange);
      setPreferredTimeSlot(nextActiveRange ? "custom" : resolvePreferredTimeSlot(preferredHour, null));
      return;
    }

    if (nextRanges.length === 0) {
      await setUserPreference(user.id, "active_availability_range", "");
    }
  };

  return {
    styleProfile,
    languages,
    city,
    services,
    preferredHour,
    preferredTimeSlot,
    availabilityRanges,
    activeAvailabilityRange,
    availabilityRange: activeAvailabilityRange,
    loading,
    error,
    refresh: fetchAll,
    saveStyleProfile,
    saveCity,
    saveServices,
    savePreferredHour,
    savePreferredTimeSlot,
    saveAvailabilityRange,
    activateAvailabilityRange,
    deleteAvailabilityRange,
  };
}
