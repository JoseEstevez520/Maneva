import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Tu peluquería, a un toque",
      text: "Reserva en segundos",
    },
    {
      title: "Elige quién te atiende",
      text: "Conoce al equipo, lee reseñas...",
    },
    {
      title: "Ofertas exclusivas",
      text: "Campañas y descuentos en tus salones",
    },
  ];

  const next = async () => {
  if (step < steps.length - 1) {
    setStep(step + 1);
  } else {
    await AsyncStorage.setItem("onboarding_seen", "true");
    router.replace("/login");
  }
  };

  return (
    <View className="flex-1 items-center justify-center p-6 bg-premium-white">
      <Text className="text-2xl font-manrope-extrabold mb-4">
        {steps[step].title}
      </Text>

      <Text className="text-center text-premium-gray mb-8">
        {steps[step].text}
      </Text>

      <TouchableOpacity
        onPress={next}
        className="bg-gold px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-manrope-semibold">
          {step === steps.length - 1 ? "Empezar" : "Siguiente"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}