import { Stack } from 'expo-router';
import { DoubleAuth } from '@/ui/double-auth';
import { couleurs } from '@/ui';

export default function AdminLayout() {
  return (
    <DoubleAuth>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: couleurs.fond },
          headerTintColor: couleurs.texte,
          contentStyle: { backgroundColor: couleurs.fond },
          headerShadowVisible: false,
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Encadrement' }} />
        <Stack.Screen name="etablissements" options={{ title: 'Établissements' }} />
        <Stack.Screen name="codes" options={{ title: "Codes d'invitation" }} />
        <Stack.Screen name="profs" options={{ title: "Profs d'EPS" }} />
        <Stack.Screen name="comptes" options={{ title: 'Comptes' }} />
        <Stack.Screen name="support" options={{ title: 'Boîte de réception' }} />
      </Stack>
    </DoubleAuth>
  );
}
