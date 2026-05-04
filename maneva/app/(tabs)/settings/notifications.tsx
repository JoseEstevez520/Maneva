import React, { useMemo, useState } from 'react'
import { ScrollView, Switch, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Body, Caption, H2 } from '@/components/ui/Typography'
import { IconChevron } from '@/components/ui/icons'
import { BrandHeader } from '@/components/ui/BrandHeader'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useNotificationSettings, type OffersScope } from '@/hooks/useNotificationSettings'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { SelectSheet, type SelectOption } from '@/components/ui/SelectSheet'

const OFFERS_OPTIONS: SelectOption<OffersScope>[] = [
  { value: 'all', label: 'Todas', description: 'Recibir ofertas de calquera perruquería' },
  { value: 'favorites', label: 'Só favoritas', description: 'Só de perruquerías que gardaches' },
  { value: 'none', label: 'Ningunha', description: 'Non recibir notificacións de ofertas' },
]

export default function NotificationsScreen() {
  const themeColors = useThemeColors()
  const {
    offersScope,
    homeServiceEnabled,
    error,
    saveOffersScope,
    saveHomeServiceEnabled,
  } = useNotificationSettings()

  const [offersSelectorVisible, setOffersSelectorVisible] = useState(false)

  const offersLabel = useMemo(() => {
    if (offersScope === 'all') return 'Todas'
    if (offersScope === 'none') return 'Ningunha'
    return 'Só de perruquerías favoritas'
  }, [offersScope])

  const handleSelectOffersScope = async (scope: OffersScope) => {
    setOffersSelectorVisible(false)
    await saveOffersScope(scope)
  }

  const handleHomeServiceToggle = (nextValue: boolean) => {
    void saveHomeServiceEnabled(nextValue)
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <BrandHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
        <View className="px-6 py-8">
          <H2 className="font-manrope-bold text-[30px] leading-[36px] text-foreground dark:text-foreground-dark">Notificacións</H2>
        </View>

        {error ? <ErrorMessage message={error} className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 p-3" /> : null}

        <Caption className="px-6 pb-3 font-manrope-extrabold text-[11px] tracking-[3.2px] uppercase text-foreground-subtle dark:text-foreground-subtle-dark">
          Ofertas
        </Caption>

        <TouchableOpacity onPress={() => setOffersSelectorVisible(true)} activeOpacity={0.8} className="px-6 py-5 bg-surface dark:bg-surface-dark border-y border-border dark:border-border-dark">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Body className="font-manrope-medium text-[17px] text-foreground dark:text-foreground-dark">Notificacións de ofertas</Body>
              <Body className="mt-1 text-[14px] text-foreground-muted dark:text-foreground-muted-dark">{offersLabel}</Body>
            </View>
            <IconChevron size={20} color={themeColors.premium.gray.iconMuted} strokeWidth={2.2} />
          </View>
        </TouchableOpacity>

        <Caption className="px-6 pt-10 pb-3 font-manrope-extrabold text-[11px] tracking-[3.2px] uppercase text-foreground-subtle dark:text-foreground-subtle-dark">
          A domicilio
        </Caption>

        <View className="px-6 py-5 bg-surface dark:bg-surface-dark border-y border-border dark:border-border-dark">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Body className="font-manrope-medium text-[17px] text-foreground dark:text-foreground-dark">A domicilio</Body>
              <Body className="mt-1 leading-7 text-[14px] text-foreground-muted dark:text-foreground-muted-dark">
                Recibir notificacións cando un perruqueiro faga cortes a domicilio na miña zona
              </Body>
            </View>
            <Switch
              value={homeServiceEnabled}
              onValueChange={handleHomeServiceToggle}
              trackColor={{ false: themeColors.premium.divider.switch, true: themeColors.gold.light }}
              thumbColor={homeServiceEnabled ? themeColors.gold.DEFAULT : themeColors.premium.white}
              ios_backgroundColor={themeColors.premium.divider.switch}
            />
          </View>
        </View>
      </ScrollView>

      <SelectSheet
        visible={offersSelectorVisible}
        title="Notificacións de ofertas"
        options={OFFERS_OPTIONS}
        selectedValue={offersScope}
        onSelect={handleSelectOffersScope}
        onCancel={() => setOffersSelectorVisible(false)}
      />
    </SafeAreaView>
  )
}
