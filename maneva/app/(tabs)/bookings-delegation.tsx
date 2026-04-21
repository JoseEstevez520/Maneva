import React, { useMemo, useState } from 'react'
import { Alert, ScrollView, Switch, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { format, parseISO } from 'date-fns'

import { Body, Caption, H1, H2 } from '@/components/ui/Typography'
import { IconAdd, IconBack } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useLinkedProfiles } from '@/hooks/useLinkedProfiles'

function BrandHeader() {
  const router = useRouter()

  return (
    <View className="bg-premium-white border-b border-[#ECECEC] px-5 py-5 flex-row items-center justify-center">
      <TouchableOpacity onPress={() => router.replace('./settings')} className="absolute left-5">
        <IconBack size={28} color={Colors.premium.black} strokeWidth={2.2} />
      </TouchableOpacity>
      <H1 className="font-manrope-extrabold text-[18px] tracking-[6px] text-premium-black">MANEVA</H1>
    </View>
  )
}

function fullName(firstName: string | null, lastName: string | null): string {
  const value = [firstName ?? '', lastName ?? ''].map((item) => item.trim()).filter(Boolean).join(' ')
  return value || 'Usuario'
}

function formatDateLabel(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy')
}

export default function BookingsDelegationScreen() {
  const router = useRouter()
  const {
    delegates,
    managedUsers,
    loading,
    error,
    refresh,
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

  const hasDelegates = delegates.length > 0
  const hasManagedUsers = managedUsers.length > 0

  const submitDisabled = useMemo(() => phone.trim().length === 0 || savingAdd, [phone, savingAdd])

  const handleAddManager = async () => {
    if (!phone.trim()) {
      Alert.alert('Teléfono requerido', 'Introduce el teléfono de la persona que ya está registrada.')
      return
    }

    setSavingAdd(true)
    try {
      await addManager({
        phone,
        relationLabel,
        canModify,
      })

      setPhone('')
      setRelationLabel('')
      setCanModify(true)
      setIsAddOpen(false)
      Alert.alert('Listo', 'La persona ya puede gestionar tus citas según el permiso otorgado.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'No se pudo añadir la persona'
      Alert.alert('Error', message)
    } finally {
      setSavingAdd(false)
    }
  }

  const handleEditPermissions = async (linkedProfileId: string) => {
    const target = delegates.find((item) => item.link.id === linkedProfileId)
    if (!target) return

    const currentLabel = target.permissions.canModify ? 'Crear y modificar' : 'Solo crear'

    Alert.alert(
      'Editar permiso',
      `Permiso actual: ${currentLabel}`,
      [
        {
          text: 'Solo crear',
          onPress: async () => {
            if (!target.permissions.canModify) return
            await toggleDelegatePermissions(target)
          },
        },
        {
          text: 'Crear y modificar',
          onPress: async () => {
            if (target.permissions.canModify) return
            await toggleDelegatePermissions(target)
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
    )
  }

  const handleRemoveDelegate = (linkedProfileId: string) => {
    Alert.alert('Eliminar permiso', 'Esta persona dejará de gestionar tus citas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeDelegate(linkedProfileId)
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'No se pudo eliminar el permiso'
            Alert.alert('Error', message)
          }
        },
      },
    ])
  }

  const handleStopManaging = (linkedProfileId: string) => {
    Alert.alert('Dejar de gestionar', 'Dejarás de gestionar las citas de esta persona.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: async () => {
          try {
            await stopManaging(linkedProfileId)
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'No se pudo dejar de gestionar'
            Alert.alert('Error', message)
          }
        },
      },
    ])
  }

  if (loading && !hasDelegates && !hasManagedUsers) {
    return (
      <SafeAreaView className="flex-1 bg-premium-white-soft" edges={['top']}>
        <BrandHeader />
        <LoadingSpinner className="flex-1 items-center justify-center" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft" edges={['top']}>
      <BrandHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {error ? <ErrorMessage message={error} className="mx-6 mt-4" /> : null}

        <View className="pt-8">
          <Caption className="px-6 mb-4 font-manrope-extrabold text-[11px] tracking-[3.2px] uppercase text-[#9CA3AF]">
            Quién Puede Gestionar Mis Citas
          </Caption>

          {delegates.map((delegate) => (
            <View key={delegate.link.id} className="px-6 py-6 border-b border-[#ECECEC] bg-premium-white">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <H2 className="font-manrope-bold text-[28px] leading-[34px] text-premium-black">
                    {fullName(delegate.user.first_name, delegate.user.last_name)}
                  </H2>
                  {delegate.permissions.relationLabel ? (
                    <Body className="font-manrope text-[16px] text-premium-gray mt-1">
                      {delegate.permissions.relationLabel}
                    </Body>
                  ) : null}
                  <Body className="font-manrope-medium text-[16px] text-premium-black mt-2">
                    Permiso: {formatPermissionsLabel(delegate.permissions)}
                  </Body>
                  <Body className="font-manrope text-[16px] text-[#94A3B8] mt-1">Desde: {formatDateLabel(delegate.link.created_at)}</Body>
                </View>
                <View className="items-end gap-4 pt-1">
                  <TouchableOpacity onPress={() => handleEditPermissions(delegate.link.id)}>
                    <Caption className="font-manrope-extrabold text-[14px] tracking-[1.5px] uppercase text-gold">Editar</Caption>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemoveDelegate(delegate.link.id)}>
                    <Caption className="font-manrope-extrabold text-[14px] tracking-[1.5px] uppercase text-red-600">Eliminar</Caption>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {!hasDelegates ? (
            <View className="px-6 py-6 border-b border-[#ECECEC] bg-premium-white">
              <Body className="font-manrope text-[16px] text-premium-gray">Nadie está gestionando tus citas todavía.</Body>
            </View>
          ) : null}

          <View className="bg-premium-white border-b border-[#ECECEC]">
            <TouchableOpacity onPress={() => setIsAddOpen((prev) => !prev)} activeOpacity={0.8} className="px-6 py-6 flex-row items-center gap-3">
              <IconAdd size={18} color={Colors.gold.DEFAULT} strokeWidth={2.8} />
              <Caption className="font-manrope-extrabold text-[18px] text-gold">Añadir persona</Caption>
            </TouchableOpacity>

            {isAddOpen ? (
              <View className="px-6 pb-6 gap-4">
                <Input
                  label="Teléfono"
                  placeholder="Ej: +34600111222"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <Input
                  label="Relación (opcional)"
                  placeholder="Ej: Hermana, pareja, madre"
                  value={relationLabel}
                  onChangeText={setRelationLabel}
                />

                <View className="flex-row items-center justify-between border border-[#ECECEC] rounded-xl px-4 py-3">
                  <Body className="font-manrope-medium text-[15px] text-premium-black">Permitir modificar citas</Body>
                  <Switch
                    value={canModify}
                    onValueChange={setCanModify}
                    trackColor={{ false: '#D9DDE2', true: Colors.gold.light }}
                    thumbColor={canModify ? Colors.gold.DEFAULT : '#FFFFFF'}
                    ios_backgroundColor="#D9DDE2"
                  />
                </View>

                <Button onPress={handleAddManager} loading={savingAdd} disabled={submitDisabled} size="sm">
                  Guardar permiso
                </Button>
              </View>
            ) : null}
          </View>
        </View>

        <View className="h-5 bg-[#F1F1F1] mt-2" />

        <View className="pt-8 pb-6">
          <Caption className="px-6 mb-4 font-manrope-extrabold text-[11px] tracking-[3.2px] uppercase text-[#9CA3AF]">
            A Quién Gestiono Yo Las Citas
          </Caption>

          {managedUsers.map((managed) => (
            <View key={managed.link.id} className="px-6 py-6 border-b border-[#ECECEC] bg-premium-white">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <H2 className="font-manrope-bold text-[28px] leading-[34px] text-premium-black">
                    {fullName(managed.user.first_name, managed.user.last_name)}
                  </H2>
                  <Body className="font-manrope-medium text-[16px] text-premium-black mt-2">
                    Permiso: {formatPermissionsLabel(managed.permissions)}
                  </Body>
                  <Body className="font-manrope text-[16px] text-[#94A3B8] mt-1">Desde: {formatDateLabel(managed.link.created_at)}</Body>
                </View>
                <View className="items-end gap-4 pt-1">
                  <TouchableOpacity onPress={() => router.push('./index')}>
                    <Caption className="font-manrope-extrabold text-[14px] tracking-[1.5px] uppercase text-gold">Gestionar citas</Caption>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleStopManaging(managed.link.id)}>
                    <Caption className="font-manrope-extrabold text-[14px] tracking-[1.5px] uppercase text-red-600">Dejar de gestionar</Caption>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {!hasManagedUsers ? (
            <View className="px-6 py-6 border-b border-[#ECECEC] bg-premium-white">
              <Body className="font-manrope text-[16px] text-premium-gray">Aún no gestionas las citas de otros usuarios.</Body>
            </View>
          ) : null}

          <View className="mx-6 mt-6 bg-[#F3F3F3] rounded-[28px] px-6 py-6">
            <Body className="font-manrope text-[16px] leading-7 text-[#6B7280]">
              Solo podrás otorgar permisos a usuarios ya registrados en Maneva, buscándolos por su teléfono.
            </Body>
          </View>

          <TouchableOpacity onPress={refresh} activeOpacity={0.8} className="mx-6 mt-4 items-center py-3 border border-[#ECECEC] rounded-xl bg-premium-white">
            <Caption className="font-manrope-extrabold uppercase tracking-[1.8px] text-[12px] text-premium-black">Actualizar lista</Caption>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
