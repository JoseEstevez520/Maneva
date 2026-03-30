import React from 'react'
import { Text, TextProps } from 'react-native'

interface TypographyProps extends TextProps {
  className?: string
  children: React.ReactNode
}

export function H1({ className = '', children, ...props }: TypographyProps) {
  return (
    <Text className={`font-manrope-extrabold text-3xl text-premium-black ${className}`} {...props}>
      {children}
    </Text>
  )
}

export function H2({ className = '', children, ...props }: TypographyProps) {
  return (
    <Text className={`font-manrope-semibold text-2xl text-premium-black ${className}`} {...props}>
      {children}
    </Text>
  )
}

export function H3({ className = '', children, ...props }: TypographyProps) {
  return (
    <Text className={`font-manrope-semibold text-xl text-premium-black ${className}`} {...props}>
      {children}
    </Text>
  )
}

export function Body({ className = '', children, ...props }: TypographyProps) {
  return (
    <Text className={`font-manrope text-base text-premium-gray ${className}`} {...props}>
      {children}
    </Text>
  )
}

export function Caption({ className = '', children, ...props }: TypographyProps) {
  return (
    <Text className={`font-manrope text-sm text-premium-gray ${className}`} {...props}>
      {children}
    </Text>
  )
}
