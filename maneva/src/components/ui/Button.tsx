import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/useThemeColors";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "xs" | "sm" | "md" | "lg";

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Diseño Maneva Premium:
 * primary:   Fondo dorado, texto blanco, uppercase — invariante en dark mode
 * secondary: Fondo superficie, borde foreground, uppercase
 * ghost:     Transparente, texto muted
 * danger:    Rojo, texto blanco — invariante
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const variantStyles: Record<Variant, string> = {
  primary:   "bg-gold border-0",
  secondary: "bg-surface dark:bg-surface-dark border-4 border-foreground dark:border-foreground-dark shadow-premium-soft",
  ghost:     "bg-transparent border-0",
  danger:    "bg-red-600 border-0",
};

const textStyles: Record<Variant, string> = {
  primary:   "text-premium-white",
  secondary: "text-foreground dark:text-foreground-dark",
  ghost:     "text-foreground-muted dark:text-foreground-muted-dark",
  danger:    "text-white",
};

const sizeStyles: Record<Size, string> = {
  xs: "px-4 py-3 rounded-xl",
  sm: "px-6 py-4 rounded-2xl",
  md: "px-8 py-6 rounded-[24px]",
  lg: "px-10 py-8 rounded-[32px]",
};

const textSizeStyles: Record<Size, string> = {
  xs: "text-base",
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  onPress,
  icon,
  children,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const themeColors = useThemeColors();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={animatedStyle}
      className={`w-full flex-row items-center justify-center gap-3 ${variantStyles[variant]} ${sizeStyles[size]} ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={themeColors.premium.black} />
      ) : icon ? (
        <View className="mb-1">{icon}</View>
      ) : null}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        className={`${textStyles[variant]} ${textSizeStyles[size]} font-extrabold uppercase tracking-wide text-center`}
      >
        {children}
      </Text>
    </AnimatedPressable>
  );
}
