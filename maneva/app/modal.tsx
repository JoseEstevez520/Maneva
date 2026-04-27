import { Link } from 'expo-router';
import { View } from 'react-native';

import { H2, Body } from '@/components/ui/Typography';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center p-5 bg-surface dark:bg-surface-dark">
      <H2>Detalles Adicionales</H2>
      <Link href="/" className="mt-[15px] py-[15px]">
        <Body className="text-gold font-manrope-semibold">Cerrar y volver</Body>
      </Link>
    </View>
  );
}
