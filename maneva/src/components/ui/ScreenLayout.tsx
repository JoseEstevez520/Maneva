import React from 'react'
import { ScrollView, View, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader } from './AppHeader'

type ScreenLayoutProps = {
  children: React.ReactNode
  scrollable?: boolean
  className?: string
  /** Pasar un <RefreshControl> para habilitar pull-to-refresh sin anidar ScrollViews */
  refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>>
  /** Cabecera superior uniforme */
  header?: 'brand' | 'page'
  /** Título de la sección — obligatorio cuando header="page" */
  headerTitle?: string
}

export function ScreenLayout({
  children,
  scrollable = true,
  className = '',
  refreshControl,
  header,
  headerTitle,
}: ScreenLayoutProps) {
  const renderHeader = () => {
    if (!header) return null
    if (header === 'brand') return <AppHeader variant="brand" />
    return <AppHeader variant="page" title={headerTitle ?? ''} />
  }

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft">
      {renderHeader()}
      {scrollable ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={`px-4 py-4 pb-20 ${className}`}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
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

