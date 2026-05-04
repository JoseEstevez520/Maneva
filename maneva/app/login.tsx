import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocalSearchParams } from "expo-router";
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
import { IconMail, IconPhone } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColors } from "@/hooks/useThemeColors";

// ── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Correo electrónico incorrecto ou non válido"),
  password: z.string().min(6, "Debe conter polo menos 6 caracteres"),
});

const phoneSchema = z.object({
  phone: z
    .string()
    .min(9, "Debe conter polo menos 9 díxitos")
    .regex(/^\+?[0-9\s\-().]{9,20}$/, "Teléfono non válido"),
});

type LoginForm = z.infer<typeof loginSchema>;
type PhoneForm = z.infer<typeof phoneSchema>;
type DialogCfg = { title: string; message?: string; onConfirm: () => void };

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const themeColors = useThemeColors();
  const { login, loginWithPhone, verifyPhone, loading, error } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const [authMode, setAuthMode] = useState<"email" | "phone">(
    mode === "phone" ? "phone" : "email",
  );
  const [phoneStep, setPhoneStep] = useState<"input" | "otp">("input");
  const [sentToPhone, setSentToPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [dialog, setDialog] = useState<DialogCfg | null>(null);
  const closeDialog = () => setDialog(null);

  // ── Email form ──────────────────────────────────────────────────────────────

  const emailForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onEmailSubmit = (data: LoginForm) => {
    login(data.email, data.password);
  };

  const handleForgotPassword = () => {
    setDialog({
      title: "Recuperar contrasinal",
      message:
        "A funcionalidade de recuperación estará dispoñible proximamente. Por favor, contacta con soporte para restablecer o teu acceso.",
      onConfirm: closeDialog,
    });
  };

  // ── Phone form ──────────────────────────────────────────────────────────────

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const onPhoneSubmit = async (data: PhoneForm) => {
    const sent = await loginWithPhone(data.phone);
    if (sent) {
      setSentToPhone(data.phone);
      setPhoneStep("otp");
      setOtpCode("");
    }
  };

  const handleVerifyOtp = async () => {
    await verifyPhone(sentToPhone, otpCode.trim());
    // Si va bien, el auth guard en _layout.tsx redirige automáticamente
  };

  const handleResendOtp = async () => {
    await loginWithPhone(sentToPhone);
  };

  const handleChangePhone = () => {
    setPhoneStep("input");
    setOtpCode("");
    phoneForm.reset();
  };

  const handleModeChange = (newMode: "email" | "phone") => {
    setAuthMode(newMode);
    setPhoneStep("input");
    setOtpCode("");
    phoneForm.reset();
    emailForm.reset();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <Image
        source={require("../assets/images/onboarding/flores.png")}
        className="absolute w-60 h-60 opacity-35"
        resizeMode="contain"
        style={{ top: -8, right: 0, zIndex: 40, transform: [{ rotate: "90deg" }] }}
      />

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
        contentContainerClassName="flex-grow justify-center px-8 pt-32 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Título */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(800).springify()}
          className="mb-6"
        >
          <H1 className="font-manrope-extrabold text-3xl text-foreground dark:text-foreground-dark mb-1">
            Iniciar sesión
          </H1>
          <Body className="font-manrope text-foreground-muted dark:text-foreground-muted-dark">
            Accede á túa conta e segue desfrutando
          </Body>
        </Animated.View>

        {/* Toggle Email / Teléfono */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(800).springify()}
          className="flex-row mb-6 border-b border-gray-200 dark:border-gray-700"
        >
          <TouchableOpacity
            className={`flex-1 pb-3 ${authMode === "email" ? "border-b-2 border-gold" : ""}`}
            onPress={() => handleModeChange("email")}
            activeOpacity={0.7}
          >
            <Caption
              className={`font-manrope-semibold text-center ${authMode === "email" ? "text-gold" : "text-foreground-muted dark:text-foreground-muted-dark"}`}
            >
              Email
            </Caption>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 pb-3 ${authMode === "phone" ? "border-b-2 border-gold" : ""}`}
            onPress={() => handleModeChange("phone")}
            activeOpacity={0.7}
          >
            <Caption
              className={`font-manrope-semibold text-center ${authMode === "phone" ? "text-gold" : "text-foreground-muted dark:text-foreground-muted-dark"}`}
            >
              Teléfono
            </Caption>
          </TouchableOpacity>
        </Animated.View>

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

        {/* ── Modo Email ── */}
        {authMode === "email" && (
          <Animated.View
            entering={FadeInUp.delay(200).duration(800).springify()}
            className="gap-5"
          >
            <Controller
              control={emailForm.control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Correo electrónico"
                  placeholder="tu@email.com"
                  value={value}
                  onChangeText={onChange}
                  error={emailForm.formState.errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={
                    <IconMail color={themeColors.premium.gray.icon} size={20} />
                  }
                />
              )}
            />

            <View>
              <Controller
                control={emailForm.control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Contrasinal"
                    placeholder="••••••••"
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                    error={emailForm.formState.errors.password?.message}
                  />
                )}
              />
              <TouchableOpacity
                onPress={handleForgotPassword}
                className="mt-3 self-end"
                activeOpacity={0.7}
              >
                <Caption className="font-manrope-semibold text-gold tracking-wide">
                  Esqueciches o teu contrasinal?
                </Caption>
              </TouchableOpacity>
            </View>

            <View className="mt-5 gap-6">
              <Button
                onPress={emailForm.handleSubmit(onEmailSubmit)}
                loading={loading}
                size="sm"
              >
                Iniciar sesión
              </Button>
              <RegisterLink />
            </View>
          </Animated.View>
        )}

        {/* ── Modo Teléfono — paso 1: introducir número ── */}
        {authMode === "phone" && phoneStep === "input" && (
          <Animated.View
            entering={FadeInUp.delay(200).duration(800).springify()}
            className="gap-5"
          >
            <Body className="font-manrope text-foreground-muted dark:text-foreground-muted-dark">
              Recibirás un SMS cun código de verificación.
            </Body>

            <Controller
              control={phoneForm.control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Número de teléfono"
                  placeholder="+34 600 000 000"
                  value={value}
                  onChangeText={onChange}
                  error={phoneForm.formState.errors.phone?.message}
                  keyboardType="phone-pad"
                  leftIcon={
                    <IconPhone
                      color={themeColors.premium.gray.icon}
                      size={20}
                    />
                  }
                />
              )}
            />

            <View className="mt-5 gap-6">
              <Button
                onPress={phoneForm.handleSubmit(onPhoneSubmit)}
                loading={loading}
                size="sm"
              >
                Enviar código
              </Button>
              <RegisterLink />
            </View>
          </Animated.View>
        )}

        {/* ── Modo Teléfono — paso 2: introducir OTP ── */}
        {authMode === "phone" && phoneStep === "otp" && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(600).springify()}
            className="gap-5"
          >
            <Body className="font-manrope text-foreground-muted dark:text-foreground-muted-dark">
              Enviamos un código a{" "}
              <Body className="font-manrope-semibold text-foreground dark:text-foreground-dark">
                {sentToPhone}
              </Body>
            </Body>

            <Input
              label="Código de verificación"
              placeholder="123456"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              leftIcon={
                <IconPhone color={themeColors.premium.gray.icon} size={20} />
              }
            />

            <View className="mt-5 gap-4">
              <Button
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={otpCode.trim().length < 6}
                size="sm"
              >
                Verificar
              </Button>

              <View className="flex-row justify-center gap-4">
                <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
                  <Caption className="font-manrope-semibold text-gold">
                    Reenviar código
                  </Caption>
                </TouchableOpacity>
                <Caption className="text-foreground-muted dark:text-foreground-muted-dark">
                  ·
                </Caption>
                <TouchableOpacity
                  onPress={handleChangePhone}
                  activeOpacity={0.7}
                >
                  <Caption className="font-manrope-semibold text-foreground-muted dark:text-foreground-muted-dark">
                    Cambiar número
                  </Caption>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {dialog && (
        <ConfirmDialog
          visible
          title={dialog.title}
          message={dialog.message}
          confirmLabel="Entendido"
          onConfirm={dialog.onConfirm}
          onCancel={closeDialog}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function RegisterLink() {
  return (
    <View className="flex-row justify-center items-center">
      <Body className="font-manrope text-foreground-muted dark:text-foreground-muted-dark">
        Aínda non tes conta?{" "}
      </Body>
      <Link href="/register" asChild>
        <TouchableOpacity
          activeOpacity={0.7}
          className="pb-1 border-b border-premium-black"
        >
          <Caption className="font-manrope-extrabold text-foreground dark:text-foreground-dark uppercase tracking-wider text-[11px]">
            Rexístrate aquí
          </Caption>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
