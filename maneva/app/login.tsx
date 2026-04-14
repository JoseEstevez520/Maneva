import React from 'react'
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Image } from 'react-native'
import { Link } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'

import { H1, Body, Caption } from '@/components/ui/Typography'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { IconMail } from '@/components/ui/icons'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Email inválido o incorrecto'),
  password: z.string().min(6, 'Debe contener al menos 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginScreen() {
  const { login, loading, error } = useAuth()
  
  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  })

  const onSubmit = (data: LoginForm) => {
    login(data.email, data.password)
  }

  const handleForgotPassword = () => {
    Alert.alert(
      "Recuperar contraseña", 
      "Funcionalidad de recuperación próximamente.\n\nPor favor, contacta con soporte para restablecer tu acceso."
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-premium-white-soft"
    >
      {/* Cabecera: logo + nombre pequeños en esquina superior izquierda */}
      <Animated.View entering={FadeInDown.duration(600).springify()} className="absolute top-14 left-6 z-10 flex-row items-center gap-2">
        <Image
          source={require('../assets/images/logo.png')}
          className="w-10 h-10"
          resizeMode="contain"
        />
        <H1 className="font-manrope-extrabold text-xl tracking-tight text-premium-black">MANEVA</H1>
      </Animated.View>

      <View className="flex-1 justify-center px-8">

        {/* Título de la pantalla */}
        <Animated.View entering={FadeInDown.delay(100).duration(800).springify()} className="mb-8">
          <H1 className="font-manrope-extrabold text-3xl text-premium-black mb-1">Iniciar sesión</H1>
          <Body className="font-manrope text-premium-gray">Accede a tu cuenta y sigue disfrutando</Body>
        </Animated.View>

        {/* Mensaje de error general */}
        {error && (
          <Animated.View entering={FadeInUp} className="bg-red-50 p-4 rounded-xl border border-red-200 mb-6">
            <Caption className="font-manrope-semibold text-red-600 text-center">{error}</Caption>
          </Animated.View>
        )}

        {/* Inputs */}
        <Animated.View entering={FadeInUp.delay(200).duration(800).springify()} className="gap-5">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Correo Electrónico"
                placeholder="tu@email.com"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<IconMail color="#737373" size={20} />}
              />
            )}
          />

          <View>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Contraseña"
                  placeholder="••••••••"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />
            
            {/* Olvidaste tu contraseña */}
            <TouchableOpacity 
              onPress={handleForgotPassword}
              className="mt-3 self-end"
              activeOpacity={0.7}
            >
              <Caption className="font-manrope-semibold text-gold tracking-wide">
                ¿Olvidaste tu contraseña?
              </Caption>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(800).springify()} className="mt-10 gap-6">
          <Button onPress={handleSubmit(onSubmit)} loading={loading} size="sm">
            Iniciar sesión
          </Button>

          <View className="flex-row justify-center items-center">
            <Body className="font-manrope text-premium-gray">¿Aún no tienes cuenta? </Body>
            <Link href="/register" asChild>
              <TouchableOpacity activeOpacity={0.7} className="pb-1 border-b border-premium-black">
                <Caption className="font-manrope-extrabold text-premium-black uppercase tracking-wider text-[11px]">
                  Regístrate aquí
                </Caption>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
        
      </View>
    </KeyboardAvoidingView>
  )
}

