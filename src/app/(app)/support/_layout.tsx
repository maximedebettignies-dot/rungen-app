import { Stack } from 'expo-router';
import { couleurs } from '@/ui';

export default function SupportLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: couleurs.fond },
        headerTintColor: couleurs.texte,
        contentStyle: { backgroundColor: couleurs.fond },
        headerShadowVisible: false,
        headerBackTitle: 'Retour',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Support' }} />
      <Stack.Screen name="nouvelle" options={{ title: 'Nouvelle conversation' }} />
      <Stack.Screen name="[id]" options={{ title: 'Conversation' }} />
    </Stack>
  );
}
