import { safeStorage } from "@/lib/storage";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Colors } from "@/constants/theme";
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const Dot = ({ isActive }: { isActive: boolean }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(isActive ? 24 : 8),
      backgroundColor: isActive ? Colors.premium.black : Colors.premium.gray.light,
    };
  });

  return (
    <Animated.View
      style={[
        { height: 8, borderRadius: 4, marginHorizontal: 4 },
        animatedStyle,
      ]}
    />
  );
};

const slides = [
  {
    id: "1",
    title: "Tu peluquería, a un toque",
    description:
      "Reserva en segundos con los mejores profesionales de tu zona.",
    image: require("../../assets/images/onboarding/slide1.png"),
  },
  {
    id: "2",
    title: "Elige quién te atiende",
    description: "Conoce a nuestro equipo de estilistas y lee reseñas reales.",
    image: require("../../assets/images/onboarding/slide2.png"),
  },
  {
    id: "3",
    title: "Ofertas exclusivas",
    description:
      "Accede a campañas especiales y descuentos solo en tus salones favoritos.",
    image: require("../../assets/images/onboarding/slide3.png"),
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef<FlatList>(null);

  const completeOnboarding = async () => {
    await safeStorage.setItem("hasSeenOnboarding", "true");
    router.replace("/onboarding/location");
  };

  const scrollToNext = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const updateCurrentSlideIndex = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / width);
    setCurrentIndex(newIndex);
  };

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft">
      {/* Header con botón Saltar */}
      <View className="flex-row justify-end px-6 pt-4 pb-2">
        <TouchableOpacity onPress={completeOnboarding}>
          <Text className="text-premium-gray font-manrope-medium text-base">
            Saltar
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={slidesRef}
        data={slides}
        contentContainerClassName="flex-grow"
        showsHorizontalScrollIndicator={false}
        horizontal
        pagingEnabled
        bounces={false}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{ width }}
            className="flex-1 items-center justify-center px-8 pb-6"
          >
            <Image
              source={item.image}
              className="w-full h-72 rounded-premium-xl mb-8 border-4 border-white shadow-premium-soft"
              resizeMode="cover"
            />
            <Text className="text-3xl font-manrope-extrabold text-premium-black text-center mb-3 leading-tight">
              {item.title}
            </Text>
            <Text className="text-base text-premium-gray font-manrope-regular text-center leading-relaxed">
              {item.description}
            </Text>
          </View>
        )}
      />

      <View className="px-8 pb-12 pt-6">
        <View className="flex-row justify-center items-center mb-10">
          {slides.map((_, index) => (
            <Dot key={index} isActive={currentIndex === index} />
          ))}
        </View>

        <TouchableOpacity
          className="w-full bg-premium-black h-14 rounded-premium-xl items-center justify-center flex-row shadow-premium-black"
          onPress={scrollToNext}
          activeOpacity={0.8}
        >
          <Text className="text-white font-manrope-semibold text-lg tracking-wide">
            {currentIndex === slides.length - 1 ? "Empezar" : "Siguiente"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
