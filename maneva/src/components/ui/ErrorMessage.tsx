import { View } from 'react-native'
import { H1, Body } from '@/components/ui/Typography'

interface ErrorMessageProps {
  message?: string
  className?: string
}

export function ErrorMessage({ message = 'Ha ocurrido un error inesperado.', className = 'flex-1 items-center justify-center gap-3 p-6 bg-premium-white' }: ErrorMessageProps) {
  return (
    <View className={className}>
      <H1 className="text-4xl">⚠️</H1>
      <Body className="text-premium-gray text-center">{message}</Body>
    </View>
  )
}
