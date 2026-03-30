import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Pantalla Inicio (Limpia)</Text>
      <Text>El boilerplate base de Maneva está funcionando.</Text>
    </View>
  );
}
