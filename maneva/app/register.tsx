import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as z from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Body, Caption, H1 } from "@/components/ui/Typography";
import { IconMail, IconPhone, IconUser } from "@/components/ui/icons";
import { useAuth } from "@/hooks/useAuth";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Debe contener al menos 2 caracteres"),
    email: z.string().email("Email inválido o incorrecto"),
    phone: z
      .string()
      .min(9, "Debe contener al menos 9 dígitos")
      .regex(/^\+?[0-9\s\-().]{9,20}$/, "Teléfono inválido")
      .optional()
      .or(z.literal("")),
    password: z.string().min(6, "Debe contener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loading, error } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    const success = await register(
      data.email,
      data.password,
      data.fullName,
      data.phone || undefined,
    );
    if (success) {
      router.replace("/onboarding");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-premium-white-soft"
    >
      {/* Cabecera: logo + nombre pequeños en esquina superior izquierda */}
      <Animated.View
        entering={FadeInDown.duration(600).springify()}
        className="absolute top-14 left-6 z-10 flex-row items-center gap-2"
      >
        <Image
          source={require("../assets/images/logo.png")}
          className="w-10 h-10"
          resizeMode="contain"
        />
        <H1 className="font-manrope-extrabold text-xl tracking-tight text-premium-black">
          MANEVA
        </H1>
      </Animated.View>

      <ScrollView
        contentContainerClassName="flex-grow px-8 pt-28 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Título de la pantalla */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(800).springify()}
          className="mb-8"
        >
          <H1 className="font-manrope-extrabold text-3xl text-premium-black mb-1">
            Crear cuenta
          </H1>
          <Body className="font-manrope text-premium-gray">
            Únete a Maneva y descubre tu estilo
          </Body>
        </Animated.View>

        {/* Mensaje de error general */}
        {error && (
          <Animated.View
            entering={FadeInUp}
            className="bg-red-50 p-4 rounded-xl border border-red-200 mb-6"
          >
            <Caption className="font-manrope-semibold text-red-600 text-center">
              {error}
            </Caption>
          </Animated.View>
        )}

        {/* Inputs */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(800).springify()}
          className="gap-4"
        >
          {/* Nombre completo */}
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Nombre completo"
                placeholder="Juan Pérez"
                value={value}
                onChangeText={onChange}
                error={errors.fullName?.message}
                leftIcon={<IconUser color="#737373" size={20} />}
              />
            )}
          />

          {/* Correo */}
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

          {/* Teléfono */}
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Teléfono"
                placeholder="+34 600 000 000"
                value={value}
                onChangeText={onChange}
                error={errors.phone?.message}
                keyboardType="phone-pad"
                leftIcon={<IconPhone color="#737373" size={20} />}
              />
            )}
          />

          {/* Contraseña */}
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

          {/* Confirmar contraseña */}
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Confirmar contraseña"
                placeholder="••••••••"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                error={errors.confirmPassword?.message}
              />
            )}
          />
        </Animated.View>

        {/* Botonera */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(800).springify()}
          className="mt-8 gap-6 mb-6"
        >
          <Button onPress={handleSubmit(onSubmit)} loading={loading} size="sm">
            Crear cuenta
          </Button>

          <View className="flex-row justify-center items-center">
            <Body className="font-manrope text-premium-gray">
              ¿Ya tienes cuenta?{" "}
            </Body>
            <Link href="/login" asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                className="pb-1 border-b border-premium-black"
              >
                <Caption className="font-manrope-extrabold text-premium-black uppercase tracking-wider text-[11px]">
                  Inicia sesión
                </Caption>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
