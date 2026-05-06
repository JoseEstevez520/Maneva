import React, { useMemo, useState } from 'react'
import { ScrollView, Switch, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { Body, Caption, H1, H2 } from '@/components/ui/Typography'
import { IconChevron, IconUser } from '@/components/ui/icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useUserStyleProfile } from '@/hooks/useUserStyleProfile'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type MenuRowProps = {
  label: string
  onPress?: () => void
  disabled?: boolean
  showChevron?: boolean
  danger?: boolean
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-8">
      <Caption className="px-6 mb-3 font-manrope-extrabold text-[11px] tracking-[3px] uppercase text-foreground-subtle dark:text-foreground-subtle-dark">
        {title}
      </Caption>
      <View className="bg-surface dark:bg-surface-dark border-y border-border dark:border-border-dark">{children}</View>
    </View>
  )
}

function MenuRow({ label, onPress, disabled = false, showChevron = true, danger = false }: MenuRowProps) {
  const themeColors = useThemeColors()
  const textColor = danger ? 'text-red-600' : 'text-foreground dark:text-foreground-dark'

  return (
    <TouchableOpacity
      className={`px-6 py-6 flex-row items-center justify-between border-b border-border dark:border-border-dark ${disabled ? 'opacity-50' : ''}`}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.75}
    >
      <Body className={`font-manrope-medium text-[16px] flex-1 pr-3 ${textColor}`}>{label}</Body>
      {showChevron ? (
        <IconChevron size={20} color={themeColors.premium.gray.iconMuted} strokeWidth={2.2} />
      ) : null}
    </TouchableOpacity>
  )
}

function SwitchRow({
  label,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string
  value: boolean
  onValueChange: (nextValue: boolean) => void
  disabled?: boolean
}) {
  const themeColors = useThemeColors()

  return (
    <View className={`px-6 py-6 flex-row items-center justify-between border-b border-border dark:border-border-dark ${disabled ? 'opacity-50' : ''}`}>
      <Body className="font-manrope-medium text-[16px] text-foreground dark:text-foreground-dark">{label}</Body>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: themeColors.premium.divider.switch, true: themeColors.gold.light }}
        thumbColor={value ? themeColors.gold.DEFAULT : themeColors.premium.white}
        ios_backgroundColor={themeColors.premium.divider.switch}
      />
    </View>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const themeColors = useThemeColors()
  const { data: profile } = useUserProfile()
  const { styleProfile, saveStyleProfile } = useUserStyleProfile()
  const { logout } = useAuth()
  const { colorScheme, setColorScheme } = useUiStore()

  const fullName = useMemo(() => {
    const firstName = profile?.first_name?.trim() ?? ''
    const lastName = profile?.last_name?.trim() ?? ''
    const joined = [firstName, lastName].filter(Boolean).join(' ')
    return joined || 'Nome de usuario'
  }, [profile?.first_name, profile?.last_name])

  const simpleModeEnabled = styleProfile?.simple_mode ?? false
  const darkModeEnabled = colorScheme === 'dark'

  const [dialog, setDialog] = useState<{
    title: string; message?: string; confirmLabel?: string
    cancelLabel?: string; destructive?: boolean; onConfirm: () => void
  } | null>(null)
  const closeDialog = () => setDialog(null)

  const handleSimpleModeChange = async (nextValue: boolean) => {
    try {
      await saveStyleProfile({ simple_mode: nextValue })
    } catch {
      setDialog({ title: 'Erro', message: 'Non se puido actualizar o modo sinxelo.', onConfirm: closeDialog })
    }
  }

  const handleDarkModeChange = (nextValue: boolean) => {
    setColorScheme(nextValue ? 'dark' : 'light')
  }

  const handleLogout = () => {
    setDialog({
      title: 'Pechar sesión',
      message: 'Seguro que queres pechar sesión?',
      confirmLabel: 'Pechar sesión',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: () => { closeDialog(); logout() },
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <View className="items-center border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark py-5">
        <H1 className="font-manrope-extrabold text-[18px] tracking-[6px]">MANEVA</H1>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="items-center pt-10 pb-6 px-6 bg-surface dark:bg-surface-dark">
          <View className="w-[120px] h-[120px] rounded-full border border-gold-border-alt items-center justify-center bg-surface-raised dark:bg-surface-raised-dark shadow-input">
            <IconUser size={42} color={themeColors.premium.gray.secondary} strokeWidth={2.2} />
          </View>
          <H2 className="mt-8 px-3 font-manrope-bold text-[28px] leading-[34px] text-center">{fullName}</H2>
          <Caption className="mt-2 font-manrope-medium">{user?.email ?? ''}</Caption>
        </View>

        <MenuSection title="A miña conta">
          <MenuRow label="Preferencias de cita" onPress={() => router.push('/(tabs)/settings/booking-preferences')} />
          <MenuRow label="Cortes de referencia" onPress={() => router.push('/(tabs)/settings/reference-cuts')} />
          <MenuRow label="Citas por terceiros" onPress={() => router.push('/(tabs)/settings/bookings-delegation')} />
        </MenuSection>

        <MenuSection title="Configuración da app">
          <MenuRow label="Notificacións" onPress={() => router.push('/(tabs)/settings/notifications')} />
          <SwitchRow label="Modo escuro" value={darkModeEnabled} onValueChange={handleDarkModeChange} />
          <SwitchRow label="Modo sinxelo" value={simpleModeEnabled} onValueChange={handleSimpleModeChange} />
          <MenuRow label="Axustes xerais" onPress={() => router.push('/(tabs)/settings/general-settings')} />
        </MenuSection>

        <View className="items-center py-10">
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.75}>
            <Caption className="font-manrope-extrabold uppercase tracking-[2.5px] text-[15px] text-red-600">
              Pechar sesión
            </Caption>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {dialog && (
        <ConfirmDialog
          visible
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel ?? 'Entendido'}
          cancelLabel={dialog.cancelLabel}
          destructive={dialog.destructive}
          onConfirm={dialog.onConfirm}
          onCancel={closeDialog}
        />
      )}
    </SafeAreaView>
  )
}
