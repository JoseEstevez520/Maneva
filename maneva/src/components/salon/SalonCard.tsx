import React from 'react'
import { View, Image, TouchableOpacity } from 'react-native'
import { Body, H3, Caption } from '@/components/ui/Typography'
import { RatingStars } from './RatingStars'
import { UnifiedSalon } from '@/services/salons.service'

export function SalonCard({ salon, onPress }: { salon: UnifiedSalon; onPress?: () => void }) {
  const renderContent = () => (
    <View className="bg-surface dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm shadow-black/10 border border-border dark:border-border-dark mb-4">
      <View className="h-40 bg-surface-raised dark:bg-surface-raised-dark">
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=500&q=80' }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
      <View className="p-4">
        <H3 className="mb-1">{salon.salons?.name || salon.name}</H3>
        <Body className="text-sm mb-2" numberOfLines={1}>{salon.address || 'Ubicación no disponible'}</Body>
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center">
            <RatingStars rating={4.8} />
            <Caption className="ml-1">(24)</Caption>
          </View>
          <Caption className="text-gold font-manrope-semibold">$$$</Caption>
        </View>
      </View>
    </View>
  )

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{renderContent()}</TouchableOpacity>
  }

  return renderContent()
}
