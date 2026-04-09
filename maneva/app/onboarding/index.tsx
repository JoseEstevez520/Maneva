import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { safeStorage } from "@/lib/storage";
import { useUiStore } from "@/store/uiStore";

const { width } = Dimensions.get("window");

export default function Onboarding() {
  const router = useRouter();
  const setHasSeenOnboarding = useUiStore((state) => state.setHasSeenOnboarding);
  const flatListRef = useRef<FlatList<any>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const steps = [
    {
      title: "Tu peluquería, a un toque",
      text: "Reserva en segundos",
      image: require("../../assets/onboarding/slide1.png"),
    },
    {
      title: "Elige quién te atiende",
      text: "Conoce al equipo, lee reseñas...",
      image: require("../../assets/onboarding/slide2.png"),
    },
    {
      title: "Ofertas exclusivas",
      text: "Campañas y descuentos en tus salones",
      image: require("../../assets/onboarding/slide3.png"),
    },
  ];

  const next = async () => {
    if (currentIndex < steps.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      await safeStorage.setItem("onboarding_seen", "true");
      setHasSeenOnboarding(true); // Actualizar el estado global inmediatamente
      router.replace("/login");
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={{ width }} className="items-center justify-center p-6">
      <Image
        source={item.image}
        className="w-72 h-72 mb-6"
        resizeMode="contain"
      />

      <Text className="text-2xl font-manrope-extrabold mb-4">{item.title}</Text>

      <Text className="text-center text-premium-gray">{item.text}</Text>
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    setCurrentIndex(viewableItems[0].index);
  }).current;

  const viewConfig = {
    viewAreaCoveragePercentThreshold: 50,
  };

  return (
    <View className="flex-1 bg-premium-white">
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
      />

      {/* INDICADOR (puntitos) */}
      <View className="flex-row justify-center mb-4">
        {steps.map((_, index) => (
          <View
            key={index}
            className={`h-2 w-2 mx-1 rounded-full ${
              currentIndex === index ? "bg-gold" : "bg-gray-300"
            }`}
          />
        ))}
      </View>

      {/* BOTÓN */}
      <View className="p-6">
        <TouchableOpacity
          onPress={next}
          className="bg-gold py-3 rounded-xl items-center"
        >
          <Text className="text-white font-manrope-semibold">
            {currentIndex === steps.length - 1 ? "Empezar" : "Siguiente"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
