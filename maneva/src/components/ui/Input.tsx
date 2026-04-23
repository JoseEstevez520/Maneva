import { TextInput, View, Text, TextInputProps } from 'react-native'
import { useState } from 'react'
import { Colors } from '@/constants/theme'

type InputProps = {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  containerClassName?: string
} & TextInputProps

export function Input({ label, error, leftIcon, containerClassName = '', ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false)

  // Error → rojo, focus → dorado (identidad de marca), idle → gris claro
  const borderColor = error
    ? 'border-red-500'
    : isFocused
      ? 'border-gold'
      : 'border-premium-gray-light'

  return (
    <View className={`gap-2 ${containerClassName}`}>
      {label && (
        <Text className="text-premium-black font-extrabold uppercase tracking-wider text-sm ml-1">
          {label}
        </Text>
      )}
      
      <View 
        className={`flex-row items-center bg-white/50 border-2 rounded-2xl px-5 py-2.5 ${borderColor}`}
      >
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        
        <TextInput
          className="flex-1 text-premium-black font-display text-base"
          placeholderTextColor={Colors.premium.gray.secondary} // Tailwind gray-400
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
