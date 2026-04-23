import { Colors } from "@/constants/theme";
import { getCurrentUser } from "@/services/auth.service";
import { safeStorage } from "@/lib/storage";
import { useAuthStore } from "@/store/authStore";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    LayoutChangeEvent,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { Button } from "./Button";
import { IconCalendar, IconScissors, IconSearch, IconStar } from "./icons";
import { Body, H2 } from "./Typography";

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TutorialModalProps = {
  anchors?: Record<string, AnchorRect>;
  onStepChange?: (anchorKey?: string) => void;
};

const TUTORIAL_STEPS = [
  {
    anchorKey: "search",
    preferredPlacement: "below",
    title: "Buscador Inteligente",
    description:
      "Encuentra tus salones preferidos o explora nuevos servicios al instante desde la barra superior.",
    Icon: IconSearch,
  },
  {
    anchorKey: "nextAppointment",
    preferredPlacement: "below",
    title: "Tus Citas",
    description:
      "Controla tus próximas citas confirmadas para que nunca te pierdas un servicio.",
    Icon: IconCalendar,
  },
  {
    anchorKey: "mySalon",
    preferredPlacement: "above",
    title: "Tu Salón Favorito",
    description:
      "Si ya tienes tu sitio de confianza, guárdalo para acceder en un solo toque.",
    Icon: IconStar,
  },
  {
    anchorKey: "specialOffers",
    preferredPlacement: "above",
    title: "Ofertas Especiales",
    description:
      "Benefíciate de los mejores descuentos pensados exclusivamente para ti y paga menos.",
    Icon: IconScissors,
  },
] as const;

const SCREEN = Dimensions.get("window");
const CARD_WIDTH = Math.min(304, SCREEN.width - 40);
const CARD_MIN_HEIGHT = 220;
const EDGE_GAP = 16;
const ARROW_SIZE = 10;
const ARROW_TARGET_GAP_DEFAULT = 30;
const ARROW_TARGET_GAP_SPECIAL_OFFERS = 10;

export function TutorialModal({
  anchors = {},
  onStepChange,
}: TutorialModalProps) {
  const { user } = useAuthStore();
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [cardHeight, setCardHeight] = useState(CARD_MIN_HEIGHT);

  const currentStep = TUTORIAL_STEPS[step];
  const target = anchors[currentStep.anchorKey];
  const arrowTargetGap =
    currentStep.anchorKey === "specialOffers"
      ? ARROW_TARGET_GAP_SPECIAL_OFFERS
      : ARROW_TARGET_GAP_DEFAULT;

  const getPlacement = () => {
    if (!target) return "center" as const;

    const spaceAbove = target.y - EDGE_GAP;
    const spaceBelow = SCREEN.height - (target.y + target.height) - EDGE_GAP;
    const needsHeight = cardHeight + ARROW_SIZE + arrowTargetGap;

    if (currentStep.preferredPlacement === "above") {
      if (spaceAbove >= needsHeight || spaceAbove > spaceBelow) return "above";
      return "below";
    }

    if (spaceBelow >= needsHeight || spaceBelow > spaceAbove) return "below";
    return "above";
  };

  const placement = getPlacement();

  const popupLeft = target
    ? Math.max(
        EDGE_GAP,
        Math.min(
          SCREEN.width - EDGE_GAP - CARD_WIDTH,
          target.x + target.width / 2 - CARD_WIDTH / 2,
        ),
      )
    : (SCREEN.width - CARD_WIDTH) / 2;

  const popupTop = (() => {
    if (!target || placement === "center") {
      return Math.max(EDGE_GAP + 24, (SCREEN.height - cardHeight) / 2);
    }

    const targetBottomOutside = target.y + target.height + arrowTargetGap;
    const targetTopOutside = target.y - arrowTargetGap;

    if (placement === "below") {
      // The arrow tip stays just outside the lower edge of the target.
      return Math.min(
        SCREEN.height - EDGE_GAP - cardHeight,
        targetBottomOutside + ARROW_SIZE,
      );
    }

    // The arrow tip stays just outside the upper edge of the target.
    return Math.max(EDGE_GAP + 24, targetTopOutside - cardHeight - ARROW_SIZE);
  })();

  const pointerX = target
    ? Math.max(
        EDGE_GAP + 8,
        Math.min(SCREEN.width - EDGE_GAP - 8, target.x + target.width / 2),
      )
    : SCREEN.width / 2;

  const arrowLeft = Math.max(
    18,
    Math.min(CARD_WIDTH - 18, pointerX - popupLeft - ARROW_SIZE),
  );

  useEffect(() => {
    let isMounted = true;

    // Verificar si el tutorial ya se vio para el usuario actual
    const checkTutorial = async () => {
      let userId: string | undefined;

      try {
        const resolvedUser = user ?? (await getCurrentUser());
        userId = resolvedUser?.id;
      } catch (error) {
        // Si no podemos resolver usuario, ocultamos tutorial hasta que exista sesión.
        console.warn("Tutorial user resolution failed:", error);
        return;
      }

      if (!isMounted || !userId) {
        return;
      }

      const key = `hasSeenAppTour_${userId}`;
      setStorageKey(key);

      const hasSeenAppTour = await safeStorage.getItem(key);
      if (isMounted && hasSeenAppTour !== "true") {
        setStep(0);
        setIsVisible(true);
      }
    };

    checkTutorial();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (isVisible) {
      onStepChange?.(currentStep.anchorKey);
    }
  }, [isVisible, step, currentStep.anchorKey, onStepChange]);

  const finishTutorial = async () => {
    if (storageKey) {
      await safeStorage.setItem(storageKey, "true");
    }
    setIsVisible(false);
  };

  const nextStep = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finishTutorial();
    }
  };

  const previousStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (!isVisible) return null;

  const StepIcon = currentStep.Icon;

  const onCardLayout = (e: LayoutChangeEvent) => {
    const measuredHeight = e.nativeEvent.layout.height;
    if (measuredHeight > 0 && measuredHeight !== cardHeight) {
      setCardHeight(measuredHeight);
    }
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/45">
        <Animated.View
          key={`tutorial-step-${step}`}
          onLayout={onCardLayout}
          entering={FadeInDown.duration(600).springify()}
          exiting={FadeOut.duration(180)}
          style={[
            styles.popup,
            {
              width: CARD_WIDTH,
              left: popupLeft,
              top: popupTop,
            },
          ]}
          className="bg-premium-white rounded-[24px] p-5 shadow-2xl items-center relative"
        >
          {placement !== "center" && (
            <View
              style={[
                styles.arrow,
                placement === "below"
                  ? {
                      top: -ARROW_SIZE,
                      left: arrowLeft,
                      borderLeftWidth: ARROW_SIZE,
                      borderRightWidth: ARROW_SIZE,
                      borderBottomWidth: ARROW_SIZE,
                      borderBottomColor: Colors.premium.white,
                    }
                  : {
                      bottom: -ARROW_SIZE,
                      left: arrowLeft,
                      borderLeftWidth: ARROW_SIZE,
                      borderRightWidth: ARROW_SIZE,
                      borderTopWidth: ARROW_SIZE,
                      borderTopColor: Colors.premium.white,
                    },
              ]}
            />
          )}

          {step > 0 && (
            <TouchableOpacity
              onPress={previousStep}
              className="absolute top-4 left-4 z-10 py-1"
            >
              <Body className="font-manrope-bold text-premium-gray uppercase text-xs tracking-widest">
                Anterior
              </Body>
            </TouchableOpacity>
          )}

          {/* Header del pop-up */}
          <View className="w-12 h-12 rounded-full bg-gold/10 items-center justify-center mb-3">
            <StepIcon color={Colors.gold.DEFAULT} size={28} strokeWidth={2} />
          </View>

          <H2 className="text-center mb-2">{currentStep.title}</H2>

          <Body className="text-center mb-5 px-1">
            {currentStep.description}
          </Body>

          {/* Dots Indicator */}
          <View className="flex-row items-center justify-center space-x-2 w-full gap-2 mb-5">
            {TUTORIAL_STEPS.map((_, idx) => (
              <View
                key={idx}
                className={`h-2 rounded-full transition-all ${idx === step ? "w-6 bg-premium-black" : "w-2 bg-premium-gray-light"}`}
              />
            ))}
          </View>

          {/* Botonera */}
          <View className="w-full gap-3">
            <Button variant="primary" size="xs" onPress={nextStep}>
              {step === TUTORIAL_STEPS.length - 1
                ? "Empezar a usar"
                : "Siguiente"}
            </Button>
            <TouchableOpacity
              onPress={finishTutorial}
              className="py-3 items-center"
            >
              <Body className="font-manrope-bold text-premium-gray uppercase text-xs tracking-widest">
                Saltar tutorial
              </Body>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: "absolute",
  },
  arrow: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
});
