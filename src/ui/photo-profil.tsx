import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { useSession } from '@/lib/session';
import { Bouton, couleurs, Erreur, espace } from '@/ui';

/** Bucket privé : le chemin est fixe, l'affichage passe par une URL signée. */
function chemin(userId: string) {
  return `${userId}/avatar.jpg`;
}

export function PhotoProfil() {
  const { profil, rafraichirProfil } = useSession();
  const [apercu, setApercu] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const chargerApercu = useCallback(async () => {
    if (!profil?.avatar_url) {
      setApercu(null);
      return;
    }
    const { data } = await supabase.storage.from('avatars').createSignedUrl(profil.avatar_url, 3600);
    setApercu(data?.signedUrl ?? null);
  }, [profil?.avatar_url]);

  useEffect(() => {
    chargerApercu();
  }, [chargerApercu]);

  async function choisir() {
    if (!profil) return;
    setErreur(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErreur("L'accès aux photos est nécessaire pour choisir une image.");
      return;
    }

    const choix = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (choix.canceled) return;

    setEnCours(true);
    try {
      const fichier = await fetch(choix.assets[0].uri);
      const contenu = await fichier.arrayBuffer();

      const { error: erreurEnvoi } = await supabase.storage
        .from('avatars')
        .upload(chemin(profil.id), contenu, { contentType: 'image/jpeg', upsert: true });
      if (erreurEnvoi) throw erreurEnvoi;

      const { error: erreurProfil } = await supabase
        .from('profiles')
        .update({ avatar_url: chemin(profil.id) })
        .eq('id', profil.id);
      if (erreurProfil) throw erreurProfil;

      await rafraichirProfil();
    } catch (error) {
      setErreur(messageErreur(error));
    } finally {
      setEnCours(false);
    }
  }

  async function retirer() {
    if (!profil) return;
    setErreur(null);
    setEnCours(true);
    try {
      await supabase.storage.from('avatars').remove([chemin(profil.id)]);
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', profil.id);
      if (error) throw error;
      setApercu(null);
      await rafraichirProfil();
    } catch (error) {
      setErreur(messageErreur(error));
    } finally {
      setEnCours(false);
    }
  }

  if (!profil) return null;

  return (
    <View style={{ gap: espace.sm, alignItems: 'center' }}>
      <Erreur>{erreur}</Erreur>
      <Pressable accessibilityRole="button" accessibilityLabel="Changer ma photo" onPress={choisir}>
        {apercu ? (
          <Image
            source={{ uri: apercu }}
            style={{ width: 96, height: 96, borderRadius: 48 }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: couleurs.carte,
              borderWidth: 1,
              borderColor: couleurs.bordure,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: couleurs.texteDoux, fontSize: 28 }}>
              {profil.pseudo.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
      </Pressable>
      <Bouton
        titre={apercu ? 'Changer ma photo' : 'Ajouter une photo'}
        variante="secondaire"
        onPress={choisir}
        enCours={enCours}
      />
      {apercu ? (
        <Bouton titre="Retirer ma photo" variante="secondaire" onPress={retirer} desactive={enCours} />
      ) : null}
    </View>
  );
}
