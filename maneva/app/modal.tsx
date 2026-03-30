import { Link } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { H2, Body } from '@/components/ui/Typography';

export default function ModalScreen() {
  return (
    <View style={styles.container} className="bg-premium-white">
      <H2>Detalles Adicionales</H2>
      <Link href="/" style={styles.link}>
        <Body className="text-gold font-manrope-semibold">Cerrar y volver</Body>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
