import { Stack } from 'expo-router';
import { couleurs } from '@/ui';

export default function ActiviteLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Loguer une séance' }} />
      <Stack.Screen name="historique" options={{ title: 'Mon historique' }} />
      <Stack.Screen name="[id]" options={{ title: 'Séance' }} />
    </Stack>
  );
}
