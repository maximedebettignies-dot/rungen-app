import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { canRegister, MIN_REGISTRATION_AGE } from '@/lib/age';
import { dateDepuisSaisie, versISO } from '@/lib/date';
import { useInscription } from '@/lib/onboarding';
import { useSession } from '@/lib/session';
import { Bouton, Champ, Ecran, Erreur, espace, SousTitre, Titre } from '@/ui';

export default function EcranNaissance() {
  const router = useRouter();
  const { session } = useSession();
  const { parcours, definir } = useInscription();
  const [jour, setJour] = useState('');
  const [mois, setMois] = useState('');
  const [annee, setAnnee] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  const ageMini = MIN_REGISTRATION_AGE[parcours];

  function continuer() {
    setErreur(null);
    const date = dateDepuisSaisie(jour, mois, annee);
    if (!date) {
      setErreur("Cette date n'existe pas. Vérifie le jour, le mois et l'année.");
      return;
    }

    // Même règle qu'en base : l'app ne fait que la refléter pour éviter un aller-retour.
    if (!canRegister(date, parcours)) {
      setErreur(
        `Il faut avoir au moins ${ageMini} ans pour rejoindre ${
          parcours === 'rungen' ? "l'espace RUNGEN" : "l'espace public"
        }. Rien n'est enregistré.`,
      );
      return;
    }

    definir({ dateNaissance: versISO(date) });
    // Parcours RUNGEN : l'écran d'information et la connexion viennent ensuite.
    if (parcours === 'rungen') router.push('/onboarding/info-donnees');
    else if (session) router.push('/onboarding/pseudo');
    else router.push('/onboarding/connexion');
  }

  return (
    <Ecran>
      <Titre>Ta date de naissance</Titre>
      <SousTitre>
        Elle sert à vérifier ton âge et à protéger ton compte. Elle n&apos;est jamais montrée aux
        autres, et ne sera plus modifiable ensuite.
      </SousTitre>
      <Erreur>{erreur}</Erreur>

      <View style={{ flexDirection: 'row', gap: espace.sm }}>
        <View style={{ flex: 1 }}>
          <Champ
            label="Jour"
            value={jour}
            onChangeText={setJour}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="03"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Champ
            label="Mois"
            value={mois}
            onChangeText={setMois}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="09"
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Champ
            label="Année"
            value={annee}
            onChangeText={setAnnee}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="2010"
          />
        </View>
      </View>

      <Bouton titre="Continuer" onPress={continuer} />
    </Ecran>
  );
}
