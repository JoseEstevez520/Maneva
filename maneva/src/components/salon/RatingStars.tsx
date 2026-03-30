import React from 'react'
import { View } from 'react-native'
import { IconStar } from '@/components/ui/icons'

type RatingStarsProps = {
  rating: number
  size?: number
  className?: string
}

export function RatingStars({ rating, size = 16, className = '' }: RatingStarsProps) {
  // Simple 5-star renderer based on integer rating
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  return (
    <View className={`flex-row items-center ${className}`}>
      {[...Array(fullStars)].map((_, i) => (
        <IconStar key={`full-${i}`} size={size} color="#D4AF37" fill="#D4AF37" />
      ))}
      {hasHalf && (
        <View style={{ width: size, height: size, overflow: 'hidden' }}>
          <IconStar size={size} color="#D4AF37" fill="#D4AF37" style={{ position: 'absolute', left: 0 }} />
          <View style={{ position: 'absolute', left: size / 2, width: size / 2, height: size, backgroundColor: 'white' }} />
        </View>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <IconStar key={`empty-${i}`} size={size} color="#E5E5E5" />
      ))}
    </View>
  )
}
