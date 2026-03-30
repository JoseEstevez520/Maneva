import { View, Text } from 'react-native';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

export default function ChatScreen() {
  return (
    <ScreenLayout header="brand" scrollable={false}>
      <View className="flex-1 items-center justify-center">
        <Text className="text-base font-manrope text-premium-gray mt-2">
          Comunícate con tu peluquero
        </Text>
        {/* TODO: Implementar lista de chats */}
      </View>
    </ScreenLayout>
  );
}
