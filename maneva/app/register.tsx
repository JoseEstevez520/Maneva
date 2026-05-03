import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
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
import { useThemeColors } from "@/hooks/useThemeColors";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Debe conter polo menos 2 caracteres"),
    email: z.string().email("Correo electrónico incorrecto ou non válido"),
    phone: z
      .string()
      .min(9, "Debe conter polo menos 9 díxitos")
      .regex(/^\+?[0-9\s\-().]{9,20}$/, "Teléfono non válido")
      .optional()
      .or(z.literal("")),
    password: z.string().min(6, "Debe conter polo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Os contrasinais non coinciden",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const themeColors = useThemeColors();
  const router = useRouter();
  const { register, registerAndMerge, loading, error, phoneAlreadyExists } = useAuth();
  const [pendingData, setPendingData] = useState<RegisterForm | null>(null);

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
    setPendingData(data);
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

  const handleMerge = async () => {
    if (!pendingData?.phone) return;
    const success = await registerAndMerge(
      pendingData.email,
      pendingData.password,
      pendingData.fullName,
      pendingData.phone,
    );
    if (success) {
      router.replace("/onboarding");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background dark:bg-background-dark"
    >
      {/* Cabecera fija */}
      <Animated.View
        entering={FadeInDown.duration(600).springify()}
        className="absolute top-0 left-0 right-0 z-20 bg-background dark:bg-background-dark px-6 pt-14 pb-4"
      >
        <View className="flex-row items-center gap-2">
          <Image
            source={require("../assets/images/logo.png")}
            className="w-10 h-10"
            resizeMode="contain"
          />
          <H1 className="font-manrope-extrabold text-xl tracking-tight text-foreground dark:text-foreground-dark">
            MANEVA
          </H1>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerClassName="flex-grow px-8 pt-32 pb-16"
        showsVerticalScrollIndicator={false}
      >
        {/* Título */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(800).springify()}
          className="mb-8"
        >
          <H1 className="font-manrope-extrabold text-3xl text-foreground dark:text-foreground-dark mb-1">
            Crear conta
          </H1>
          <Body className="font-manrope text-foreground-muted dark:text-foreground-muted-dark">
            Únete a Maneva e descobre o teu estilo
          </Body>
        </Animated.View>

        {/* Banner: teléfono ya existe (cuenta de WhatsApp) */}
        {phoneAlreadyExists && (
          <Animated.View
            entering={FadeInUp}
            className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 gap-3"
          >
            <Caption className="font-manrope-semibold text-amber-800">
              Ese número xa ten citas pedidas por WhatsApp. Preme o botón
              para crear a túa conta e vincular as túas citas automaticamente.
            </Caption>
            <Button
              onPress={handleMerge}
              loading={loading}
              size="sm"
              variant="secondary"
            >
              Crear conta e vincular as miñas citas
            </Button>
          </Animated.View>
        )}

        {/* Error general */}
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
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Nome completo"
                placeholder="Xoán Pérez"
                value={value}
                onChangeText={onChange}
                error={errors.fullName?.message}
                leftIcon={
                  <IconUser color={themeColors.premium.gray.icon} size={20} />
                }
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Correo electrónico"
                placeholder="tu@email.com"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={
                  <IconMail color={themeColors.premium.gray.icon} size={20} />
                }
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Teléfono (opcional)"
                placeholder="+34 600 000 000"
                value={value}
                onChangeText={onChange}
                error={errors.phone?.message}
                keyboardType="phone-pad"
                leftIcon={
                  <IconPhone color={themeColors.premium.gray.icon} size={20} />
                }
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Contrasinal"
                placeholder="••••••••"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Confirmar contrasinal"
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
          className="mt-8 mb-0 relative -mx-8 px-8"
        >
          <Image
            source={require("../assets/images/onboarding/flores.png")}
            className="absolute w-60 h-60 opacity-35"
            resizeMode="contain"
            style={{
              bottom: -12,
              left: 0,
              zIndex: 0,
              transform: [{ rotate: "-90deg" }],
            }}
          />

          <View className="relative z-10 gap-6">
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              size="sm"
            >
              Crear conta
            </Button>

            <View className="flex-row justify-center items-center gap-1">
              <Body
                numberOfLines={1}
                className="font-manrope text-foreground-muted dark:text-foreground-muted-dark"
                style={{
                  textShadowColor: themeColors.premium.white,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 2,
                }}
              >
                Xa tes conta?
              </Body>
              <Link href="/login" asChild>
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="pb-1 border-b border-premium-black"
                >
                  <Caption
                    numberOfLines={1}
                    className="font-manrope-extrabold text-foreground dark:text-foreground-dark uppercase tracking-wider text-[11px]"
                    style={{
                      textShadowColor: themeColors.premium.white,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 2,
                    }}
                  >
                    Inicia sesión
                  </Caption>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
