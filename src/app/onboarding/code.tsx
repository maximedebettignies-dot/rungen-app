import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur, messageStatutCode } from '@/lib/errors';
import { useInscription } from '@/lib/onboarding';
import { Bouton, Champ, Ecran, Erreur, SousTitre, Titre } from '@/ui';

/** Format imposé par la base : 10 caractères, sans 0/O ni 1/I. */
const FORMAT_CODE = /^[A-HJ-NP-Z2-9]{10}$/;

export default function EcranCode() {
  const router = useRouter();
  const { definir } = useInscription();
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const normalise = code.toUpperCase().trim();

  async function verifier() {
    setErreur(null);
    if (!FORMAT_CODE.test(normalise)) {
      setErreur('Un code RUNGEN fait 10 caractères (lettres et chiffres, sans O, I, 0 ni 1).');
      return;
    }

    setEnCours(true);
    const { data, error } = await supabase.rpc('check_invite_code', { p_code: normalise });
    setEnCours(false);

    if (error) {
      setErreur(messageErreur(error));
      return;
    }

    const probleme = messageStatutCode(data as string);
    if (probleme) {
      setErreur(probleme);
      return;
    }

    definir({ parcours: 'rungen', code: normalise });
    router.push('/onboarding/naissance');
  }

  return (
    <Ecran>
      <Titre>Ton code RUNGEN</Titre>
      <SousTitre>
        Recopie le code imprimé sur l&apos;autorisation que tes parents ont signée. Il ne sert
        qu&apos;une fois.
      </SousTitre>
      <Erreur>{erreur}</Erreur>
      <Champ
        label="Code"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={10}
        placeholder="ABCDEF2345"
        aide="10 caractères, sans les lettres O et I ni les chiffres 0 et 1."
      />
      <Bouton titre="Vérifier mon code" onPress={verifier} enCours={enCours} />
    </Ecran>
  );
}
