import { useSession } from '@/lib/session';
import { ChoixSports } from '@/ui/choix-sports';
import { Carte, Ecran, Paragraphe, SousTitre, Titre } from '@/ui';

export default function Accueil() {
  const { session, profil } = useSession();

  return (
    <Ecran>
      <Titre>Salut {profil?.pseudo} 👋</Titre>
      <SousTitre>
        {profil?.space === 'rungen'
          ? 'Tu es dans l’espace RUNGEN.'
          : 'Tu es dans l’espace public.'}
      </SousTitre>

      <Carte>
        <Paragraphe>Le log d&apos;activité arrive au bloc 2.</Paragraphe>
        <SousTitre>
          En attendant, ajuste tes sports favoris : ce sont eux qui apparaîtront quand tu logueras
          une séance.
        </SousTitre>
      </Carte>

      {session ? <ChoixSports userId={session.user.id} /> : null}
    </Ecran>
  );
}
