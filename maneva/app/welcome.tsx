import { Body, Caption, H1 } from "@/components/ui/Typography";
import { useRouter } from "expo-router";
import { Image, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background dark:bg-background-dark items-center justify-center px-8">
      {/* Logo + nombre + frase */}
      <Animated.View
        entering={FadeInDown.duration(800).springify()}
        className="items-center mb-16"
      >
        <Image
          source={require("../assets/images/logo.png")}
          className="w-40 h-40 -mb-2"
          resizeMode="contain"
        />
        <H1 className="font-manrope-extrabold text-5xl tracking-tighter text-foreground dark:text-foreground-dark mb-3">
          MANEVA
        </H1>
        <Body className="font-manrope text-foreground-muted dark:text-foreground-muted-dark text-center text-base">
          Tu peluquería premium, a un toque
        </Body>
      </Animated.View>

      {/* Botones */}
      <Animated.View
        entering={FadeInUp.delay(300).duration(800).springify()}
        className="w-full gap-4"
      >
        {/* Botón primario — Iniciar sesión */}
        <TouchableOpacity
          onPress={() => router.push("/login")}
          activeOpacity={0.85}
          className="w-full bg-gold rounded-2xl py-4 items-center shadow-premium-gold"
        >
          <Caption className="font-manrope-extrabold !text-premium-white uppercase tracking-wide text-sm" numberOfLines={1}>
            Iniciar sesión
          </Caption>

        </TouchableOpacity>

        {/* Botón secundario — Crear cuenta */}
        <TouchableOpacity
          onPress={() => router.push("/register")}
          activeOpacity={0.85}
          className="w-full bg-surface dark:bg-surface-dark border-2 border-premium-black rounded-2xl py-4 items-center"
        >
          <Caption className="font-manrope-extrabold !text-foreground dark:text-foreground-dark uppercase tracking-widest text-sm">
            Crear cuenta
          </Caption>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
