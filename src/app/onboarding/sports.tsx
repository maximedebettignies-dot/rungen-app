import { useRouter } from 'expo-router';
import { useSession } from '@/lib/session';
import { useInscription } from '@/lib/onboarding';
import { ChoixSports } from '@/ui/choix-sports';
import { Bouton, Chargement, Ecran, SousTitre, Titre } from '@/ui';

export default function EcranSports() {
  const router = useRouter();
  const { session } = useSession();
  const { reinitialiser } = useInscription();

  if (!session) return <Chargement />;

  return (
    <Ecran>
      <Titre>Tes sports</Titre>
      <SousTitre>
        Choisis ceux que tu pratiques. Tu pourras en ajouter ou en retirer quand tu veux.
      </SousTitre>
      <ChoixSports userId={session.user.id} />
      <Bouton
        titre="Terminer"
        onPress={() => {
          reinitialiser();
          router.replace('/(app)');
        }}
      />
    </Ecran>
  );
}
