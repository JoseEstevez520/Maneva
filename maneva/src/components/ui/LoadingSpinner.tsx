import { View, ActivityIndicator } from 'react-native'

// El dorado es invariante en ambos temas — se usa directamente como default
const GOLD = '#D4AF37'

interface LoadingSpinnerProps {
  className?: string
  color?: string
  size?: 'small' | 'large'
}

export function LoadingSpinner({ className = 'py-6 items-center flex-1 justify-center', color = GOLD, size = 'large' }: LoadingSpinnerProps) {
  return (
    <View className={className}>
      <ActivityIndicator size={size} color={color} />
    </View>
  )
}
