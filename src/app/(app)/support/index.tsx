import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { COULEUR_STATUT, depuis, LIBELLE_CATEGORIE, LIBELLE_STATUT } from '@/lib/support';
import type { SupportThread } from '@/lib/database';
import { useSession } from '@/lib/session';
import { Bouton, Carte, Chargement, couleurs, Ecran, Erreur, espace, SousTitre, Titre } from '@/ui';
import { Etiquette } from '@/ui/etiquette';

export default function MesConversations() {
  const router = useRouter();
  const { session } = useSession();
  const [conversations, setConversations] = useState<SupportThread[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      (async () => {
        // La RLS limite déjà la liste à ses propres conversations ; le filtre
        // évite d'y mêler celles des autres quand on est admin.
        const { data, error } = await supabase
          .from('support_threads')
          .select('*')
          .eq('user_id', session!.user.id)
          .order('updated_at', { ascending: false });
        if (!vivant) return;
        if (error) setErreur(messageErreur(error));
        else setConversations(data ?? []);
        setChargement(false);
      })();
      return () => {
        vivant = false;
      };
    }, [session]),
  );

  if (chargement) return <Chargement />;

  return (
    <Ecran>
      <Titre>Support</Titre>
      <SousTitre>
        Un souci, une idée ? Écris-nous. Les messages ne peuvent être ni modifiés ni supprimés, de
        part et d&apos;autre.
      </SousTitre>
      <Erreur>{erreur}</Erreur>

      <Bouton titre="Nouvelle conversation" onPress={() => router.push('/(app)/support/nouvelle')} />

      {conversations.length === 0 ? (
        <Carte>
          <SousTitre>Tu n&apos;as encore aucune conversation.</SousTitre>
        </Carte>
      ) : (
        conversations.map((fil) => (
          <Pressable key={fil.id} onPress={() => router.push(`/(app)/support/${fil.id}`)}>
            <Carte>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: espace.sm }}>
                <Text style={{ color: couleurs.texte, fontWeight: '600', flex: 1 }}>{fil.subject}</Text>
                <Etiquette texte={LIBELLE_STATUT[fil.status]} ton={COULEUR_STATUT[fil.status]} />
              </View>
              <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>
                {LIBELLE_CATEGORIE[fil.category]} · {depuis(fil.updated_at)}
              </Text>
            </Carte>
          </Pressable>
        ))
      )}
    </Ecran>
  );
}
