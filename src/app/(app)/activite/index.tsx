import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { enFrancais, versISO } from '@/lib/date';
import { datesProposees, lireDistanceKm, lireDureeMinutes } from '@/lib/activite';
import {
  LIBELLE_EFFORT,
  enregistrerSeance,
  lancerChrono,
  nombreEnAttente,
  synchroniserFile,
} from '@/lib/seances';
import type { Effort, SportFamily } from '@/lib/database';
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

type Favori = {
  cle: string;
  nom: string;
  famille: SportFamily;
  sportId: number | null;
  customId: string | null;
};

const EFFORTS: Effort[] = ['facile', 'correct', 'dur'];

export default function LoguerSeance() {
  const router = useRouter();
  const { session } = useSession();
  // Renseignés par le chronomètre quand il rend la main.
  const params = useLocalSearchParams<{ dureeS?: string; sportCle?: string; modifiable?: string }>();
  const venuDuChrono = Boolean(params.dureeS);
  const dureeFigee = venuDuChrono && params.modifiable !== '1';

  const [favoris, setFavoris] = useState<Favori[]>([]);
  const [chargement, setChargement] = useState(true);
  const [choisi, setChoisi] = useState<Favori | null>(null);
  const [date, setDate] = useState(() => new Date());
  const [distance, setDistance] = useState('');
  const [duree, setDuree] = useState('');
  const [effort, setEffort] = useState<Effort | null>(null);
  const [note, setNote] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [enregistre, setEnregistre] = useState<'envoyee' | 'en_attente' | null>(null);
  const [enAttente, setEnAttente] = useState(0);

  const charger = useCallback(async () => {
    if (!session) return;
    const [{ data: choix, error }, { data: sports }, { data: persos }] = await Promise.all([
      supabase.from('favorite_sports').select('sport_id, custom_sport_id').eq('user_id', session.user.id),
      supabase.from('sports').select('id, name, family'),
      supabase.from('custom_sports').select('id, name, family'),
    ]);

    if (error) {
      setErreur(messageErreur(error));
      setChargement(false);
      return;
    }

    const parId = new Map((sports ?? []).map((s) => [s.id, s]));
    const parPerso = new Map((persos ?? []).map((s) => [s.id, s]));
    const liste: Favori[] = (choix ?? []).flatMap<Favori>((f) => {
      if (f.sport_id) {
        const s = parId.get(f.sport_id);
        return s ? [{ cle: `s:${s.id}`, nom: s.name, famille: s.family, sportId: s.id, customId: null }] : [];
      }
      const c = f.custom_sport_id ? parPerso.get(f.custom_sport_id) : undefined;
      return c ? [{ cle: `c:${c.id}`, nom: c.name, famille: c.family, sportId: null, customId: c.id }] : [];
    });

    setFavoris(liste);
    setChoisi((actuel) => actuel ?? liste.find((f) => f.cle === params.sportCle) ?? liste[0] ?? null);
    if (params.dureeS) setDuree(String(Math.round(Number(params.dureeS) / 60)));
    setChargement(false);
  }, [session, params.sportCle, params.dureeS]);

  useFocusEffect(
    useCallback(() => {
      charger();
      // Le retour sur cet écran est le bon moment pour vider la file : l'app
      // vient de reprendre la main, le réseau est peut-être revenu.
      synchroniserFile()
        .then(({ abandonnees }) => {
          if (abandonnees.length > 0) {
            setErreur(
              `${abandonnees.length} séance(s) en attente ont été refusées par le serveur et retirées.`,
            );
          }
          return nombreEnAttente();
        })
        .then(setEnAttente);
    }, [charger]),
  );

  const jours = useMemo(() => datesProposees().slice(0, 8), []);
  const besoinDistance = choisi?.famille === 'distance';

  async function enregistrer() {
    setErreur(null);
    if (!choisi || !session) {
      setErreur('Choisis un sport pour commencer.');
      return;
    }

    const dureeS = lireDureeMinutes(duree);
    if (dureeS === null) {
      setErreur('La durée doit être un nombre de minutes, entre 1 et 1440.');
      return;
    }

    let distanceM: number | null = null;
    if (besoinDistance) {
      distanceM = lireDistanceKm(distance);
      if (distanceM === null) {
        setErreur('Indique une distance en kilomètres, par exemple 8,2.');
        return;
      }
    }

    setEnCours(true);
    const resultat = await enregistrerSeance({
      user_id: session.user.id,
      sport_id: choisi.sportId,
      custom_sport_id: choisi.customId,
      performed_on: versISO(date),
      duration_s: dureeS,
      distance_m: distanceM,
      effort,
      note: note.trim() || null,
      source: venuDuChrono ? 'chrono' : 'saisie',
    });
    setEnCours(false);

    if (resultat.statut === 'refusee') {
      setErreur(messageErreur(resultat.error));
      return;
    }
    setEnAttente(await nombreEnAttente());
    setEnregistre(resultat.statut);
  }

  function recommencer() {
    setEnregistre(null);
    setDistance('');
    setDuree('');
    setEffort(null);
    setNote('');
    setDate(new Date());
    // Sans cela, les paramètres laissés par le chronomètre survivraient : la
    // séance suivante serait figée sur la durée mesurée et marquée « chrono ».
    router.replace('/(app)/activite');
  }

  if (chargement) return <Chargement />;

  if (enregistre) {
    return (
      <Ecran>
        <Titre>{enregistre === 'envoyee' ? 'Séance enregistrée' : 'Séance gardée sur ton téléphone'}</Titre>
        <SousTitre>
          {enregistre === 'envoyee'
            ? 'Elle apparaît dans ton historique et compte dans tes totaux.'
            : "Pas de réseau pour l'instant. Elle partira toute seule dès que la connexion reviendra — tu n'as rien à faire."}
        </SousTitre>
        <Bouton titre="Voir mon historique" onPress={() => router.push('/(app)/activite/historique')} />
        <Bouton titre="Loguer une autre séance" variante="secondaire" onPress={recommencer} />
      </Ecran>
    );
  }

  if (favoris.length === 0) {
    return (
      <Ecran>
        <Titre>Loguer une séance</Titre>
        <Carte>
          <SousTitre>
            Tu n&apos;as pas encore de sport favori. Choisis-en au moins un : ce sont eux qui
            apparaissent ici.
          </SousTitre>
          <Bouton
            titre="Choisir mes sports"
            onPress={() => router.push('/(app)/reglages')}
          />
        </Carte>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <Titre>{venuDuChrono ? 'Ta séance' : 'Loguer une séance'}</Titre>
      <Erreur>{erreur}</Erreur>

      {enAttente > 0 ? (
        <Carte>
          <SousTitre>
            {enAttente === 1
              ? "1 séance attend d'être envoyée. Elle partira dès le retour du réseau."
              : `${enAttente} séances attendent d'être envoyées. Elles partiront dès le retour du réseau.`}
          </SousTitre>
        </Carte>
      ) : null}

      {venuDuChrono ? null : (
        <Bouton
          titre="Lancer le chronomètre"
          variante="secondaire"
          onPress={async () => {
            if (!choisi) {
              setErreur('Choisis un sport pour commencer.');
              return;
            }
            await lancerChrono(choisi);
            router.push('/(app)/activite/chrono');
          }}
        />
      )}

      <SousTitre>Sport</SousTitre>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espace.sm }}>
        {favoris.map((f) => {
          const actif = choisi?.cle === f.cle;
          return (
            <Pressable
              key={f.cle}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              onPress={() => setChoisi(f)}
              style={{
                paddingVertical: espace.sm,
                paddingHorizontal: espace.md,
                borderRadius: rayon.lg,
                borderWidth: 1,
                borderColor: actif ? couleurs.accent : couleurs.bordure,
                backgroundColor: actif ? couleurs.accent : couleurs.carte,
              }}
            >
              <Text style={{ color: actif ? couleurs.accentTexte : couleurs.texte }}>{f.nom}</Text>
            </Pressable>
          );
        })}
      </View>

      <SousTitre>Quand</SousTitre>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espace.sm }}>
        {jours.map((j, i) => {
          const actif = versISO(j) === versISO(date);
          return (
            <Pressable
              key={versISO(j)}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              onPress={() => setDate(j)}
              style={{
                paddingVertical: espace.xs,
                paddingHorizontal: espace.md,
                borderRadius: rayon.lg,
                borderWidth: 1,
                borderColor: actif ? couleurs.accent : couleurs.bordure,
              }}
            >
              <Text style={{ color: actif ? couleurs.accent : couleurs.texteDoux, fontSize: 13 }}>
                {i === 0 ? "Aujourd'hui" : i === 1 ? 'Hier' : enFrancais(j).replace(/ \d{4}$/, '')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: espace.sm }}>
        <View style={{ flex: 1 }}>
          <Champ
            label="Durée (min)"
            value={duree}
            onChangeText={setDuree}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="42"
            editable={!dureeFigee}
            aide={dureeFigee ? 'Mesurée au chronomètre' : undefined}
          />
        </View>
        {besoinDistance ? (
          <View style={{ flex: 1 }}>
            <Champ
              label="Distance (km)"
              value={distance}
              onChangeText={setDistance}
              keyboardType="decimal-pad"
              maxLength={6}
              placeholder="8,2"
            />
          </View>
        ) : null}
      </View>

      <SousTitre>Ressenti (optionnel)</SousTitre>
      <View style={{ flexDirection: 'row', gap: espace.sm }}>
        {EFFORTS.map((e) => {
          const actif = effort === e;
          return (
            <Pressable
              key={e}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              onPress={() => setEffort(actif ? null : e)}
              style={{
                paddingVertical: espace.sm,
                paddingHorizontal: espace.md,
                borderRadius: rayon.lg,
                borderWidth: 1,
                borderColor: actif ? couleurs.accent : couleurs.bordure,
              }}
            >
              <Text style={{ color: actif ? couleurs.accent : couleurs.texteDoux }}>
                {LIBELLE_EFFORT[e]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Champ
        label="Note (optionnel)"
        value={note}
        onChangeText={setNote}
        maxLength={280}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: 'top' }}
        placeholder="Sortie tranquille avec le club…"
        aide={`${note.length}/280`}
      />

      <Bouton titre="Enregistrer" onPress={enregistrer} enCours={enCours} />
      <Bouton
        titre="Voir mon historique"
        variante="secondaire"
        onPress={() => router.push('/(app)/activite/historique')}
      />
    </Ecran>
  );
}
