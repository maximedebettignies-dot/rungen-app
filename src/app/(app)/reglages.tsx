import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { isMinor, type Visibility } from '@/lib/age';
import { enFrancais } from '@/lib/date';
import { useSession } from '@/lib/session';
import { PhotoProfil } from '@/ui/photo-profil';
import { ChoixSports } from '@/ui/choix-sports';
import {
  Bouton,
  Carte,
  couleurs,
  Ecran,
  Erreur,
  espace,
  Paragraphe,
  rayon,
  SousTitre,
  Titre,
} from '@/ui';

const VISIBILITES: { valeur: Visibility; titre: string; aide: string }[] = [
  { valeur: 'public', titre: 'Public', aide: 'Tous les membres connectés voient ton pseudo et ta photo.' },
  { valeur: 'amis', titre: 'Amis', aide: 'Seuls tes amis te voient (les amis arrivent au bloc 4).' },
  { valeur: 'prive', titre: 'Privé', aide: 'Personne ne te voit.' },
];

export default function Reglages() {
  const { session, profil, rafraichirProfil, seDeconnecter } = useSession();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [suppression, setSuppression] = useState(false);

  if (!profil) return null;

  const mineur = isMinor(new Date(`${profil.birth_date}T00:00:00`));

  async function changerVisibilite(valeur: Visibility) {
    setErreur(null);
    setEnCours(true);
    const { error } = await supabase.from('profiles').update({ visibility: valeur }).eq('id', profil!.id);
    setEnCours(false);
    if (error) setErreur(messageErreur(error));
    else await rafraichirProfil();
  }

  async function supprimerCompte() {
    setErreur(null);
    setSuppression(true);

    // La photo vit dans Storage : la base ne peut pas la supprimer en cascade.
    if (profil!.avatar_url) {
      await supabase.storage.from('avatars').remove([`${profil!.id}/avatar.jpg`]);
    }

    const { error } = await supabase.rpc('delete_my_account');
    setSuppression(false);
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    await seDeconnecter();
  }

  function demanderSuppression() {
    Alert.alert(
      'Supprimer mon compte',
      'Tes activités, tes sports et ton profil seront supprimés. Cette action est définitive.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Dernière confirmation', 'Confirmes-tu la suppression définitive de ton compte ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Supprimer définitivement', style: 'destructive', onPress: supprimerCompte },
            ]),
        },
      ],
    );
  }

  return (
    <Ecran>
      <Titre>Réglages</Titre>

      <PhotoProfil />

      <Carte>
        <Paragraphe>{profil.pseudo}</Paragraphe>
        <SousTitre>
          Né(e) le {enFrancais(profil.birth_date)} · espace{' '}
          {profil.space === 'rungen' ? 'RUNGEN' : 'public'}
        </SousTitre>
      </Carte>

      <Titre>Mes sports</Titre>
      <SousTitre>
        Ce sont eux qui te seront proposés quand tu logues une séance.
      </SousTitre>
      {session ? <ChoixSports userId={session.user.id} /> : null}

      <Titre>Qui peut me voir</Titre>
      <Erreur>{erreur}</Erreur>

      {mineur ? (
        <Carte>
          <Paragraphe>Ton profil est privé.</Paragraphe>
          <SousTitre>
            Tant que tu es mineur, ton profil reste privé : personne ne peut te chercher ni voir ta
            fiche. Tu pourras choisir à tes 18 ans.
          </SousTitre>
        </Carte>
      ) : (
        VISIBILITES.map((option) => {
          const actif = profil.visibility === option.valeur;
          return (
            <Pressable
              key={option.valeur}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif, disabled: enCours }}
              disabled={enCours}
              onPress={() => changerVisibilite(option.valeur)}
              style={{
                borderWidth: 1,
                borderRadius: rayon.md,
                borderColor: actif ? couleurs.accent : couleurs.bordure,
                backgroundColor: couleurs.carte,
                padding: espace.md,
                gap: espace.xs,
              }}
            >
              <Text style={{ color: couleurs.texte, fontWeight: '600' }}>{option.titre}</Text>
              <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>{option.aide}</Text>
            </Pressable>
          );
        })
      )}

      <View style={{ height: espace.lg }} />

      <Bouton titre="Me déconnecter" variante="secondaire" onPress={seDeconnecter} />

      <Titre>Supprimer mon compte</Titre>
      <SousTitre>
        Tout est effacé : profil, sports et activités. Les conversations de support sont conservées
        sans ton nom.
      </SousTitre>
      <Bouton
        titre="Supprimer mon compte"
        variante="danger"
        enCours={suppression}
        onPress={demanderSuppression}
      />
    </Ecran>
  );
}
