import React from 'react'
import { View } from 'react-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { H2 } from '@/components/ui/Typography'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export default function SettingsScreen() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <ScreenLayout header="brand">
      <View className="flex-1 px-4 mt-8">
        <H2 className="mb-6">
          Ajustes
        </H2>
        
        <View className="mt-auto mb-10">
          <Button variant="danger" onPress={handleLogout}>
            Cerrar sesión
          </Button>
        </View>
      </View>
    </ScreenLayout>
  )
}
