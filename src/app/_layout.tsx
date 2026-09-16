import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FournisseurSession, useSession } from '@/lib/session';
import { FournisseurInscription, useInscription } from '@/lib/onboarding';
import { Chargement, couleurs } from '@/ui';

/** Écrans accessibles avant la connexion (début du parcours RUNGEN inclus). */
const AVANT_CONNEXION = ['code', 'naissance', 'info-donnees', 'connexion'];

function Aiguillage() {
  const { chargement, session, profil } = useSession();
  const { parcours } = useInscription();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (chargement) return;

    // `useSegments` est typé comme un tuple de routes : on ne lit que les deux premiers niveaux.
    const [groupe, etape] = segments as string[];

    if (!session) {
      const autorise = groupe === 'bienvenue' || (groupe === 'onboarding' && AVANT_CONNEXION.includes(etape));
      if (!autorise) router.replace('/bienvenue');
      return;
    }

    if (!profil) {
      // Connecté sans profil : on reprend le parcours là où il en est.
      if (groupe !== 'onboarding') {
        router.replace(parcours === 'rungen' ? '/onboarding/pseudo' : '/onboarding/naissance');
      }
      return;
    }

    // Profil créé : seul l'écran des sports favoris reste dans l'inscription.
    if (groupe === 'bienvenue' || (groupe === 'onboarding' && etape !== 'sports')) {
      router.replace('/(app)');
    }
  }, [chargement, session, profil, parcours, segments, router]);

  if (chargement) return <Chargement texte="Ouverture de RUNGEN…" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: couleurs.fond },
        headerTintColor: couleurs.texte,
        headerTitleStyle: { color: couleurs.texte },
        contentStyle: { backgroundColor: couleurs.fond },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="bienvenue" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RacineLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <FournisseurSession>
        <FournisseurInscription>
          <Aiguillage />
        </FournisseurInscription>
      </FournisseurSession>
    </SafeAreaProvider>
  );
}
