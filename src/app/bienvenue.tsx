import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInscription } from '@/lib/onboarding';
import { BoutonsConnexion } from '@/ui/connexion';
import { Bouton, Carte, Ecran, espace, Paragraphe, SousTitre, Titre } from '@/ui';

export default function Bienvenue() {
  const router = useRouter();
  const { definir, reinitialiser } = useInscription();

  return (
    <Ecran>
      <View style={{ flex: 1, justifyContent: 'center', gap: espace.lg }}>
        <View style={{ gap: espace.sm }}>
          <Titre>RUNGEN</Titre>
          <SousTitre>
            Loguer tes activités, suivre ta forme et relever des challenges entre amis. Gratuit, porté
            par une association.
          </SousTitre>
        </View>

        <Carte>
          <Paragraphe>Je m&apos;inscris ou je me connecte</Paragraphe>
          <SousTitre>Espace public, à partir de 15 ans.</SousTitre>
          <BoutonsConnexion
            onConnecte={() => {
              reinitialiser();
              definir({ parcours: 'public' });
            }}
          />
        </Carte>

        <Carte>
          <Paragraphe>J&apos;ai un code RUNGEN</Paragraphe>
          <SousTitre>
            Le code figure sur l&apos;autorisation parentale remise lors de l&apos;intervention. À
            partir de 11 ans.
          </SousTitre>
          <Bouton
            titre="Entrer mon code"
            variante="secondaire"
            onPress={() => {
              reinitialiser();
              definir({ parcours: 'rungen' });
              router.push('/onboarding/code');
            }}
          />
        </Carte>
      </View>
    </Ecran>
  );
}
