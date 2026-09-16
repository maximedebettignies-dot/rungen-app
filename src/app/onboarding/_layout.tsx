import { Stack } from 'expo-router';
import { couleurs } from '@/ui';

export default function InscriptionLayout() {
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
      <Stack.Screen name="code" options={{ title: 'Mon code RUNGEN' }} />
      <Stack.Screen name="naissance" options={{ title: 'Ma date de naissance' }} />
      <Stack.Screen name="info-donnees" options={{ title: 'Tes données' }} />
      <Stack.Screen name="connexion" options={{ title: 'Connexion' }} />
      <Stack.Screen name="pseudo" options={{ title: 'Mon pseudo', headerBackVisible: false }} />
      <Stack.Screen name="sports" options={{ title: 'Mes sports', headerBackVisible: false }} />
    </Stack>
  );
}
