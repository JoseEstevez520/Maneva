import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '@/constants/theme'

type AppHeaderProps =
  | { variant: 'brand'; title?: never }
  | { variant: 'page'; title: string }

/**
 * AppHeader — Cabecera uniforme para todas las pantallas de las tabs.
 *
 * variant="brand" → Logo MANEVA centrado con tracking amplio + campana
 * variant="page"  → Título de sección alineado a la izquierda
 */
export function AppHeader({ variant, title }: AppHeaderProps) {
  if (variant === 'brand') {
    return (
      <View style={styles.container}>
        <Text style={styles.brand}>MANEVA</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.premium.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.premium.gray.light,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  brand: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    letterSpacing: 6,
    color: Colors.premium.black,
    textAlign: 'center',
  },
  pageTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    letterSpacing: 0.3,
    color: Colors.premium.black,
  },
})
