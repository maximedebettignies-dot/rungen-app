import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { LIBELLE_CATEGORIE } from '@/lib/support';
import type { SupportCategory } from '@/lib/database';
import { useSession } from '@/lib/session';
import {
  Bouton,
  Champ,
  couleurs,
  Ecran,
  Erreur,
  espace,
  rayon,
  SousTitre,
  Titre,
} from '@/ui';

const CATEGORIES: SupportCategory[] = ['probleme', 'idee', 'autre'];

export default function NouvelleConversation() {
  const router = useRouter();
  const { session } = useSession();
  const [categorie, setCategorie] = useState<SupportCategory>('probleme');
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer() {
    setErreur(null);
    if (sujet.trim().length < 3) {
      setErreur('Le sujet doit faire au moins 3 caractères.');
      return;
    }
    if (message.trim().length < 1) {
      setErreur('Écris ton message avant d’envoyer.');
      return;
    }

    setEnCours(true);
    const { data, error } = await supabase
      .from('support_threads')
      .insert({ user_id: session!.user.id, category: categorie, subject: sujet.trim() })
      .select('id')
      .single();

    if (error || !data) {
      setEnCours(false);
      setErreur(messageErreur(error));
      return;
    }

    const { error: erreurMessage } = await supabase
      .from('support_messages')
      .insert({ thread_id: data.id, author_id: session!.user.id, body: message.trim() });
    setEnCours(false);

    if (erreurMessage) {
      setErreur(messageErreur(erreurMessage));
      return;
    }

    router.replace(`/(app)/support/${data.id}`);
  }

  return (
    <Ecran>
      <Titre>Nouvelle conversation</Titre>
      <SousTitre>De quoi s&apos;agit-il ?</SousTitre>

      {CATEGORIES.map((valeur) => {
        const actif = categorie === valeur;
        return (
          <Pressable
            key={valeur}
            accessibilityRole="radio"
            accessibilityState={{ selected: actif }}
            onPress={() => setCategorie(valeur)}
            style={{
              borderWidth: 1,
              borderRadius: rayon.sm,
              borderColor: actif ? couleurs.accent : couleurs.bordure,
              backgroundColor: couleurs.carte,
              padding: espace.md,
            }}
          >
            <Text style={{ color: couleurs.texte }}>{LIBELLE_CATEGORIE[valeur]}</Text>
          </Pressable>
        );
      })}

      <Erreur>{erreur}</Erreur>
      <Champ
        label="Sujet"
        value={sujet}
        onChangeText={setSujet}
        maxLength={120}
        placeholder="Je n'arrive pas à me connecter"
      />
      <Champ
        label="Message"
        value={message}
        onChangeText={setMessage}
        maxLength={4000}
        multiline
        numberOfLines={6}
        style={{ minHeight: 140, textAlignVertical: 'top' }}
        placeholder="Explique ce qui se passe…"
      />
      <Bouton titre="Envoyer" onPress={envoyer} enCours={enCours} />
    </Ecran>
  );
}
