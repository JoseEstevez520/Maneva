import React, { useEffect, useMemo, useState } from 'react'
import { Image, ScrollView, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'

import { Body, Caption, H2 } from '@/components/ui/Typography'
import { Input } from '@/components/ui/Input'
import { IconChevron } from '@/components/ui/icons'
import { BrandHeader } from '@/components/ui/BrandHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useUserStyleProfile } from '@/hooks/useUserStyleProfile'


function Row({
  title,
  subtitle,
  onPress,
  showChevron = true,
}: {
  title: string
  subtitle?: string
  onPress?: () => void
  showChevron?: boolean
}) {
  const clickable = !!onPress
  const themeColors = useThemeColors()

  return (
    <TouchableOpacity
      disabled={!clickable}
      onPress={onPress}
      activeOpacity={0.78}
      className={`px-6 py-6 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark ${!clickable ? 'opacity-80' : ''}`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Body className="font-manrope-medium text-[17px] text-foreground dark:text-foreground-dark">{title}</Body>
          {subtitle ? <Body className="mt-1 text-[14px] text-foreground-subtle dark:text-foreground-subtle-dark">{subtitle}</Body> : null}
        </View>
        {showChevron ? <IconChevron size={20} color={themeColors.premium.gray.iconMuted} strokeWidth={2.2} /> : null}
      </View>
    </TouchableOpacity>
  )
}

export default function GeneralSettingsScreen() {
  const router = useRouter()
  const { data: profile, loading: profileLoading, updateProfile } = useUserProfile()
  const { languages, styleProfile, saveStyleProfile } = useUserStyleProfile()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    setFirstName(profile?.first_name ?? '')
    setLastName(profile?.last_name ?? '')
  }, [profile])

  useEffect(() => {
    setAvatarUrl(styleProfile?.avatar_url ?? '')
  }, [styleProfile])

  const currentLanguage = useMemo(() => {
    const current = languages.find((language) => language.id === profile?.language_id)
    return current?.name ?? 'Galego'
  }, [languages, profile?.language_id])

  const userInitials = useMemo(() => {
    const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.trim()
    return initials || 'U'
  }, [firstName, lastName])

  const [dialog, setDialog] = useState<{ title: string; message?: string; onConfirm: () => void } | null>(null)
  const closeDialog = () => setDialog(null)

  const handleSaveUserProfile = async () => {
    try {
      await updateProfile({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      })
      await saveStyleProfile({
        avatar_url: avatarUrl.trim() || null,
      })
      setDialog({ title: 'Gardado', message: 'Os datos do usuario actualizáronse.', onConfirm: closeDialog })
    } catch {
      setDialog({ title: 'Erro', message: 'Non se puideron gardar os datos do usuario.', onConfirm: closeDialog })
    }
  }

  const version = Constants.expoConfig?.version ?? '1.0.0'

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <BrandHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
        <View className="px-6 py-8">
          <H2 className="font-manrope-bold text-[30px] leading-[36px] text-foreground dark:text-foreground-dark">Axustes xerais</H2>
        </View>

        <View className="bg-surface dark:bg-surface-dark border-y border-border dark:border-border-dark">
          <View className="px-6 py-5">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[3.2px] uppercase text-foreground-subtle dark:text-foreground-subtle-dark">
              Os teus datos
            </Caption>
          </View>

          <View className="px-6 pb-6 gap-5">
            <View className="items-center gap-4">
              <View className="w-24 h-24 rounded-full bg-surface-overlay dark:bg-surface-overlay-dark border border-border dark:border-border-dark items-center justify-center overflow-hidden">
                {avatarUrl.trim() ? (
                  <Image source={{ uri: avatarUrl.trim() }} className="w-full h-full" />
                ) : (
                  <Body className="font-manrope-extrabold text-[26px] text-gold">{userInitials}</Body>
                )}
              </View>
              <Caption className="font-manrope-semibold text-[12px] tracking-[2px] uppercase text-foreground-subtle dark:text-foreground-subtle-dark text-center">
                Foto de perfil
              </Caption>
            </View>

            <Input
              label="Nome"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="O teu nome"
              autoCapitalize="words"
            />

            <Input
              label="Apelidos"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Os teus apelidos"
              autoCapitalize="words"
            />

            <Input
              label="Foto de perfil"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="Pega a URL da túa foto"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <TouchableOpacity
              onPress={() => {
                void handleSaveUserProfile()
              }}
              disabled={profileLoading}
              activeOpacity={0.82}
              className={`h-12 rounded-full bg-gold items-center justify-center ${profileLoading ? 'opacity-60' : ''}`}
            >
              <Caption className="font-manrope-extrabold text-[13px] tracking-[2px] uppercase text-premium-white dark:text-premium-white">
                {profileLoading ? 'Gardando...' : 'Gardar cambios'}
              </Caption>
            </TouchableOpacity>
          </View>
        </View>

        {/* TODO: abrir selector de idioma con persistencia completa */}
        <Row title="Idioma" subtitle={currentLanguage} />
        {/* TODO: enlazar contenido legal y seguridad reales */}
        <Row title="Privacidade e seguridade" />
        <Row title="Termos do servizo" />
        <Row title="Política de privacidade" onPress={() => router.push('/(tabs)/settings/privacy-policy')} />
        <Row title="Versión da app" subtitle={`v${version}`} showChevron={false} />
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
    </SafeAreaView>
  )
}
