import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  FlatList,
} from 'react-native'
import { Body, Caption, H2 } from '@/components/ui/Typography'
import { IconBack, IconClose, IconSearch, IconStar } from '@/components/ui/icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { getSalonsWithRating, getEmployeesByLocation, getFavoriteSalonIds, type UnifiedSalon, type EmployeeWithUser } from '@/services/salons.service'
import { useAuthStore } from '@/store/authStore'

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=200&h=200&fit=crop&q=80'

type Props = {
  visible: boolean
  favoriteEmployeeIds: string[]
  onToggle: (employeeId: string) => void
  onClose: () => void
}

type SalonWithRating = UnifiedSalon & { avgRating: number | null; avgPrice: number | null }

export function StylistPickerSheet({ visible, favoriteEmployeeIds, onToggle, onClose }: Props) {
  const { user } = useAuthStore()
  const themeColors = useThemeColors()

  const [step, setStep] = useState<'salons' | 'employees'>('salons')
  const [salons, setSalons] = useState<SalonWithRating[]>([])
  const [favSalonIds, setFavSalonIds] = useState<string[]>([])
  const [selectedSalon, setSelectedSalon] = useState<SalonWithRating | null>(null)
  const [employees, setEmployees] = useState<EmployeeWithUser[]>([])
  const [loadingSalons, setLoadingSalons] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!visible || !user) return
    setStep('salons')
    setSearch('')
    setSelectedSalon(null)
    setLoadingSalons(true)

    Promise.all([getSalonsWithRating(), getFavoriteSalonIds(user.id)])
      .then(([all, favIds]) => {
        setSalons(all)
        setFavSalonIds(favIds)
      })
      .catch(() => {})
      .finally(() => setLoadingSalons(false))
  }, [visible, user])

  const handleSelectSalon = async (salon: SalonWithRating) => {
    setSelectedSalon(salon)
    setStep('employees')
    setLoadingEmployees(true)
    try {
      const list = await getEmployeesByLocation(salon.id)
      setEmployees(list)
    } catch {
      setEmployees([])
    } finally {
      setLoadingEmployees(false)
    }
  }

  const filteredSalons = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? salons.filter((s) => (s.salons?.name ?? s.name ?? '').toLowerCase().includes(q))
      : salons
    return [...list].sort((a, b) => {
      const aFav = favSalonIds.includes(a.id) ? 0 : 1
      const bFav = favSalonIds.includes(b.id) ? 0 : 1
      return aFav - bFav
    })
  }, [salons, favSalonIds, search])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableWithoutFeedback>
            <View className="bg-surface dark:bg-surface-dark rounded-t-[28px]" style={{ maxHeight: '80%' }}>
              {/* Handle */}
              <View className="w-10 h-1 rounded-full bg-border-strong dark:bg-border-strong-dark self-center mt-4" />

              {/* Header */}
              <View className="flex-row items-center px-5 pt-4 pb-3 gap-3">
                {step === 'employees' ? (
                  <TouchableOpacity
                    onPress={() => setStep('salons')}
                    activeOpacity={0.7}
                    className="w-9 h-9 rounded-full bg-surface-raised dark:bg-surface-raised-dark items-center justify-center"
                  >
                    <IconBack size={18} color={themeColors.premium.black} strokeWidth={2} />
                  </TouchableOpacity>
                ) : null}
                <H2 className="flex-1 font-manrope-bold text-[17px]">
                  {step === 'salons'
                    ? 'Escolle unha perruquería'
                    : selectedSalon?.salons?.name ?? selectedSalon?.name ?? 'Estilistas'}
                </H2>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  className="w-9 h-9 rounded-full bg-surface-raised dark:bg-surface-raised-dark items-center justify-center"
                >
                  <IconClose size={16} color={themeColors.premium.black} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Buscador */}
              {step === 'salons' ? (
                <View className="mx-5 mb-3 flex-row items-center gap-2 bg-surface-raised dark:bg-surface-raised-dark rounded-[14px] px-4 py-3">
                  <IconSearch size={16} color={themeColors.premium.gray.secondary} strokeWidth={2} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar perruquería..."
                    placeholderTextColor={themeColors.premium.gray.secondary}
                    className="flex-1 font-manrope text-[15px] text-foreground dark:text-foreground-dark"
                    style={{ fontFamily: 'Manrope_500Medium' }}
                    autoCorrect={false}
                  />
                </View>
              ) : null}

              {/* Contenido */}
              {step === 'salons' ? (
                loadingSalons ? (
                  <View className="items-center py-10">
                    <ActivityIndicator color={themeColors.gold.DEFAULT} />
                  </View>
                ) : (
                  <FlatList
                    data={filteredSalons}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    ListEmptyComponent={
                      <View className="px-6 py-8 items-center">
                        <Body className="text-[15px] text-center">Non se atoparon perruquerías.</Body>
                      </View>
                    }
                    renderItem={({ item }) => {
                      const name = item.salons?.name ?? item.name ?? 'Perruquería'
                      const isFav = favSalonIds.includes(item.id)
                      return (
                        <TouchableOpacity
                          onPress={() => { void handleSelectSalon(item) }}
                          activeOpacity={0.75}
                          className="flex-row items-center px-5 py-4 border-b border-border dark:border-border-dark"
                        >
                          <View className="flex-1 pr-3">
                            <Body className="font-manrope-medium text-[16px] text-foreground dark:text-foreground-dark">{name}</Body>
                            {item.city ? (
                              <Caption className="mt-0.5 text-[13px] text-foreground-subtle dark:text-foreground-subtle-dark">{item.city}</Caption>
                            ) : null}
                          </View>
                          {isFav ? (
                            <IconStar size={16} color={themeColors.gold.DEFAULT} fill={themeColors.gold.DEFAULT} strokeWidth={1.5} />
                          ) : null}
                        </TouchableOpacity>
                      )
                    }}
                  />
                )
              ) : (
                loadingEmployees ? (
                  <View className="items-center py-10">
                    <ActivityIndicator color={themeColors.gold.DEFAULT} />
                  </View>
                ) : employees.length === 0 ? (
                  <View className="px-6 py-8 items-center">
                    <Body className="text-[15px] text-center">Non hai estilistas nesta perruquería.</Body>
                  </View>
                ) : (
                  <FlatList
                    data={employees}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    renderItem={({ item }) => {
                      const name = [item.users?.first_name, item.users?.last_name]
                        .filter(Boolean).join(' ') || 'Estilista'
                      const isFav = favoriteEmployeeIds.includes(item.id)
                      return (
                        <TouchableOpacity
                          onPress={() => onToggle(item.id)}
                          activeOpacity={0.75}
                          className="flex-row items-center px-5 py-4 border-b border-border dark:border-border-dark"
                        >
                          <View className="w-10 h-10 rounded-full bg-surface-raised dark:bg-surface-raised-dark overflow-hidden mr-4">
                            <Image
                              source={{ uri: item.photo_url || PLACEHOLDER_AVATAR }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          </View>
                          <View className="flex-1 pr-3">
                            <Body className="font-manrope-medium text-[16px] text-foreground dark:text-foreground-dark">{name}</Body>
                            {item.position ? (
                              <Caption className="mt-0.5 text-[13px] text-foreground-subtle dark:text-foreground-subtle-dark">{item.position}</Caption>
                            ) : null}
                          </View>
                          <IconStar
                            size={22}
                            color={themeColors.gold.DEFAULT}
                            fill={isFav ? themeColors.gold.DEFAULT : 'transparent'}
                            strokeWidth={1.8}
                          />
                        </TouchableOpacity>
                      )
                    }}
                  />
                )
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}
