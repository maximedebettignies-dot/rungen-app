import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInscription } from '@/lib/onboarding';
import { Bouton, Carte, couleurs, Ecran, espace, Paragraphe, SousTitre, Titre } from '@/ui';

/** Texte volontairement écrit pour des élèves de 11 à 14 ans (spec, parcours RUNGEN). */
const POINTS = [
  'On garde ton pseudo, ta date de naissance et les sports que tu choisis.',
  "Ta date de naissance ne sert qu'à vérifier ton âge : personne d'autre que toi ne la voit.",
  'Tant que tu es mineur, ton profil est privé : personne ne peut te chercher ni te voir.',
  "Les gens de l'espace public ne peuvent jamais voir ton compte.",
  "On ne garde aucune donnée de santé : ni ton poids, ni ton cœur.",
  "Tu peux supprimer ton compte quand tu veux depuis les réglages. Tes parents aussi peuvent le demander.",
];

export default function EcranInfoDonnees() {
  const router = useRouter();
  const { definir } = useInscription();
  const [compris, setCompris] = useState(false);

  return (
    <Ecran>
      <Titre>Ce que l&apos;app fait avec tes données</Titre>
      <SousTitre>À lire avant de créer ton compte.</SousTitre>

      <Carte>
        {POINTS.map((point) => (
          <View key={point} style={{ flexDirection: 'row', gap: espace.sm }}>
            <Text style={{ color: couleurs.accent, fontSize: 16 }}>•</Text>
            <Paragraphe>{point}</Paragraphe>
          </View>
        ))}
      </Carte>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: compris }}
        onPress={() => setCompris((valeur) => !valeur)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: espace.md, paddingVertical: espace.sm }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: compris ? couleurs.accent : couleurs.bordure,
            backgroundColor: compris ? couleurs.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {compris ? <Text style={{ color: couleurs.accentTexte, fontWeight: '700' }}>✓</Text> : null}
        </View>
        <Paragraphe>J&apos;ai compris et je suis d&apos;accord.</Paragraphe>
      </Pressable>

      <Bouton
        titre="Continuer"
        desactive={!compris}
        onPress={() => {
          definir({ consentementEnfant: true });
          router.push('/onboarding/connexion');
        }}
      />
    </Ecran>
  );
}
