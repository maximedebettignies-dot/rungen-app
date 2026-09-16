import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useInscription } from '@/lib/onboarding';
import { useSession } from '@/lib/session';
import { BoutonsConnexion } from '@/ui/connexion';
import { Ecran, SousTitre, Titre } from '@/ui';

export default function EcranConnexion() {
  const router = useRouter();
  const { session } = useSession();
  const { parcours, dateNaissance } = useInscription();

  // Dès que la session existe, on reprend le parcours à l'étape suivante.
  useEffect(() => {
    if (!session) return;
    router.replace(dateNaissance ? '/onboarding/pseudo' : '/onboarding/naissance');
  }, [session, dateNaissance, router]);

  return (
    <Ecran>
      <Titre>Connexion</Titre>
      <SousTitre>
        {parcours === 'rungen'
          ? 'Connecte-toi avec ton compte Google ou Apple. Si ton compte est surveillé par tes parents, ils devront peut-être valider.'
          : 'Connecte-toi avec ton compte Google ou Apple.'}
      </SousTitre>
      <BoutonsConnexion />
    </Ecran>
  );
}
