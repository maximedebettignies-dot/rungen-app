import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { messageErreur } from '@/lib/errors';
import { allure, formaterDistance, formaterDuree } from '@/lib/activite';
import { chargerSeances, cumul, type SeanceAffichee } from '@/lib/seances';
import { enFrancais } from '@/lib/date';
import { useSession } from '@/lib/session';
import {
  Carte,
  Chargement,
  couleurs,
  Ecran,
  Erreur,
  espace,
  SousTitre,
  Titre,
} from '@/ui';

export default function Historique() {
  const router = useRouter();
  const { session } = useSession();
  const [seances, setSeances] = useState<SeanceAffichee[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!session) return;
    const { data, error } = await chargerSeances(session.user.id);
    if (error) setErreur(messageErreur(error));
    else setSeances(data ?? []);
    setChargement(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const ceMois = useMemo(() => {
    const debut = new Date();
    debut.setDate(1);
    const cle = `${debut.getFullYear()}-${String(debut.getMonth() + 1).padStart(2, '0')}`;
    return cumul(seances.filter((s) => s.performed_on.startsWith(cle)));
  }, [seances]);

  if (chargement) return <Chargement />;

  return (
    <Ecran>
      <Titre>Mon historique</Titre>
      <Erreur>{erreur}</Erreur>

      <View style={{ flexDirection: 'row', gap: espace.sm }}>
        <Carte style={{ flex: 1 }}>
          <Text style={{ color: couleurs.texte, fontSize: 24, fontWeight: '700' }}>
            {ceMois.distanceM > 0 ? formaterDistance(ceMois.distanceM) : formaterDuree(ceMois.dureeS)}
          </Text>
          <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>ce mois-ci</Text>
        </Carte>
        <Carte style={{ flex: 1 }}>
          <Text style={{ color: couleurs.texte, fontSize: 24, fontWeight: '700' }}>
            {ceMois.nombre}
          </Text>
          <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>
            {ceMois.nombre > 1 ? 'séances' : 'séance'}
          </Text>
        </Carte>
      </View>

      {seances.length === 0 ? (
        <Carte>
          <SousTitre>
            Aucune séance pour l&apos;instant. Logue ta première depuis l&apos;onglet Activité.
          </SousTitre>
        </Carte>
      ) : null}

      {seances.map((s) => {
        const rythme = allure(s.distance_m, s.duration_s, s.sportUnite);
        return (
          <Pressable key={s.id} onPress={() => router.push(`/(app)/activite/${s.id}`)}>
            <Carte>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: espace.sm }}>
                <Text style={{ color: couleurs.texte, fontWeight: '600', flex: 1 }}>
                  {s.sportNom}
                  {s.locked_at ? ' 🔒' : ''}
                </Text>
                <Text style={{ color: couleurs.texte, fontWeight: '700' }}>
                  {s.distance_m ? formaterDistance(s.distance_m) : formaterDuree(s.duration_s)}
                </Text>
              </View>
              <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>
                {enFrancais(s.performed_on)}
                {s.distance_m ? ` · ${formaterDuree(s.duration_s)}` : ''}
                {rythme ? ` · ${rythme}` : ''}
              </Text>
            </Carte>
          </Pressable>
        );
      })}
    </Ecran>
  );
}
