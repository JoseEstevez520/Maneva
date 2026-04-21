import React from 'react'
import { ScrollView, View, RefreshControl } from 'react-native'
import { SafeAreaView, Edge } from 'react-native-safe-area-context'
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
  /**
   * Bordes donde aplicar el safe area inset.
   * Por defecto solo ['top'] porque las pantallas dentro del tab navigator
   * ya reciben el inset inferior desde la propia tab bar. Pasar
   * ['top', 'bottom'] en pantallas fuera de tabs que lo necesiten.
   */
  edges?: Edge[]
}

export function ScreenLayout({
  children,
  scrollable = true,
  className = '',
  refreshControl,
  header,
  headerTitle,
  edges = ['top'],
}: ScreenLayoutProps) {
  const renderHeader = () => {
    if (!header) return null
    if (header === 'brand') return <AppHeader variant="brand" />
    return <AppHeader variant="page" title={headerTitle ?? ''} />
  }

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft" edges={edges}>
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
        // Sin padding propio: cuando scrollable=false el contenido gestiona
        // su propio layout y padding (p.ej. la HomeScreen con secciones px-5).
        <View className={`flex-1 ${className}`}>
          {children}
        </View>
      )}
    </SafeAreaView>
  )
}

