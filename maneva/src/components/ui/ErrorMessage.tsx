import { View, Text } from 'react-native'

type ErrorMessageProps = {
  message?: string
}

export function ErrorMessage({ message = 'Ha ocurrido un error inesperado.' }: ErrorMessageProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-6 bg-slate-50">
      <Text className="text-4xl">⚠️</Text>
      <Text className="text-base text-slate-600 text-center">{message}</Text>
    </View>
  )
}
