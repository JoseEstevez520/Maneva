import React, { useRef, useState, useCallback, useEffect, useMemo, MutableRefObject } from 'react'
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScreenLayout } from "@/components/ui/ScreenLayout";
import { TutorialModal } from "@/components/ui/TutorialModal";
import { Body, Caption, H1, H2 } from "@/components/ui/Typography";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native'
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { IconSearch, IconCalendar, IconLocation, IconStar, IconTag, IconChevron } from '@/components/ui/icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useNextAppointment } from '@/hooks/useAppointments'
import { useSalons, useFavoriteSalon } from '@/hooks/useSalons'
import { useActiveCampaigns } from '@/hooks/useCampaigns'
import { useRouter } from 'expo-router'
import { format, parseISO } from 'date-fns'
import { gl } from 'date-fns/locale'
import type { CampaignWithSalon } from '@/services/campaigns.service'

// ─── Imagen placeholder (fondo gris) para salones sin cover ───────────────────
const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=400&h=300&fit=crop&q=80";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAppointmentDate(iso: string): string {
  return format(parseISO(iso), "dd MMM · HH:mm", { locale: gl })
}

// ─── Componentes internos ──────────────────────────────────────────────────────

function SectionHeader({
  title,
  actionLabel,
  onAction,
  containerRef,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  containerRef?: (node: View | null) => void;
}) {
  const themeColors = useThemeColors();
  return (
    <View
      ref={containerRef}
      className="flex-row items-center mb-[14px]"
    >
      {/* flex-1 para que el título no empuje la acción a una segunda línea */}
      <Caption className="flex-1 font-manrope-extrabold text-label tracking-label text-foreground dark:text-foreground-dark uppercase">
        {title}
      </Caption>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} className="ml-3" style={{ flexShrink: 0 }}>
          <View className="flex-row items-center gap-0.5">
            <Caption numberOfLines={1} className="font-manrope-semibold text-[11px] tracking-[1px] uppercase text-foreground-muted dark:text-foreground-muted-dark">
              {actionLabel}
            </Caption>
            <IconChevron size={12} color={themeColors.premium.gray.DEFAULT} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SearchBar({ anchorRef }: { anchorRef?: (node: View | null) => void }) {
  const router = useRouter();
  const themeColors = useThemeColors();
  return (
    <View className="px-5 pt-6 pb-2">
      <View ref={anchorRef}>
        <TouchableOpacity
          className="flex-row items-center bg-surface dark:bg-surface-dark rounded-2xl px-4 py-3.5 gap-3 shadow-input"
          activeOpacity={0.9}
          onPress={() => router.push("/search")}
        >
          <IconSearch
            color={themeColors.premium.gray.DEFAULT}
            size={20}
            strokeWidth={2}
          />
          <View className="flex-1">
            <Body className="font-manrope-medium text-[14px] text-foreground-muted dark:text-foreground-muted-dark">
              Busca unha perruquería ou servizo
            </Body>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type MeasurableNode = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

type AnchorMap = Record<string, { x: number; y: number; width: number; height: number }>;

type ContentOffsetMap = Record<string, number>;

function setNodeRef(
  refObject: MutableRefObject<Record<string, MeasurableNode | null>>,
  key: string,
  node: MeasurableNode | null,
) {
  refObject.current[key] = node;
}

// ─── Sección B: Próxima Cita ──────────────────────────────────────────────────

function NextAppointmentSection() {
  const { data: appt, loading } = useNextAppointment();
  const router = useRouter();
  const themeColors = useThemeColors();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View className="px-5 mt-7">
      <SectionHeader title="PRÓXIMA CITA" actionLabel="VER TODO" onAction={() => router.push('/bookings')} />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : appt ? (
        <AnimatedPressable
          onPress={() => router.push('/bookings')}
          onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }) }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }) }}
          style={animatedStyle}
          className="bg-surface dark:bg-surface-dark rounded-[24px] border border-border dark:border-border-dark shadow-card p-5"
        >
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-1.5 mb-1">
                <IconCalendar
                  color={themeColors.gold.DEFAULT}
                  size={13}
                  strokeWidth={2.5}
                />
                <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                  {formatAppointmentDate(appt.scheduled_at)}
                </Caption>
              </View>
              <H2 className="font-manrope-bold text-[20px] text-foreground dark:text-foreground-dark leading-[26px]">
                {appt.salon_name}
              </H2>
              {appt.service_name && (
                <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark mt-0.5">
                  {appt.service_name}
                </Body>
              )}
              {appt.employee_name && (
                <Caption className="font-manrope-medium text-[11px] text-foreground-subtle dark:text-foreground-subtle-dark mt-0.5">
                  con {appt.employee_name}
                </Caption>
              )}
            </View>
            <Image
              source={{ uri: appt.salon_image ?? PLACEHOLDER_IMAGE }}
              className="w-[90px] h-[90px] rounded-2xl shrink-0"
            />
          </View>
        </AnimatedPressable>
      ) : (
        <View className="bg-surface dark:bg-surface-dark rounded-[24px] border border-border dark:border-border-dark shadow-card p-5 items-center gap-3.5">
          <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center">
            Non tes citas próximas
          </Body>
          <TouchableOpacity
            className="bg-gold rounded-lg py-2 px-10 items-center shadow-gold"
            activeOpacity={0.85}
            onPress={() => router.push('/search')}
          >
            <Caption className="font-manrope-extrabold text-label-sm tracking-button uppercase text-premium-white dark:text-premium-white">
              RESERVAR AGORA
            </Caption>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Sección C: Tu Salón ─────────────────────────────────────────────────────

function MySalonSection() {
  const { data: salon, loading } = useFavoriteSalon();
  const router = useRouter();
  const themeColors = useThemeColors();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View className="px-5 mt-7">
      <SectionHeader title="O TEU SALÓN" />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : salon ? (
        <AnimatedPressable
          onPress={() => router.push(`/salon/${salon.id}`)}
          onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }) }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }) }}
          style={animatedStyle}
          className="bg-surface dark:bg-surface-dark rounded-[24px] border border-border dark:border-border-dark shadow-card flex-row h-[150px] overflow-hidden"
        >
          <Image source={{ uri: salon.Image ?? PLACEHOLDER_IMAGE }} className="w-2/5 h-full" />
          <View className="flex-1 px-4 py-[14px] flex-col justify-between">

            {/* Fila 1: nombre */}
            <Body
              className="font-manrope-bold text-[15px] text-foreground dark:text-foreground-dark"
              numberOfLines={1}
            >
              {salon.name}
            </Body>

            {/* Fila 2: rating pill + ciudad */}
            <View className="flex-row items-center gap-2">
              {salon.avgRating !== null && (
                <View className="flex-row items-center gap-1">
                  <IconStar size={12} color={themeColors.gold.DEFAULT} fill={themeColors.gold.DEFAULT} strokeWidth={0} />
                  <Caption className="font-manrope-extrabold text-[12px] text-foreground dark:text-foreground-dark">
                    {salon.avgRating.toFixed(1)}
                  </Caption>
                </View>
              )}
              {salon.city && (
                <>
                  <View className="w-[3px] h-[3px] rounded-full bg-premium-gray-pale" />
                  <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                    {salon.city}
                  </Caption>
                </>
              )}
            </View>

            {/* Fila 3: descripción truncada */}
            <Caption
              className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark leading-[15px]"
              numberOfLines={2}
            >
              {salon.salons?.description ?? "O teu salón de confianza"}
            </Caption>

            {/* Fila 4: link */}
            <View className="flex-row items-center gap-0.5">
              <Caption className="font-manrope-extrabold text-[11px] text-gold">
                Ver salón
              </Caption>
              <IconChevron size={12} color={themeColors.gold.DEFAULT} strokeWidth={2.5} />
            </View>

          </View>
        </AnimatedPressable>
      ) : (
        <View className="bg-surface dark:bg-surface-dark rounded-[24px] border border-border dark:border-border-dark shadow-card p-5 items-center gap-3.5">
          <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center">
            Aínda non tes un salón favorito
          </Body>
        </View>
      )}
    </View>
  );
}

// ─── Sección D: Disponible Hoy ────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function TodayCard({ id, name, city, image }: { id: string; name: string; city: string | null; image: string | null }) {
  const router = useRouter()
  const themeColors = useThemeColors()
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <AnimatedPressable
      onPress={() => router.push(`/salon/${id}`)}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }) }}
      style={animatedStyle}
      className="w-[240px] bg-surface dark:bg-surface-dark rounded-[24px] overflow-hidden border border-border dark:border-border-dark shadow-card"
    >
      <View>
        <Image
          source={{ uri: image ?? PLACEHOLDER_IMAGE }}
          className="w-full h-[140px]"
        />

      </View>
      <View className="p-3.5 gap-1.5">
        <Body
          className="font-manrope-bold text-[14px] text-foreground dark:text-foreground-dark"
          numberOfLines={1}
        >
          {name}
        </Body>
        <View className="flex-row items-center gap-1">
          <IconLocation
            color={themeColors.premium.gray.DEFAULT}
            size={13}
            strokeWidth={2}
          />
          <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
            {city ?? "Madrid"}
          </Caption>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function AvailableTodaySection() {
  const { data: salons, loading } = useSalons();

  return (
    <View className="px-5 mt-7">
      <SectionHeader title="DISPOÑIBLE HOXE" />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4 pb-2"
        >
          {salons.length === 0 ? (
            <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center py-4">
              Non hai salóns dispoñibles
            </Body>
          ) : (
            salons.map((salon) => (
              <TodayCard
                key={salon.id}
                id={salon.id}
                name={salon.name}
                city={salon.city}
                image={salon.Image ?? null}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Sección E: Ofertas Especiales ────────────────────────────────────────────

function OfferCard({ offer }: { offer: CampaignWithSalon }) {
  const router = useRouter()
  const themeColors = useThemeColors()
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const salonName = offer.salon_locations?.name ?? 'Salón'
  const salonCity = offer.salon_locations?.city ?? 'Madrid'
  const typeLabel = offer.type ? offer.type.toUpperCase() : 'OFERTA'
  const endFormatted = format(parseISO(offer.end_date), "d MMM", { locale: gl })
  const daysRemaining = Math.ceil(
    (parseISO(offer.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const handlePress = () => {
    router.push(`/salon/${offer.location_id}`)
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }) }}
      style={animatedStyle}
      className="bg-surface dark:bg-surface-dark rounded-[24px] border border-border dark:border-border-dark shadow-card overflow-hidden"
    >
      {/* Encabezado con tipo de oferta */}
      <View className="bg-[rgba(212,175,55,0.08)] border-b border-border dark:border-border-dark px-5 py-3 flex-row items-center gap-2">
        <View className="bg-[rgba(212,175,55,0.15)] rounded-lg p-1.5">
          <IconTag size={12} color={themeColors.gold.DEFAULT} strokeWidth={2} />
        </View>
        <Caption className="font-manrope-extrabold text-[10px] text-gold tracking-wider">
          {typeLabel}
        </Caption>
        {daysRemaining > 0 && (
          <Caption className="font-manrope-medium text-[10px] text-foreground-muted dark:text-foreground-muted-dark ml-auto">
            {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}
          </Caption>
        )}
      </View>

      {/* Contenido principal */}
      <View className="p-5 gap-3">
        {/* Nombre de la campaña */}
        <Body className="font-manrope-bold text-[15px] text-foreground dark:text-foreground-dark leading-[20px]">
          {offer.name}
        </Body>

        {/* Salón */}
        <View className="flex-row items-center gap-2">
          <IconLocation size={13} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
          <View className="flex-1">
            <Caption className="font-manrope-extrabold text-[11px] text-foreground dark:text-foreground-dark">
              {salonName}
            </Caption>
            <Caption className="font-manrope-medium text-[10px] text-foreground-muted dark:text-foreground-muted-dark">
              {salonCity}
            </Caption>
          </View>
        </View>

        {/* Fila inferior: validez + CTA sutil integrado */}
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center gap-2">
            <IconCalendar size={13} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
            <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
              Válido ata {endFormatted}
            </Caption>
          </View>
          {/* CTA integrado: no duplica el press de la card, guía visualmente */}
          <View className="flex-row items-center gap-0.5">
            <Caption className="font-manrope-extrabold text-[11px] text-gold">
              Ver oferta
            </Caption>
            <IconChevron size={13} color={themeColors.gold.DEFAULT} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </AnimatedPressable>
  )
}

function SpecialOffersSection() {
  const { data: campaigns, loading } = useActiveCampaigns()

  return (
    <View className="px-5 mt-7">
      <SectionHeader title="OFERTAS ESPECIAIS" />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : campaigns.length === 0 ? (
        <View className="bg-surface dark:bg-surface-dark rounded-[24px] border border-border dark:border-border-dark shadow-card p-5 items-center gap-3.5">
          <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center">Non hai ofertas activas agora mesmo</Body>
        </View>
      ) : (
        <View className="gap-3.5">
          {campaigns.map((campaign) => (
            <OfferCard key={campaign.id} offer={campaign} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionRefs = useRef<Record<string, MeasurableNode | null>>({});
  const [anchors, setAnchors] = useState<AnchorMap>({});
  const contentOffsetsRef = useRef<ContentOffsetMap>({});

  const setSectionRef = useCallback(
    (key: string) => (node: MeasurableNode | null) => {
      setNodeRef(sectionRefs, key, node);
    },
    [],
  );

  const onSectionLayout = useCallback((key: string, y: number) => {
    contentOffsetsRef.current[key] = y;
  }, []);

  const measureAnchors = useCallback(() => {
    const entries = Object.entries(sectionRefs.current);

    if (entries.length === 0) {
      return;
    }

    const nextAnchors: AnchorMap = {};
    let pending = entries.length;

    entries.forEach(([key, node]) => {
      if (!node) {
        pending -= 1;
        return;
      }

      node.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          nextAnchors[key] = { x, y, width, height };
        }

        pending -= 1;
        if (pending === 0) {
          setAnchors((prev) => {
            const same =
              Object.keys(prev).length === Object.keys(nextAnchors).length &&
              Object.entries(nextAnchors).every(([anchorKey, value]) => {
                const current = prev[anchorKey];
                return (
                  current &&
                  current.x === value.x &&
                  current.y === value.y &&
                  current.width === value.width &&
                  current.height === value.height
                );
              });

            return same ? prev : nextAnchors;
          });
        }
      });
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      measureAnchors();
    }, 200);

    return () => clearTimeout(timer);
  }, [measureAnchors]);

  const handleStepChange = useCallback(
    (anchorKey?: string) => {
      if (!anchorKey) return;

      const y = contentOffsetsRef.current[anchorKey];
      if (typeof y !== "number") {
        measureAnchors();
        return;
      }

      const scrollY = Math.max(0, y - 120);
      scrollRef.current?.scrollTo({ y: scrollY, animated: true });

      setTimeout(() => {
        measureAnchors();
      }, 260);
    },
    [measureAnchors],
  );

  const scrollHandlers = useMemo(
    () => ({
      onScrollEndDrag: () => measureAnchors(),
      onMomentumScrollEnd: () => measureAnchors(),
      onContentSizeChange: () => measureAnchors(),
    }),
    [measureAnchors],
  );

  return (
    <ScreenLayout header="brand" scrollable={false}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-8"
        scrollEventThrottle={16}
        onScrollEndDrag={scrollHandlers.onScrollEndDrag}
        onMomentumScrollEnd={scrollHandlers.onMomentumScrollEnd}
        onContentSizeChange={scrollHandlers.onContentSizeChange}
      >
        {/* A: Buscador — sin delay, es lo primero visible */}
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          onLayout={(e) => onSectionLayout("search", e.nativeEvent.layout.y)}
        >
          <SearchBar anchorRef={setSectionRef("search")} />
        </Animated.View>

        {/* B: Próxima Cita */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(400).springify()}
          onLayout={(e) =>
            onSectionLayout("nextAppointment", e.nativeEvent.layout.y)
          }
        >
          <View ref={setSectionRef("nextAppointment")}>
            <NextAppointmentSection />
          </View>
        </Animated.View>

        {/* C: Tu Salón */}
        <Animated.View
          entering={FadeInDown.delay(160).duration(400).springify()}
          onLayout={(e) => onSectionLayout("mySalon", e.nativeEvent.layout.y)}
        >
          <View ref={setSectionRef("mySalon")}>
            <MySalonSection />
          </View>
        </Animated.View>

        {/* D: Disponible Hoy */}
        <Animated.View entering={FadeInDown.delay(240).duration(400).springify()}>
          <AvailableTodaySection />
        </Animated.View>

        {/* E: Ofertas Especiales */}
        <Animated.View
          entering={FadeInDown.delay(320).duration(400).springify()}
          onLayout={(e) =>
            onSectionLayout("specialOffers", e.nativeEvent.layout.y)
          }
        >
          <SpecialOffersSection />
        </Animated.View>
      </ScrollView>
      <TutorialModal anchors={anchors} onStepChange={handleStepChange} />
    </ScreenLayout>
  );
}
