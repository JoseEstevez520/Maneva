import { View, ActivityIndicator } from 'react-native'
import { Colors } from '@/constants/theme'

interface LoadingSpinnerProps {
  className?: string
  color?: string
  size?: 'small' | 'large'
}

export function LoadingSpinner({ className = 'py-6 items-center flex-1 justify-center', color = Colors.gold.DEFAULT, size = 'large' }: LoadingSpinnerProps) {
  return (
    <View className={className}>
      <ActivityIndicator size={size} color={color} />
    </View>
  )
}
