import { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { allure, formaterDistance, formaterDuree, lireDureeMinutes } from '@/lib/activite';
import { chargerSeances, LIBELLE_EFFORT, type SeanceAffichee } from '@/lib/seances';
import { enFrancais } from '@/lib/date';
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

export default function DetailSeance() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const [seance, setSeance] = useState<SeanceAffichee | null>(null);
  const [duree, setDuree] = useState('');
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!session) return;
    const { data, error } = await chargerSeances(session.user.id);
    if (error) {
      setErreur(messageErreur(error));
    } else {
      const trouvee = (data ?? []).find((s) => s.id === id) ?? null;
      setSeance(trouvee);
      if (trouvee) setDuree(String(Math.round(trouvee.duration_s / 60)));
    }
    setChargement(false);
  }, [session, id]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  async function enregistrerDuree() {
    if (!seance) return;
    setErreur(null);
    const dureeS = lireDureeMinutes(duree);
    if (dureeS === null) {
      setErreur('La durée doit être un nombre de minutes, entre 1 et 1440.');
      return;
    }
    setEnCours(true);
    const { error } = await supabase.from('activities').update({ duration_s: dureeS }).eq('id', seance.id);
    setEnCours(false);
    if (error) setErreur(messageErreur(error));
    else await charger();
  }

  function demanderSuppression() {
    if (!seance) return;
    Alert.alert('Supprimer cette séance', 'Elle ne comptera plus dans tes totaux.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setEnCours(true);
          const { error } = await supabase.from('activities').delete().eq('id', seance.id);
          setEnCours(false);
          if (error) setErreur(messageErreur(error));
          else router.back();
        },
      },
    ]);
  }

  if (chargement) return <Chargement />;
  if (!seance) {
    return (
      <Ecran>
        <Erreur>{erreur ?? 'Séance introuvable.'}</Erreur>
      </Ecran>
    );
  }

  const rythme = allure(seance.distance_m, seance.duration_s, seance.sportUnite);
  const verrouillee = Boolean(seance.locked_at);

  return (
    <Ecran>
      <Titre>{seance.sportNom}</Titre>
      <SousTitre>{enFrancais(seance.performed_on)}</SousTitre>
      <Erreur>{erreur}</Erreur>

      <Carte>
        <View style={{ flexDirection: 'row', gap: espace.lg }}>
          <View>
            <Text style={{ color: couleurs.texte, fontSize: 22, fontWeight: '700' }}>
              {formaterDuree(seance.duration_s)}
            </Text>
            <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>durée</Text>
          </View>
          {seance.distance_m ? (
            <View>
              <Text style={{ color: couleurs.texte, fontSize: 22, fontWeight: '700' }}>
                {formaterDistance(seance.distance_m)}
              </Text>
              <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>distance</Text>
            </View>
          ) : null}
          {rythme ? (
            <View>
              <Text style={{ color: couleurs.texte, fontSize: 22, fontWeight: '700' }}>{rythme}</Text>
              <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>allure</Text>
            </View>
          ) : null}
        </View>
        {seance.effort ? (
          <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>
            Ressenti : {LIBELLE_EFFORT[seance.effort]}
          </Text>
        ) : null}
        {seance.note ? (
          <Text style={{ color: couleurs.texte, fontSize: 15 }}>{seance.note}</Text>
        ) : null}
      </Carte>

      {verrouillee ? (
        <Carte>
          <SousTitre>
            Cette séance compte dans un défi terminé : elle ne peut plus être modifiée ni supprimée.
          </SousTitre>
        </Carte>
      ) : (
        <>
          <Champ
            label="Corriger la durée (min)"
            value={duree}
            onChangeText={setDuree}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Bouton titre="Enregistrer" onPress={enregistrerDuree} enCours={enCours} />
          <Bouton
            titre="Supprimer cette séance"
            variante="danger"
            onPress={demanderSuppression}
            desactive={enCours}
          />
        </>
      )}
    </Ecran>
  );
}
