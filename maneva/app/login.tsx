import React from 'react'
import { View, KeyboardAvoidingView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { H1, Body } from '@/components/ui/Typography'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-premium-white"
    >
      <View className="flex-1 justify-center px-6">
        <H1 className="mb-2">Maneva</H1>
        <Body className="mb-8">Tu peluquería premium, a un toque</Body>

        {error && <Body className="text-red-500 mb-4">{error}</Body>}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email"
              placeholder="tu@email.com"
              value={value}
              onChangeText={onChange}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Contraseña"
              placeholder="********"
              value={value}
              onChangeText={onChange}
              secureTextEntry
              error={errors.password?.message}
            />
          )}
        />

        <View className="mt-6">
          <Button onPress={handleSubmit(onSubmit)} loading={loading}>
            Iniciar sesión
          </Button>
        </View>

        <View className="flex-row justify-center mt-6">
          <Body>¿No tienes cuenta? </Body>
          <Link href="/register" className="text-gold font-manrope-semibold">
            Regístrate aquí
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

