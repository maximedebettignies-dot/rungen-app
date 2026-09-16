import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { COULEUR_STATUT, depuis, LIBELLE_CATEGORIE, LIBELLE_STATUT } from '@/lib/support';
import type { SupportMessage, SupportStatus, SupportThread } from '@/lib/database';
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
  rayon,
  SousTitre,
  Titre,
} from '@/ui';
import { Etiquette } from '@/ui/etiquette';

const STATUTS: SupportStatus[] = ['nouveau', 'en_cours', 'resolu'];
/** Les conversations à traiter d'abord remontent en haut. */
const ORDRE: Record<SupportStatus, number> = { nouveau: 0, en_cours: 1, resolu: 2 };

export default function SupportAdmin() {
  const { session } = useSession();
  const [fils, setFils] = useState<SupportThread[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reponse, setReponse] = useState('');
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase
      .from('support_threads')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) setErreur(messageErreur(error));
    else setFils(data ?? []);
    setChargement(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const triees = useMemo(
    () => [...fils].sort((a, b) => ORDRE[a.status] - ORDRE[b.status]),
    [fils],
  );

  const chargerMessages = useCallback(async (filId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('thread_id', filId)
      .order('created_at');
    if (error) setErreur(messageErreur(error));
    else setMessages(data ?? []);
  }, []);

  async function ouvrir(fil: SupportThread) {
    if (ouvert === fil.id) {
      setOuvert(null);
      return;
    }
    setOuvert(fil.id);
    setMessages([]);
    await chargerMessages(fil.id);
  }

  async function repondre(fil: SupportThread) {
    if (!reponse.trim()) return;
    setErreur(null);
    setEnCours(true);
    const { error } = await supabase
      .from('support_messages')
      .insert({ thread_id: fil.id, author_id: session!.user.id, body: reponse.trim() });
    setEnCours(false);
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    setReponse('');
    await chargerMessages(fil.id);
    await charger();
  }

  async function changerStatut(fil: SupportThread, statut: SupportStatus) {
    setErreur(null);
    const { error } = await supabase.from('support_threads').update({ status: statut }).eq('id', fil.id);
    if (error) setErreur(messageErreur(error));
    await charger();
  }

  if (chargement) return <Chargement />;

  return (
    <Ecran>
      <Titre>Boîte de réception</Titre>
      <SousTitre>
        Les messages sont définitifs : tu peux répondre et changer le statut, rien d&apos;autre.
      </SousTitre>
      <Erreur>{erreur}</Erreur>

      {triees.length === 0 ? <SousTitre>Aucune conversation.</SousTitre> : null}

      {triees.map((fil) => (
        <Carte key={fil.id}>
          <Pressable onPress={() => ouvrir(fil)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: espace.sm }}>
              <Text style={{ color: couleurs.texte, fontWeight: '600', flex: 1 }}>{fil.subject}</Text>
              <Etiquette texte={LIBELLE_STATUT[fil.status]} ton={COULEUR_STATUT[fil.status]} />
            </View>
            <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>
              {LIBELLE_CATEGORIE[fil.category]} · {depuis(fil.updated_at)}
              {fil.user_id === null ? ' · compte supprimé' : ''}
            </Text>
          </Pressable>

          {ouvert === fil.id ? (
            <View style={{ gap: espace.sm, marginTop: espace.sm }}>
              {messages.map((message) => {
                const deMoi = message.author_id === session?.user.id;
                return (
                  <View
                    key={message.id}
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: deMoi ? couleurs.accent : couleurs.bordure,
                      paddingLeft: espace.sm,
                    }}
                  >
                    <Text style={{ color: couleurs.texte }}>{message.body}</Text>
                    {message.attachment_path ? (
                      <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>📎 capture jointe</Text>
                    ) : null}
                    <Text style={{ color: couleurs.texteDoux, fontSize: 11 }}>
                      {deMoi ? 'Moi' : 'Utilisateur'} · {depuis(message.created_at)}
                    </Text>
                  </View>
                );
              })}

              <Champ
                label="Réponse"
                value={reponse}
                onChangeText={setReponse}
                multiline
                numberOfLines={4}
                maxLength={4000}
                style={{ minHeight: 100, textAlignVertical: 'top' }}
                placeholder="Ta réponse…"
              />
              <Bouton
                titre="Répondre"
                onPress={() => repondre(fil)}
                enCours={enCours}
                desactive={!reponse.trim()}
              />

              <SousTitre>Statut</SousTitre>
              <View style={{ flexDirection: 'row', gap: espace.sm }}>
                {STATUTS.map((statut) => {
                  const actif = fil.status === statut;
                  return (
                    <Pressable
                      key={statut}
                      onPress={() => changerStatut(fil, statut)}
                      style={{
                        paddingVertical: espace.xs,
                        paddingHorizontal: espace.md,
                        borderRadius: rayon.lg,
                        borderWidth: 1,
                        borderColor: actif ? couleurs.accent : couleurs.bordure,
                      }}
                    >
                      <Text style={{ color: actif ? couleurs.accent : couleurs.texteDoux, fontSize: 13 }}>
                        {LIBELLE_STATUT[statut]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </Carte>
      ))}
    </Ecran>
  );
}
