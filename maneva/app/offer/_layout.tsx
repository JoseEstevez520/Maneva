/**
 * offer/_layout.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Layout para la ruta dinámica de ofertas.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { Stack } from 'expo-router'

export default function OfferLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  )
}