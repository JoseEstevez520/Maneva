import { View, Image, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { H1, Body, Caption } from '@/components/ui/Typography'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <View className="flex-1 bg-premium-white-soft items-center justify-center px-8">

      {/* Logo + nombre + frase */}
      <Animated.View entering={FadeInDown.duration(800).springify()} className="items-center mb-16">
        <Image
          source={require('../assets/images/logo.png')}
          className="w-40 h-40 -mb-2"
          resizeMode="contain"
        />
        <View className="flex-row items-baseline mb-3">
          <H1 className="font-manrope-extrabold text-5xl tracking-tighter text-premium-black">
            MANEVA
          </H1>
          <View className="w-2.5 h-2.5 rounded-full bg-gold ml-1" />
        </View>
        <Body className="font-manrope text-premium-gray text-center text-base">
          Tu peluquería premium, a un toque
        </Body>
      </Animated.View>

      {/* Botones */}
      <Animated.View entering={FadeInUp.delay(300).duration(800).springify()} className="w-full gap-4">
        {/* Botón primario — Iniciar sesión */}
        <TouchableOpacity
          onPress={() => router.push('/login')}
          activeOpacity={0.85}
          className="w-full bg-gold rounded-2xl py-4 items-center shadow-premium-gold"
        >
          <Caption className="font-manrope-extrabold text-[#000000] uppercase tracking-widest text-sm">
            Iniciar sesión
          </Caption>
        </TouchableOpacity>

        {/* Botón secundario — Crear cuenta */}
        <TouchableOpacity
          onPress={() => router.push('/register')}
          activeOpacity={0.85}
          className="w-full bg-premium-white border-2 border-premium-black rounded-2xl py-4 items-center"
        >
          <Caption className="font-manrope-extrabold text-[#000000] uppercase tracking-widest text-sm">
            Crear cuenta
          </Caption>
        </TouchableOpacity>
      </Animated.View>

    </View>
  )
}
