import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '@/lib/session';
import { Carte, couleurs, Ecran, SousTitre, Titre } from '@/ui';

type Entree = { titre: string; aide: string; route: string; adminSeul: boolean };

const ENTREES: Entree[] = [
  {
    titre: 'Établissements',
    aide: 'Créer et retrouver les collèges et lycées partenaires.',
    route: '/(app)/admin/etablissements',
    adminSeul: true,
  },
  {
    titre: "Codes d'invitation",
    aide: 'Générer un lot par classe, imprimer les autorisations, activer au retour du papier.',
    route: '/(app)/admin/codes',
    adminSeul: false,
  },
  {
    titre: "Profs d'EPS",
    aide: 'Générer un code de compte encadrant pour un établissement.',
    route: '/(app)/admin/profs',
    adminSeul: true,
  },
  {
    titre: 'Comptes',
    aide: 'Désactiver, réactiver ou supprimer un compte (retrait d’accord parental).',
    route: '/(app)/admin/comptes',
    adminSeul: true,
  },
  {
    titre: 'Support',
    aide: 'Répondre aux messages et suivre leur statut.',
    route: '/(app)/admin/support',
    adminSeul: true,
  },
];

export default function AdminAccueil() {
  const router = useRouter();
  const { role } = useSession();

  const entrees = ENTREES.filter((entree) => role === 'admin' || !entree.adminSeul);

  return (
    <Ecran>
      <Titre>Encadrement</Titre>
      <SousTitre>
        {role === 'admin'
          ? 'Double authentification validée pour cette session.'
          : 'Tu vois uniquement les codes et les élèves de ton établissement.'}
      </SousTitre>

      {entrees.map((entree) => (
        <Pressable key={entree.route} onPress={() => router.push(entree.route as never)}>
          <Carte>
            <Text style={{ color: couleurs.texte, fontWeight: '600', fontSize: 16 }}>
              {entree.titre}
            </Text>
            <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>{entree.aide}</Text>
          </Carte>
        </Pressable>
      ))}
    </Ecran>
  );
}
