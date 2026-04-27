import { TextInput, View, Text, TextInputProps } from 'react-native'
import { useState } from 'react'
import { useThemeColors } from '@/hooks/useThemeColors'

type InputProps = {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  containerClassName?: string
} & TextInputProps

export function Input({ label, error, leftIcon, containerClassName = '', ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const themeColors = useThemeColors()

  // Error → rojo, focus → dorado (identidad de marca), idle → borde semántico
  const borderColor = error
    ? 'border-red-500'
    : isFocused
      ? 'border-gold'
      : 'border-border dark:border-border-dark'

  return (
    <View className={`gap-2 ${containerClassName}`}>
      {label && (
        <Text className="text-foreground dark:text-foreground-dark font-extrabold uppercase tracking-wider text-sm ml-1">
          {label}
        </Text>
      )}

      <View
        className={`flex-row items-center bg-input-bg dark:bg-input-bg-dark border-2 rounded-2xl px-5 py-2.5 ${borderColor}`}
      >
        {leftIcon && <View className="mr-3">{leftIcon}</View>}

        <TextInput
          className="flex-1 text-foreground dark:text-foreground-dark font-display text-base"
          placeholderTextColor={themeColors.premium.gray.secondary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>

      {error && (
        <Text className="text-red-500 text-sm font-medium ml-1">{error}</Text>
      )}
    </View>
  )
}
