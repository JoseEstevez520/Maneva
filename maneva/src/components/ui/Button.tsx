import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
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
 * primary:   Fondo dorado, texto negro, sombra dorada, uppercase
 * secondary: Fondo blanco, borde grueso negro, uppercase
 *
 * Animación: scale-down suave al pulsar via Reanimated withSpring.
 * El spring (damping 15, stiffness 300) da una respuesta rápida y orgánica
 * sin rebotar — más premium que una transición lineal.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const variantStyles: Record<Variant, string> = {
  primary: "bg-gold border-0",
  secondary: "bg-premium-white border-4 border-premium-black shadow-xl",
  ghost: "bg-transparent border-0",
  danger: "bg-red-600 border-0",
};

const textStyles: Record<Variant, string> = {
  primary: "text-premium-black",
  secondary: "text-premium-black",
  ghost: "text-premium-gray",
  danger: "text-white",
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
        <ActivityIndicator size="small" color="#000000" />
      ) : icon ? (
        <View className="mb-1">{icon}</View>
      ) : null}
      <Text
        className={`${textStyles[variant]} ${textSizeStyles[size]} font-extrabold uppercase tracking-widest text-center`}
      >
        {children}
      </Text>
    </AnimatedPressable>
  );
}
