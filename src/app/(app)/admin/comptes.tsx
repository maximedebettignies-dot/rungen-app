import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { useSession } from '@/lib/session';
import {
  Bouton,
  Carte,
  Champ,
  couleurs,
  Ecran,
  Erreur,
  espace,
  SousTitre,
  Titre,
} from '@/ui';
import { Etiquette } from '@/ui/etiquette';

type Compte = {
  user_id: string;
  pseudo: string;
  space: 'public' | 'rungen';
  disabled_at: string | null;
  establishment_name: string;
  class_label: string | null;
};

export default function Comptes() {
  const { role } = useSession();
  const [code, setCode] = useState('');
  const [compte, setCompte] = useState<Compte | null>(null);
  const [cherche, setCherche] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function chercher() {
    setErreur(null);
    setCompte(null);
    setEnCours(true);
    const { data, error } = await supabase.rpc('find_account_by_code', {
      p_code: code.toUpperCase().trim(),
    });
    setEnCours(false);
    setCherche(true);
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    setCompte((data?.[0] as Compte) ?? null);
  }

  async function basculerDesactivation() {
    if (!compte) return;
    setErreur(null);
    setEnCours(true);
    const { error } = await supabase.rpc('admin_set_account_disabled', {
      p_user: compte.user_id,
      p_disabled: compte.disabled_at === null,
    });
    setEnCours(false);
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    await chercher();
  }

  function demanderSuppression() {
    if (!compte) return;
    Alert.alert(
      'Supprimer ce compte',
      `Le compte « ${compte.pseudo} » et toutes ses données seront supprimés. À n'utiliser qu'en cas de retrait de l'accord parental. Cette action est définitive.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            setEnCours(true);
            const { error } = await supabase.rpc('admin_delete_account', { p_user: compte.user_id });
            setEnCours(false);
            if (error) setErreur(messageErreur(error));
            else {
              setCompte(null);
              setCode('');
              setCherche(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Ecran>
      <Titre>Comptes</Titre>
      <SousTitre>
        Les profils ne sont pas consultables librement, par conception. On part du code inscrit sur
        l&apos;autorisation papier pour retrouver le compte concerné.
      </SousTitre>
      <Erreur>{erreur}</Erreur>

      <Champ
        label="Code de l'autorisation"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={10}
        placeholder="ABCDEF2345"
      />
      <Bouton
        titre="Chercher le compte"
        onPress={chercher}
        enCours={enCours}
        desactive={code.trim().length !== 10}
      />

      {cherche && !compte && !erreur ? (
        <Carte>
          <SousTitre>
            Aucun compte pour ce code : il n&apos;a peut-être pas encore servi, ou il ne relève pas de
            ton établissement.
          </SousTitre>
        </Carte>
      ) : null}

      {compte ? (
        <Carte>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: espace.sm }}>
            <Text style={{ color: couleurs.texte, fontWeight: '700', fontSize: 16 }}>
              {compte.pseudo}
            </Text>
            <Etiquette
              texte={compte.disabled_at ? 'Désactivé' : 'Actif'}
              ton={compte.disabled_at ? 'danger' : 'succes'}
            />
          </View>
          <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>
            Espace {compte.space === 'rungen' ? 'RUNGEN' : 'public'} · {compte.establishment_name}
            {compte.class_label ? ` · ${compte.class_label}` : ''}
          </Text>

          {role === 'admin' ? (
            <>
              <Bouton
                titre={compte.disabled_at ? 'Réactiver le compte' : 'Désactiver le compte'}
                variante="secondaire"
                onPress={basculerDesactivation}
                enCours={enCours}
              />
              <Bouton
                titre="Supprimer (retrait d'accord parental)"
                variante="danger"
                onPress={demanderSuppression}
                desactive={enCours}
              />
            </>
          ) : (
            <SousTitre>Seul l&apos;administrateur peut désactiver ou supprimer un compte.</SousTitre>
          )}
        </Carte>
      ) : null}
    </Ecran>
  );
}
