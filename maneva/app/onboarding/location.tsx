import { safeStorage } from "@/lib/storage";
import Slider from "@react-native-community/slider";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Circle, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Caption, H1 } from "@/components/ui/Typography";
import { useThemeColors } from "@/hooks/useThemeColors";
import { getCurrentUser } from "@/services/auth.service";
import { setUserPreference } from "@/services/users.service";
import { useAuthStore } from "@/store/authStore";

const POPULAR_CITIES = [
  "Vigo",
  "Madrid",
  "Barcelona",
  "Valencia",
  "Sevilla",
  "Málaga",
  "Bilbao",
  "Zaragoza",
  "Alicante",
];

const DEFAULT_REGION: Region = {
  latitude: 40.4168,
  longitude: -3.7038,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function regionFromCoordinates(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Region {
  const baseDelta = Math.max(0.03, (radiusKm / 111) * 2.4);
  return {
    latitude,
    longitude,
    latitudeDelta: baseDelta,
    longitudeDelta: baseDelta,
  };
}

function normalizeCity(parts: Array<string | null | undefined>): string | null {
  const found = parts.find((item) => item && item.trim().length > 0);
  return found ? found.trim() : null;
}

type GeocodePoint = {
  latitude: number;
  longitude: number;
};

type NominatimReverseItem = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
  };
};

export default function LocationOnboardingScreen() {
  const themeColors = useThemeColors()
  const router = useRouter();
  const { user } = useAuthStore();
  const mapRef = useRef<MapView | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [radiusKm, setRadiusKm] = useState<number>(8);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [resolvingCity, setResolvingCity] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manualCity = search.trim();
  const cityToSave =
    selectedCity ?? (manualCity.length >= 2 ? manualCity : null);

  const centerCoords = {
    latitude: mapRegion.latitude,
    longitude: mapRegion.longitude,
  };

  const centerMapAt = (latitude: number, longitude: number) => {
    const nextRegion = regionFromCoordinates(latitude, longitude, radiusKm);
    setMapRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 450);
  };

  const geocodeCityWithFallback = async (cityName: string) => {
    const trimmedCity = cityName.trim();
    if (!trimmedCity) return null;

    const tries = [
      `${trimmedCity}, España`,
      `${trimmedCity}, Spain`,
      trimmedCity,
    ];

    for (const candidate of tries) {
      try {
        // Nominatim funciona sin permisos del dispositivo y evita el error recurrente de geocodeAsync.
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=es&q=${encodeURIComponent(candidate)}`;
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "ManevaApp/1.0 (location-onboarding)",
          },
        });

        if (response.ok) {
          const data = (await response.json()) as Array<{
            lat: string;
            lon: string;
          }>;
          const first = data[0];
          if (first?.lat && first?.lon) {
            const lat = Number(first.lat);
            const lon = Number(first.lon);
            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
              return { latitude: lat, longitude: lon } as GeocodePoint;
            }
          }
        }
      } catch {
        // Silencioso: seguimos al siguiente intento/fallback.
      }

      try {
        const results = await Location.geocodeAsync(candidate);
        if (results.length > 0) {
          return results[0] as GeocodePoint;
        }
      } catch {
        // Silencioso: seguimos al siguiente intento.
      }
    }

    return null;
  };

  const inferCityFromCoordinates = async (
    latitude: number,
    longitude: number,
  ): Promise<string | null> => {
    try {
      const geocoded = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const city = normalizeCity([
        geocoded[0]?.city,
        geocoded[0]?.subregion,
        geocoded[0]?.region,
      ]);
      if (city) return city;
    } catch {
      // fallback below
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${latitude}&lon=${longitude}`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ManevaApp/1.0 (location-onboarding)",
        },
      });
      if (!response.ok) return null;

      const data = (await response.json()) as NominatimReverseItem;
      return normalizeCity([
        data.address?.city,
        data.address?.town,
        data.address?.village,
        data.address?.municipality,
        data.address?.state,
      ]);
    } catch {
      return null;
    }
  };

  const centerMapByCityName = async (cityName: string) => {
    setResolvingCity(true);
    setError(null);

    try {
      const first = await geocodeCityWithFallback(cityName);
      if (!first) {
        setError("No encontramos esa ciudad. Prueba con otro nombre.");
        return;
      }

      centerMapAt(first.latitude, first.longitude);
      const normalizedCity = cityName.trim();
      setSelectedCity(normalizedCity);
      setSearch(normalizedCity);
    } catch {
      setError("No pudimos buscar esa ciudad ahora mismo.");
    } finally {
      setResolvingCity(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setError(
          "No se concedieron permisos de ubicación. Puedes elegir una ciudad manualmente.",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const geocoded = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const location = geocoded[0];
      const city = normalizeCity([
        location?.city,
        location?.subregion,
        location?.region,
      ]);

      if (!city) {
        setError("No pudimos detectar tu ciudad. Selecciónala manualmente.");
        centerMapAt(position.coords.latitude, position.coords.longitude);
        return;
      }

      centerMapAt(position.coords.latitude, position.coords.longitude);
      setSelectedCity(city);
      setSearch(city);
    } catch {
      setError("No fue posible obtener tu ubicación ahora mismo.");
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSelectCity = (city: string) => {
    centerMapByCityName(city);
  };

  const handleApplyManualCity = () => {
    const query = search.trim();
    if (query.length < 2) {
      setError("Escribe una ciudad válida para ubicarla en el mapa.");
      return;
    }
    centerMapByCityName(query);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const currentUser = user ?? await getCurrentUser();
      if (!currentUser) {
        setError(
          "Tu sesión no está lista. Vuelve a iniciar sesión e inténtalo de nuevo.",
        );
        return;
      }

      let finalCity = cityToSave;

      if (!finalCity) {
        const detectedCity = await inferCityFromCoordinates(
          mapRegion.latitude,
          mapRegion.longitude,
        );

        // No bloquea el flujo: si no se detecta ciudad, usa un fallback razonable.
        finalCity = detectedCity ?? "Ubicación actual";
        if (detectedCity) {
          setSelectedCity(detectedCity);
          setSearch(detectedCity);
        }
      }

      const localCityKey = `onboarding_city_${currentUser.id}`;

      // Intento remoto: si falla por policies/RLS usamos fallback local para no bloquear.
      const citySaveResult = await Promise.allSettled([
        setUserPreference(currentUser.id, "city", finalCity),
      ]);

      const citySavedRemotely = citySaveResult[0].status === "fulfilled";

      // Guardados opcionales: si una policy/constraint los bloquea no deben romper el flujo.
      await Promise.allSettled([
        setUserPreference(currentUser.id, "lat", mapRegion.latitude.toFixed(6)),
        setUserPreference(
          currentUser.id,
          "lng",
          mapRegion.longitude.toFixed(6),
        ),
        setUserPreference(currentUser.id, "radius_km", String(radiusKm)),
      ]);

      // Persistimos localmente para que el guard permita entrar incluso con fallo remoto.
      await safeStorage.setItem(localCityKey, finalCity);

      await safeStorage.setItem("hasSeenOnboarding", "true");

      if (!citySavedRemotely) {
        console.warn(
          "City preference could not be saved remotely. Using local fallback.",
        );
      }

      router.replace("/onboarding/preferences");
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "No pudimos guardar tu ciudad. Inténtalo de nuevo.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView contentContainerClassName="px-6 pt-6 pb-10">
        <View className="flex-row items-center gap-2 mb-8">
          <Image
            source={require("../../assets/images/logo.png")}
            className="w-10 h-10"
            resizeMode="contain"
          />
          <H1 className="font-manrope-extrabold text-xl tracking-tight text-foreground dark:text-foreground-dark">
            MANEVA
          </H1>
        </View>

        <View className="mb-7">
          <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] uppercase text-gold mb-2">
            Configuración
          </Caption>
          <H1 className="font-manrope-extrabold text-3xl text-foreground dark:text-foreground-dark mb-2">
            Ubicación
          </H1>
          <Body className="font-manrope text-foreground-muted dark:text-foreground-muted-dark">
            Usaremos tu ciudad para mostrarte salones cercanos desde el inicio.
          </Body>
        </View>

        <View className="mb-2">
          <Caption className="font-manrope-semibold text-foreground-muted dark:text-foreground-muted-dark text-[11px] uppercase tracking-[1.8px] mb-2">
            Buscar ciudad manualmente
          </Caption>
        </View>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark-faint px-4 py-3 mb-5 shadow-input">
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <TextInput
                value={search}
                onChangeText={(value) => {
                  setSearch(value);
                  if (
                    selectedCity &&
                    value.trim().toLowerCase() !== selectedCity.toLowerCase()
                  ) {
                    setSelectedCity(null);
                  }
                }}
                onSubmitEditing={handleApplyManualCity}
                placeholder="Ejemplo: Madrid"
                placeholderTextColor={themeColors.premium.gray.faint}
                className="font-manrope text-foreground dark:text-foreground-dark text-base"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity
              onPress={handleApplyManualCity}
              activeOpacity={0.85}
              className="px-4 py-2.5 bg-gold rounded-xl"
              disabled={resolvingCity}
            >
              <Caption className="font-manrope-extrabold text-premium-white uppercase tracking-[1.2px] text-[10px]">
                Buscar
              </Caption>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-5">
          <Caption className="font-manrope-semibold text-foreground-muted dark:text-foreground-muted-dark text-[11px] uppercase tracking-[1.8px] mb-2">
            Mapa de zona y radio
          </Caption>
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark-faint overflow-hidden shadow-input">
            {Platform.OS === "web" ? (
              <View className="h-[260px] items-center justify-center px-5">
                <Body className="font-manrope text-foreground-muted dark:text-foreground-muted-dark text-center">
                  El mapa interactivo no está disponible en web. Puedes
                  seleccionar ciudad manualmente y elegir el radio.
                </Body>
              </View>
            ) : (
              <View className="h-[280px] relative">
                <MapView
                  ref={mapRef}
                  style={{ flex: 1 }}
                  initialRegion={mapRegion}
                  onRegionChange={(region) => {
                    setMapRegion(region);
                  }}
                  onRegionChangeComplete={(region) => {
                    setMapRegion(region);
                  }}
                  showsUserLocation
                  showsCompass
                  toolbarEnabled
                >
                  <Circle
                    center={centerCoords}
                    radius={radiusKm * 1000}
                    strokeColor="rgba(0,0,0,0.5)"
                    fillColor="rgba(212,175,55,0.22)"
                  />
                </MapView>
                <View className="absolute inset-0 items-center justify-center pointer-events-none">
                  <View className="w-5 h-5 rounded-full bg-gold border-2 border-premium-black" />
                </View>
              </View>
            )}

            <View className="px-4 py-3 border-t border-border dark:border-border-dark-lighter">
              <View className="flex-row justify-between items-center mb-1">
                <Caption className="font-manrope-semibold text-foreground-muted dark:text-foreground-muted-dark text-[10px] uppercase tracking-[1.4px]">
                  Radio de búsqueda
                </Caption>
                <Caption className="font-manrope-extrabold text-foreground dark:text-foreground-dark text-[11px]">
                  {radiusKm.toFixed(0)} km
                </Caption>
              </View>
              <Slider
                minimumValue={1}
                maximumValue={30}
                step={1}
                value={radiusKm}
                minimumTrackTintColor={themeColors.gold.DEFAULT}
                maximumTrackTintColor={themeColors.premium.gray.track}
                thumbTintColor={themeColors.premium.black}
                onValueChange={(value) => setRadiusKm(value)}
                onSlidingComplete={(value) => {
                  setMapRegion(
                    regionFromCoordinates(
                      mapRegion.latitude,
                      mapRegion.longitude,
                      value,
                    ),
                  );
                }}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          className="w-full bg-gold rounded-2xl py-4 items-center justify-center mb-5"
          onPress={handleUseCurrentLocation}
          activeOpacity={0.85}
          disabled={loadingLocation || resolvingCity}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color={themeColors.premium.white} />
          ) : (
            <Caption className="font-manrope-extrabold text-premium-white uppercase tracking-widest text-[11px]">
              Usar mi ubicación actual
            </Caption>
          )}
        </TouchableOpacity>

        <View className="mb-6">
          <Caption className="font-manrope-semibold text-foreground-muted dark:text-foreground-muted-dark text-[11px] uppercase tracking-[1.8px] mb-3">
            Ciudades populares
          </Caption>
          <View className="flex-row flex-wrap gap-2">
            {POPULAR_CITIES.map((city) => {
              const isActive = selectedCity === city;
              return (
                <TouchableOpacity
                  key={city}
                  onPress={() => handleSelectCity(city)}
                  activeOpacity={0.85}
                  className={`px-4 py-2 rounded-full border ${isActive ? "bg-premium-black border-premium-black" : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark-muted"}`}
                >
                  <Caption
                    className={`font-manrope-extrabold uppercase tracking-[1.2px] text-[10px] ${isActive ? "text-premium-white" : "text-foreground dark:text-foreground-dark"}`}
                  >
                    {city}
                  </Caption>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {!!cityToSave && (
          <View className="mb-4 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3">
            <Body className="font-manrope-medium text-foreground dark:text-foreground-dark">
              Ciudad: {cityToSave} · Radio: {radiusKm} km
            </Body>
          </View>
        )}

        {!!error && (
          <View className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3">
            <Body className="font-manrope-medium text-red-600 text-sm">
              {error}
            </Body>
          </View>
        )}

        <TouchableOpacity
          className={`w-full bg-gold rounded-2xl py-4 items-center ${saving ? "opacity-50" : ""}`}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={themeColors.premium.white} />
          ) : (
            <Caption className="font-manrope-extrabold text-premium-white uppercase tracking-widest text-[11px]">
              Continuar
            </Caption>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
