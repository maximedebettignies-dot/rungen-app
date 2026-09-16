import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { COULEUR_STATUT, depuis, LIBELLE_STATUT } from '@/lib/support';
import type { SupportMessage, SupportThread } from '@/lib/database';
import { useSession } from '@/lib/session';
import {
  Bouton,
  Carte,
  Champ,
  Chargement,
  couleurs,
  Ecran,
  Erreur,
  espace,
  SousTitre,
  Titre,
} from '@/ui';
import { Etiquette } from '@/ui/etiquette';

export default function FilSupport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [fil, setFil] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [brouillon, setBrouillon] = useState('');
  const [piece, setPiece] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [{ data: t, error: e1 }, { data: m, error: e2 }] = await Promise.all([
      supabase.from('support_threads').select('*').eq('id', id).single(),
      supabase.from('support_messages').select('*').eq('thread_id', id).order('created_at'),
    ]);
    if (e1 ?? e2) setErreur(messageErreur(e1 ?? e2));
    else {
      setFil(t);
      setMessages(m ?? []);
    }
    setChargement(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  async function joindreCapture() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErreur("L'accès aux photos est nécessaire pour joindre une capture.");
      return;
    }
    const choix = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!choix.canceled) setPiece(choix.assets[0]);
  }

  async function envoyer() {
    if (!brouillon.trim()) return;
    setErreur(null);
    setEnvoi(true);

    try {
      let chemin: string | null = null;
      if (piece) {
        // Bucket privé, rangé par utilisateur : c'est le chemin qui porte le droit d'accès.
        chemin = `${session!.user.id}/${Date.now()}.jpg`;
        const contenu = await (await fetch(piece.uri)).arrayBuffer();
        const { error } = await supabase.storage
          .from('support')
          .upload(chemin, contenu, { contentType: 'image/jpeg' });
        if (error) throw error;
      }

      const { error } = await supabase.from('support_messages').insert({
        thread_id: id,
        author_id: session!.user.id,
        body: brouillon.trim(),
        attachment_path: chemin,
      });
      if (error) throw error;

      setBrouillon('');
      setPiece(null);
      await charger();
    } catch (error) {
      setErreur(messageErreur(error));
    } finally {
      setEnvoi(false);
    }
  }

  if (chargement) return <Chargement />;
  if (!fil) return <Ecran><Erreur>{erreur ?? 'Conversation introuvable.'}</Erreur></Ecran>;

  return (
    <Ecran>
      <Titre>{fil.subject}</Titre>
      <Etiquette texte={LIBELLE_STATUT[fil.status]} ton={COULEUR_STATUT[fil.status]} />
      <Erreur>{erreur}</Erreur>

      {messages.map((message) => {
        const deMoi = message.author_id === session?.user.id;
        return (
          <View key={message.id} style={{ alignItems: deMoi ? 'flex-end' : 'flex-start' }}>
            <Carte
              style={{
                maxWidth: '90%',
                backgroundColor: deMoi ? couleurs.accent : couleurs.carte,
                borderColor: deMoi ? couleurs.accent : couleurs.bordure,
              }}
            >
              <Text style={{ color: deMoi ? couleurs.accentTexte : couleurs.texte, fontSize: 16 }}>
                {message.body}
              </Text>
              {message.attachment_path ? (
                <Text style={{ color: deMoi ? couleurs.accentTexte : couleurs.texteDoux, fontSize: 12 }}>
                  📎 capture jointe
                </Text>
              ) : null}
              <Text style={{ color: deMoi ? couleurs.accentTexte : couleurs.texteDoux, fontSize: 11 }}>
                {deMoi ? 'Moi' : 'Équipe RUNGEN'} · {depuis(message.created_at)}
              </Text>
            </Carte>
          </View>
        );
      })}

      <View style={{ height: espace.md }} />
      <Champ
        label="Répondre"
        value={brouillon}
        onChangeText={setBrouillon}
        maxLength={4000}
        multiline
        numberOfLines={4}
        style={{ minHeight: 100, textAlignVertical: 'top' }}
        placeholder="Ta réponse…"
      />
      <SousTitre>{piece ? 'Une capture sera jointe.' : 'Tu peux joindre une capture d’écran.'}</SousTitre>
      <Bouton
        titre={piece ? 'Changer la capture' : 'Joindre une capture'}
        variante="secondaire"
        onPress={joindreCapture}
        desactive={envoi}
      />
      <Bouton titre="Envoyer" onPress={envoyer} enCours={envoi} desactive={!brouillon.trim()} />
    </Ecran>
  );
}
