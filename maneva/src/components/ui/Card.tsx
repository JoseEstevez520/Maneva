import { TouchableOpacity, View, ViewProps } from 'react-native'

type CardProps = {
  onPress?: () => void
  className?: string
  variant?: 'dark' | 'light'
  children: React.ReactNode
} & Omit<ViewProps, 'className'>

/**
 * Diseño Maneva Premium (Stitch):
 * dark: bg-premium-black text-premium-white rounded-3xl p-8 shadow-2xl
 * light: bg-premium-white border border-soft-gray rounded-3xl p-8 shadow-premium
 */
export function Card({ onPress, className = '', variant = 'dark', children }: CardProps) {
  const isDark = variant === 'dark'
  const bg = isDark ? 'bg-premium-black shadow-2xl' : 'bg-premium-white shadow-premium border border-soft-gray'
  const textContext = isDark ? 'text-premium-white' : 'text-premium-black'
  
  const base = `${bg} rounded-[24px] p-8 ${className}`

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} className={`${base} active:scale-95 transition-transform`}>
        {children}
      </TouchableOpacity>
    )
  }

  return (
    <View className={base}>
      {children}
    </View>
  )
}
