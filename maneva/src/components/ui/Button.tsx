import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native'

type Variant = 'primary' | 'secondary'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = {
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  onPress: () => void
  icon?: React.ReactNode
  children: React.ReactNode
}

/**
 * Diseño Maneva Premium (Stitch):
 * primary: Fondo dorado, texto negro, sombra dorada, uppercase
 * secondary: Fondo blanco, borde grueso negro, uppercase
 */
const variantStyles: Record<Variant, string> = {
  primary:   'bg-gold shadow-premium-gold border-0',
  secondary: 'bg-premium-white border-4 border-premium-black shadow-xl',
}

const textStyles: Record<Variant, string> = {
  primary:   'text-premium-black',
  secondary: 'text-premium-black',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-6 py-4 rounded-2xl',
  md: 'px-8 py-6 rounded-[24px]', // equivalent to rounded-3xl roughly
  lg: 'px-10 py-8 rounded-[32px]',
}

const textSizeStyles: Record<Size, string> = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  icon,
  children,
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      className={`w-full flex-col items-center justify-center gap-3 active:scale-95 transition-transform ${variantStyles[variant]} ${sizeStyles[size]} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#000000" />
      ) : icon ? (
        <View className="mb-1">{icon}</View>
      ) : null}
      <Text className={`${textStyles[variant]} ${textSizeStyles[size]} font-extrabold uppercase tracking-widest text-center`}>
        {children}
      </Text>
    </TouchableOpacity>
  )
}
