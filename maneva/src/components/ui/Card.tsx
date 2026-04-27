import { TouchableOpacity, View, ViewProps } from 'react-native'

type CardProps = {
  onPress?: () => void
  className?: string
  variant?: 'dark' | 'light'
  children: React.ReactNode
} & Omit<ViewProps, 'className'>

/**
 * Diseño Maneva Premium:
 * dark:  bg-premium-black — invariante, ya es oscura en ambos temas
 * light: bg-surface — blanco en light, #1A1A1A en dark
 */
export function Card({ onPress, className = '', variant = 'dark', children }: CardProps) {
  const isDark = variant === 'dark'
  const bg = isDark
    ? 'bg-premium-black shadow-2xl'
    : 'bg-surface dark:bg-surface-dark shadow-premium border border-border dark:border-border-dark'

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
