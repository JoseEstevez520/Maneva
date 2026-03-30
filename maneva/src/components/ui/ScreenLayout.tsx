import { SafeAreaView, ScrollView, View } from 'react-native'

type ScreenLayoutProps = {
  children: React.ReactNode
  scrollable?: boolean
  className?: string
}

export function ScreenLayout({ children, scrollable = true, className = '' }: ScreenLayoutProps) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {scrollable ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={`px-4 py-4 ${className}`}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 px-4 py-4 ${className}`}>
          {children}
        </View>
      )}
    </SafeAreaView>
  )
}
