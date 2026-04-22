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
import { Colors } from '@/constants/theme'
import { useNextAppointment } from '@/hooks/useAppointments'
import { useSalons, useFavoriteSalon } from '@/hooks/useSalons'
import { useActiveCampaigns } from '@/hooks/useCampaigns'
import { useRouter } from 'expo-router'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CampaignWithSalon } from '@/services/campaigns.service'

// ─── Imagen placeholder (fondo gris) para salones sin cover ───────────────────
const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=400&h=300&fit=crop&q=80";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAppointmentDate(iso: string): string {
  return format(parseISO(iso), "dd MMM · HH:mm", { locale: es })
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
  return (
    <View
      ref={containerRef}
      className="flex-row items-center mb-[14px]"
    >
      {/* flex-1 para que el título no empuje la acción a una segunda línea */}
      <Caption className="flex-1 font-manrope-extrabold text-[11px] tracking-[2.5px] text-premium-black uppercase">
        {title}
      </Caption>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} className="ml-3" style={{ flexShrink: 0 }}>
          <Caption numberOfLines={1} className="font-manrope-bold text-[9px] tracking-[2px] text-premium-gray uppercase border-b border-premium-gray-light pb-[1px]">
            {actionLabel}
          </Caption>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SearchBar({ anchorRef }: { anchorRef?: (node: View | null) => void }) {
  const router = useRouter();
  return (
    <View className="px-5 pt-6 pb-2">
      <View ref={anchorRef}>
        <TouchableOpacity
          className="flex-row items-center bg-premium-white rounded-2xl px-4 py-[14px] gap-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.1)]"
          activeOpacity={0.9}
          onPress={() => router.push("/search")}
        >
          <IconSearch
            color={Colors.premium.gray.DEFAULT}
            size={20}
            strokeWidth={2}
          />
          <View className="flex-1">
            <Body className="font-manrope-medium text-[14px] text-premium-gray">
              Busca una peluquería o servicio
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

  return (
    <View className="px-5 mt-7">
      <SectionHeader title="PRÓXIMA CITA" actionLabel="VER TODO" onAction={() => router.push('/bookings')} />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : appt ? (
        <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] p-5 gap-4">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-1.5 mb-1">
                <IconCalendar
                  color={Colors.gold.DEFAULT}
                  size={13}
                  strokeWidth={2.5}
                />
                <Caption className="font-manrope-extrabold text-[9px] tracking-[1.2px] uppercase text-gold">
                  {formatAppointmentDate(appt.scheduled_at)}
                </Caption>
              </View>
              <H2 className="font-manrope-bold text-[20px] text-premium-black leading-[26px]">
                {appt.salon_name}
              </H2>
              {appt.service_name && (
                <Body className="font-manrope-medium text-[13px] text-premium-gray mt-0.5">
                  {appt.service_name}
                </Body>
              )}
            </View>
            <Image
              source={{ uri: PLACEHOLDER_IMAGE }}
              className="w-20 h-20 rounded-2xl shrink-0"
            />
          </View>
          <TouchableOpacity
            className="bg-gold rounded-xl py-3 items-center shadow-[0_4px_12px_rgba(212,175,55,0.35)]"
            activeOpacity={0.85}
            onPress={() => router.push('/bookings')}
          >
            <Caption className="font-manrope-extrabold text-[9px] tracking-[2.5px] uppercase text-premium-white">
              VER DETALLES
            </Caption>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] p-5 items-center gap-[14px]">
          <Body className="font-manrope-medium text-[13px] text-premium-gray text-center">
            No tienes citas próximas
          </Body>
          <TouchableOpacity
            className="bg-gold rounded-lg py-2 px-10 items-center shadow-[0_6px_14px_rgba(212,175,55,0.4)]"
            activeOpacity={0.85}
            onPress={() => router.push('/search')}
          >
            <Caption className="font-manrope-extrabold text-[9px] tracking-[2.5px] uppercase text-premium-white">
              RESERVAR AHORA
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

  return (
    <View className="px-5 mt-7">
      <SectionHeader title="TU SALÓN DE PELUQUERÍA" />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : salon ? (
        <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] flex-row h-[120px] overflow-hidden">
          <Image source={{ uri: PLACEHOLDER_IMAGE }} className="w-1/3 h-full" />
          <View className="flex-1 p-[14px] justify-between">
            <View>
              <View className="flex-row items-center justify-between mb-1">
                <Body
                  className="font-manrope-bold text-[14px] text-premium-black flex-1 mr-1.5"
                  numberOfLines={1}
                >
                  {salon.name}
                </Body>
                {salon.avgRating !== null && (
                  <View className="flex-row items-center gap-[3px]">
                    <IconStar
                      color={Colors.gold.DEFAULT}
                      size={11}
                      fill={Colors.gold.DEFAULT}
                    />
                    <Caption className="font-manrope-extrabold text-[11px] text-premium-black">
                      {salon.avgRating.toFixed(1)}
                    </Caption>
                  </View>
                )}
              </View>
              <Caption
                className="font-manrope-medium text-[10px] text-premium-gray leading-[14px]"
                numberOfLines={1}
              >
                {salon.salons?.description ?? "Tu salón de confianza"}
              </Caption>
            </View>
            <TouchableOpacity
              className="bg-gold rounded-lg py-2 items-center shadow-[0_6px_14px_rgba(212,175,55,0.4)]"
              activeOpacity={0.85}
              onPress={() => router.push(`/salon/${salon.id}`)}
            >
              <Caption className="font-manrope-extrabold text-[9px] tracking-[2.5px] uppercase text-premium-white">
                VER SALÓN
              </Caption>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] p-5 items-center gap-[14px]">
          <Body className="font-manrope-medium text-[13px] text-premium-gray text-center">
            Aún no tienes un salón favorito
          </Body>
        </View>
      )}
    </View>
  );
}

// ─── Sección D: Disponible Hoy ────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function TodayCard({ id, name, city }: { id: string; name: string; city: string | null }) {
  const router = useRouter()
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <AnimatedPressable
      onPress={() => router.push(`/salon/${id}`)}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }) }}
      style={animatedStyle}
      className="w-[240px] bg-premium-white rounded-[24px] overflow-hidden border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)]"
    >
      <View>
        <Image
          source={{ uri: PLACEHOLDER_IMAGE }}
          className="w-full h-[140px]"
        />

      </View>
      <View className="p-[14px] gap-1.5">
        <Body
          className="font-manrope-bold text-[14px] text-premium-black"
          numberOfLines={1}
        >
          {name}
        </Body>
        <View className="flex-row items-center gap-1">
          <IconLocation
            color={Colors.premium.gray.DEFAULT}
            size={13}
            strokeWidth={2}
          />
          <Caption className="font-manrope-medium text-[11px] text-premium-gray">
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
      <SectionHeader title="DISPONIBLE HOY" />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4 pb-2"
        >
          {salons.length === 0 ? (
            <Body className="font-manrope-medium text-[13px] text-premium-gray text-center py-4">
              Sin salones disponibles
            </Body>
          ) : (
            salons.map((salon) => (
              <TodayCard
                key={salon.id}
                id={salon.id}
                name={salon.name}
                city={salon.city}
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
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const salonName = offer.salon_locations?.name ?? 'Salón'
  const salonCity = offer.salon_locations?.city ?? 'Madrid'
  const typeLabel = offer.type ? offer.type.toUpperCase() : 'OFERTA'
  const endFormatted = format(parseISO(offer.end_date), "d MMM", { locale: es })
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
      className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] overflow-hidden"
    >
      {/* Encabezado con tipo de oferta */}
      <View className="bg-[rgba(212,175,55,0.08)] border-b border-[#F5F5F5] px-5 py-3 flex-row items-center gap-2">
        <View className="bg-[rgba(212,175,55,0.15)] rounded-lg p-1.5">
          <IconTag size={12} color={Colors.gold.DEFAULT} strokeWidth={2} />
        </View>
        <Caption className="font-manrope-extrabold text-[10px] text-gold tracking-wider">
          {typeLabel}
        </Caption>
        {daysRemaining > 0 && (
          <Caption className="font-manrope-medium text-[10px] text-premium-gray ml-auto">
            {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}
          </Caption>
        )}
      </View>

      {/* Contenido principal */}
      <View className="p-5 gap-3">
        {/* Nombre de la campaña */}
        <Body className="font-manrope-bold text-[15px] text-premium-black leading-[20px]">
          {offer.name}
        </Body>

        {/* Salón */}
        <View className="flex-row items-center gap-2">
          <IconLocation size={13} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
          <View className="flex-1">
            <Caption className="font-manrope-extrabold text-[11px] text-premium-black">
              {salonName}
            </Caption>
            <Caption className="font-manrope-medium text-[10px] text-premium-gray">
              {salonCity}
            </Caption>
          </View>
        </View>

        {/* Fila inferior: validez + CTA sutil integrado */}
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center gap-2">
            <IconCalendar size={13} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
            <Caption className="font-manrope-medium text-[11px] text-premium-gray">
              Válido hasta {endFormatted}
            </Caption>
          </View>
          {/* CTA integrado: no duplica el press de la card, guía visualmente */}
          <View className="flex-row items-center gap-0.5">
            <Caption className="font-manrope-extrabold text-[11px] text-gold">
              Ver oferta
            </Caption>
            <IconChevron size={13} color={Colors.gold.DEFAULT} strokeWidth={2.5} />
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
      <SectionHeader title="OFERTAS ESPECIALES" />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : campaigns.length === 0 ? (
        <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] p-5 items-center gap-[14px]">
          <Body className="font-manrope-medium text-[13px] text-premium-gray text-center">Sin ofertas activas ahora mismo</Body>
        </View>
      ) : (
        <View className="gap-[14px]">
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
