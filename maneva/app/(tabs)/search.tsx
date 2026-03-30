import React, { useState } from 'react'
import { View, ScrollView } from 'react-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { Body } from '@/components/ui/Typography'
import { SalonCard } from '@/components/salon/SalonCard'
import { useSalons } from '@/hooks/useSalons'
import { Input } from '@/components/ui/Input'
import { IconSearch } from '@/components/ui/icons'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

export default function SearchScreen() {
  const { data: salons, loading, error } = useSalons()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSalons = salons.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.salons?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <ScreenLayout header="brand" scrollable={false}>
      <View className="pb-2 pt-2">
        <Input
          placeholder="Ej: Salón Lola, Corte de pelo..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<IconSearch size={20} color="#737373" />}
        />
      </View>

      {loading && salons.length === 0 ? (
        <View className="flex-1 justify-center items-center mt-10">
          <LoadingSpinner />
        </View>
      ) : error && salons.length === 0 ? (
        <View className="mt-10">
          <ErrorMessage message={error} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80, paddingTop: 8 }}
        >
          {filteredSalons.map(salon => (
            <SalonCard
              key={salon.id}
              salon={salon}
              onPress={() => console.log('Ir al salón', salon.id)}
            />
          ))}
          {filteredSalons.length === 0 && !loading && (
            <Body className="text-center mt-10">No se encontraron resultados para &quot;{searchQuery}&quot;.</Body>
          )}
        </ScrollView>
      )}
    </ScreenLayout>
  )
}
