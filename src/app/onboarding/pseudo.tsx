import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { useInscription } from '@/lib/onboarding';
import { useSession } from '@/lib/session';
import { Bouton, Champ, Ecran, Erreur, SousTitre, Titre } from '@/ui';

/** Même expression que la contrainte `pseudo_format` en base. */
const FORMAT_PSEUDO = /^[A-Za-z0-9_.]{3,20}$/;

export default function EcranPseudo() {
  const router = useRouter();
  const { session, rafraichirProfil } = useSession();
  const { parcours, code, dateNaissance, consentementEnfant } = useInscription();
  const [pseudo, setPseudo] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function creerProfil() {
    setErreur(null);

    if (!FORMAT_PSEUDO.test(pseudo)) {
      setErreur('Le pseudo doit faire 3 à 20 caractères : lettres, chiffres, « _ » et « . ».');
      return;
    }
    if (!dateNaissance || !session) {
      setErreur('Ton inscription a été interrompue. Reprends depuis le début.');
      return;
    }

    setEnCours(true);
    const { error } =
      parcours === 'rungen'
        ? await supabase.rpc('create_rungen_profile', {
            p_code: code ?? '',
            p_pseudo: pseudo,
            p_birth_date: dateNaissance,
            p_child_consent: consentementEnfant,
          })
        : await supabase
            .from('profiles')
            .insert({ id: session.user.id, pseudo, birth_date: dateNaissance });
    setEnCours(false);

    if (error) {
      setErreur(messageErreur(error));
      return;
    }

    await rafraichirProfil();
    router.replace('/onboarding/sports');
  }

  return (
    <Ecran>
      <Titre>Choisis ton pseudo</Titre>
      <SousTitre>
        {parcours === 'rungen'
          ? "C'est le nom que les autres verront. Ne mets jamais ton vrai nom ni celui de ton collège."
          : 'C’est le nom que les autres verront. Tu pourras le changer plus tard.'}
      </SousTitre>
      <Erreur>{erreur}</Erreur>
      <Champ
        label="Pseudo"
        value={pseudo}
        onChangeText={setPseudo}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        placeholder="coureur_du_21"
        aide="3 à 20 caractères : lettres, chiffres, « _ » et « . »."
      />
      <Bouton titre="Créer mon compte" onPress={creerProfil} enCours={enCours} />
    </Ecran>
  );
}
