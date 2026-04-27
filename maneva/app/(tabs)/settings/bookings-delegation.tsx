import React, { useMemo, useState } from 'react'
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { format, parseISO } from 'date-fns'

import { Body, Caption, H2 } from '@/components/ui/Typography'
import { IconAdd, IconChevron } from '@/components/ui/icons'
import { BrandHeader } from '@/components/ui/BrandHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useLinkedProfiles } from '@/hooks/useLinkedProfiles'


function fullName(firstName: string | null, lastName: string | null): string {
  const value = [firstName ?? '', lastName ?? ''].map((item) => item.trim()).filter(Boolean).join(' ')
  return value || 'Usuario'
}

function formatDateLabel(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy')
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Caption className="px-6 mb-4 font-manrope-extrabold text-[10px] tracking-[3.8px] uppercase text-foreground-subtle dark:text-foreground-subtle-dark">
      {children}
    </Caption>
  )
}

function ActionText({
  label,
  colorClassName,
  onPress,
}: {
  label: string
  colorClassName: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Caption className={`font-manrope-extrabold text-[12px] tracking-[1.3px] uppercase ${colorClassName}`}>
        {label}
      </Caption>
    </TouchableOpacity>
  )
}

function PersonCard({
  name,
  relation,
  permissionLabel,
  dateLabel,
  primaryLabel,
  primaryColorClassName,
  onPrimaryPress,
  secondaryLabel,
  secondaryColorClassName,
  onSecondaryPress,
}: {
  name: string
  relation?: string | null
  permissionLabel: string
  dateLabel: string
  primaryLabel: string
  primaryColorClassName: string
  onPrimaryPress: () => void
  secondaryLabel: string
  secondaryColorClassName: string
  onSecondaryPress: () => void
}) {
  return (
    <View className="px-6 py-5 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1 pr-2">
          <Body className="font-manrope-bold text-[18px] leading-[24px] text-foreground dark:text-foreground-dark">
            {name}
          </Body>
          {relation ? (
            <Body className="mt-1 font-manrope text-[13px] text-foreground-subtle dark:text-foreground-subtle-dark">
              {relation}
            </Body>
          ) : null}
          <Body className="mt-2 font-manrope-medium text-[13px] text-foreground dark:text-foreground-dark">
            Permiso: {permissionLabel}
          </Body>
          <Body className="mt-1 font-manrope text-[12px] text-foreground-subtle dark:text-foreground-subtle-dark">
            Desde: {dateLabel}
          </Body>
        </View>

        <View className="items-end gap-3 pt-0.5">
          <ActionText label={primaryLabel} colorClassName={primaryColorClassName} onPress={onPrimaryPress} />
          <ActionText label={secondaryLabel} colorClassName={secondaryColorClassName} onPress={onSecondaryPress} />
        </View>
      </View>
    </View>
  )
}

function AddPersonTrigger({ onPress }: { onPress: () => void }) {
  const themeColors = useThemeColors()
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-row items-center gap-3 px-6 py-4"
    >
      <View className="w-5 h-5 rounded-full bg-gold items-center justify-center">
        <IconAdd size={11} color={themeColors.premium.white} strokeWidth={3} />
      </View>
      <Caption className="font-manrope-extrabold text-[14px] tracking-[0.8px] text-gold">
        Añadir persona
      </Caption>
    </TouchableOpacity>
  )
}

function InfoCard({
  title,
  actionLabel,
  onPress,
  children,
}: {
  title: string
  actionLabel: string
  onPress: () => void
  children?: React.ReactNode
}) {
  const themeColors = useThemeColors()
  return (
    <View className="mx-6 mt-4 rounded-[18px] bg-surface-overlay dark:bg-surface-overlay-dark px-5 py-5">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-3 flex-1 pr-3">
          <View className="w-5 h-5 rounded-full bg-gold items-center justify-center">
            <Text className="text-[11px] font-bold text-premium-white">i</Text>
          </View>
          <Body className="flex-1 font-manrope-medium text-[13px] leading-5 text-foreground-muted dark:text-foreground-muted-dark">
            {title}
          </Body>
        </View>

        <TouchableOpacity onPress={onPress} activeOpacity={0.75} className="flex-row items-center gap-1">
          <Caption className="font-manrope-extrabold text-[11px] tracking-[1px] uppercase text-gold">
            {actionLabel}
          </Caption>
          <IconChevron size={13} color={themeColors.gold.DEFAULT} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
      {children ? <View className="mt-3">{children}</View> : null}
    </View>
  )
}

export default function BookingsDelegationScreen() {
  const themeColors = useThemeColors()
  const router = useRouter()
  const {
    delegates,
    managedUsers,
    loading,
    error,
    addManager,
    toggleDelegatePermissions,
    removeDelegate,
    stopManaging,
    formatPermissionsLabel,
  } = useLinkedProfiles()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [relationLabel, setRelationLabel] = useState('')
  const [canModify, setCanModify] = useState(true)
  const [savingAdd, setSavingAdd] = useState(false)
  const [dialog, setDialog] = useState<{
    title: string; message?: string; confirmLabel?: string
    cancelLabel?: string; destructive?: boolean; onConfirm: () => void
  } | null>(null)
  const closeDialog = () => setDialog(null)

  const hasDelegates = delegates.length > 0
  const hasManagedUsers = managedUsers.length > 0

  const submitDisabled = useMemo(() => phone.trim().length === 0 || savingAdd, [phone, savingAdd])

  const handleAddManager = async () => {
    if (!phone.trim()) {
      setDialog({ title: 'Teléfono requerido', message: 'Introduce el teléfono de la persona que ya está registrada.', onConfirm: closeDialog })
      return
    }

    setSavingAdd(true)
    try {
      await addManager({ phone, relationLabel, canModify })
      setPhone('')
      setRelationLabel('')
      setCanModify(true)
      setIsAddOpen(false)
      setDialog({ title: 'Listo', message: 'La persona ya puede gestionar tus citas según el permiso otorgado.', onConfirm: closeDialog })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'No se pudo añadir la persona'
      setDialog({ title: 'Error', message, onConfirm: closeDialog })
    } finally {
      setSavingAdd(false)
    }
  }

  const handleEditPermissions = async (linkedProfileId: string) => {
    const target = delegates.find((item) => item.link.id === linkedProfileId)
    if (!target) return
    // TODO: reemplazar por un ActionSheet o selector personalizado (requiere >2 opciones)
    await toggleDelegatePermissions(target)
  }

  const handleRemoveDelegate = (linkedProfileId: string) => {
    setDialog({
      title: 'Eliminar permiso',
      message: 'Esta persona dejará de gestionar tus citas.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        closeDialog()
        try {
          await removeDelegate(linkedProfileId)
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'No se pudo eliminar el permiso'
          setDialog({ title: 'Error', message, onConfirm: closeDialog })
        }
      },
    })
  }

  const handleStopManaging = (linkedProfileId: string) => {
    setDialog({
      title: 'Dejar de gestionar',
      message: 'Dejarás de gestionar las citas de esta persona.',
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        closeDialog()
        try {
          await stopManaging(linkedProfileId)
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'No se pudo dejar de gestionar'
          setDialog({ title: 'Error', message, onConfirm: closeDialog })
        }
      },
    })
  }

  if (loading && !hasDelegates && !hasManagedUsers) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
        <BrandHeader />
        <LoadingSpinner className="flex-1 items-center justify-center" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <BrandHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {error ? <ErrorMessage message={error} className="mx-6 mt-4" /> : null}

        <View className="px-6 py-8 bg-surface dark:bg-surface-dark">
          <H2 className="font-manrope-bold text-[30px] leading-[36px] text-foreground dark:text-foreground-dark">Citas por terceros</H2>
        </View>

        <View className="pt-8">
          <SectionTitle>Quién puede gestionar mis citas</SectionTitle>

          {delegates.map((delegate) => (
            <PersonCard
              key={delegate.link.id}
              name={fullName(delegate.user.first_name, delegate.user.last_name)}
              relation={delegate.permissions.relationLabel}
              permissionLabel={formatPermissionsLabel(delegate.permissions)}
              dateLabel={formatDateLabel(delegate.link.created_at)}
              primaryLabel="Editar"
              primaryColorClassName="text-gold"
              onPrimaryPress={() => handleEditPermissions(delegate.link.id)}
              secondaryLabel="Eliminar"
              secondaryColorClassName="text-red-600"
              onSecondaryPress={() => handleRemoveDelegate(delegate.link.id)}
            />
          ))}

          <View className="bg-surface dark:bg-surface-dark">
            {!hasDelegates ? (
              <View className="px-6 py-5">
                <Body className="font-manrope text-[15px] text-foreground-muted dark:text-foreground-muted-dark">
                  Nadie está gestionando tus citas todavía.
                </Body>
              </View>
            ) : null}

            <AddPersonTrigger onPress={() => setIsAddOpen((prev) => !prev)} />
            <View className="h-px bg-border dark:bg-border-dark" />
          </View>

          {isAddOpen ? (
            <View className="px-6 pt-5 pb-4 gap-4 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark">
              <Input
                label="Teléfono"
                placeholder="Ej: +34600111222"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Input
                label="Relación (opcional)"
                placeholder="Ej: Hija, pareja, madre"
                value={relationLabel}
                onChangeText={setRelationLabel}
              />

              <View className="flex-row items-center justify-between border border-border dark:border-border-dark rounded-[14px] px-4 py-4">
                <Body className="font-manrope-medium text-[15px] text-foreground dark:text-foreground-dark">
                  Permitir modificar citas
                </Body>
                <Switch
                  value={canModify}
                  onValueChange={setCanModify}
                  trackColor={{ false: themeColors.premium.divider.switch, true: themeColors.gold.light }}
                  thumbColor={canModify ? themeColors.gold.DEFAULT : themeColors.premium.white}
                  ios_backgroundColor={themeColors.premium.divider.switch}
                />
              </View>

              <Button onPress={handleAddManager} loading={savingAdd} disabled={submitDisabled} size="xs">
                Guardar permiso
              </Button>

              <View className="rounded-[18px] bg-surface-overlay dark:bg-surface-overlay-dark px-5 py-5 flex-row items-center gap-3">
                <View className="w-5 h-5 rounded-full bg-gold items-center justify-center">
                  <Text className="text-[11px] font-bold text-premium-white">i</Text>
                </View>
                <Body className="flex-1 font-manrope text-[13px] leading-6 text-foreground-muted dark:text-foreground-muted-dark">
                  Solo podrás otorgar permisos a usuarios ya registrados en Maneva, buscándolos por su teléfono.
                </Body>
              </View>
            </View>
          ) : null}
        </View>

        <View className="h-4 bg-surface dark:bg-surface-dark-pale" />

        <View className="pt-8 pb-6">
          <SectionTitle>A quién gestiono yo las citas</SectionTitle>

          {managedUsers.map((managed) => (
            <PersonCard
              key={managed.link.id}
              name={fullName(managed.user.first_name, managed.user.last_name)}
              permissionLabel={formatPermissionsLabel(managed.permissions)}
              dateLabel={formatDateLabel(managed.link.created_at)}
              primaryLabel="Gestionar citas"
              primaryColorClassName="text-gold"
              onPrimaryPress={() => router.push('/(tabs)/bookings')}
              secondaryLabel="Dejar de gestionar"
              secondaryColorClassName="text-red-600"
              onSecondaryPress={() => handleStopManaging(managed.link.id)}
            />
          ))}

          {!hasManagedUsers ? (
            <View className="px-6 py-5 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
              <Body className="font-manrope text-[15px] text-foreground-muted dark:text-foreground-muted-dark">
                Aún no gestionas las citas de otros usuarios.
              </Body>
            </View>
          ) : null}

          {/* TODO: enlazar a contenido de ayuda real cuando esté disponible */}
          <InfoCard title="Cómo añadir administradores" actionLabel="Ver más" onPress={() => {}} />

          <View className="mx-6 mt-4 rounded-[18px] bg-surface-overlay dark:bg-surface-overlay-dark px-5 py-5 flex-row items-center gap-3">
            <View className="w-5 h-5 rounded-full bg-gold items-center justify-center">
              <Text className="text-[11px] font-bold text-premium-white">!</Text>
            </View>
            <Body className="flex-1 font-manrope text-[13px] leading-6 text-foreground-muted dark:text-foreground-muted-dark">
              Las personas con permiso podrán gestionar tus citas según el acceso otorgado. Puedes revocarlo en cualquier momento.
            </Body>
          </View>
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
