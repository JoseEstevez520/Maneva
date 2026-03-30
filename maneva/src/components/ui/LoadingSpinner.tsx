import { View, ActivityIndicator } from 'react-native'

export function LoadingSpinner() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator size="large" color="#7c3aed" />
    </View>
  )
}
