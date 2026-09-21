import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { messageErreur } from '@/lib/errors';
import { formaterDistance, formaterDuree } from '@/lib/activite';
import { chargerSeances, type SeanceAffichee } from '@/lib/seances';
import {
  chargeEntrainement,
  comparerPeriodes,
  debutDeMois,
  debutDeSemaine,
  entre,
  estimationRiegel,
  records,
  referenceEstimation,
  seancesParJour,
  totalPeriode,
  type SeanceStat,
} from '@/lib/stats';
import { isMinor } from '@/lib/age';
import { useSession } from '@/lib/session';
import { GraphiqueBarres } from '@/ui/graphique';
import {
  Carte,
  Chargement,
  couleurs,
  Ecran,
  Erreur,
  espace,
  rayon,
  SousTitre,
  Titre,
} from '@/ui';

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CIBLES = [
  { m: 5000, nom: '5 km' },
  { m: 10000, nom: '10 km' },
];

function chrono(secondes: number): string {
  const total = Math.round(secondes);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function variation(v: number | null): string {
  if (v === null) return 'pas de comparaison possible';
  if (v === 0) return 'identique à la période précédente';
  return `${v > 0 ? '+' : ''}${v} % par rapport à la période précédente`;
}

export default function Stats() {
  const { session, profil } = useSession();
  const [seances, setSeances] = useState<SeanceAffichee[]>([]);
  const [periode, setPeriode] = useState<'semaine' | 'mois'>('semaine');
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

  const stats = useMemo<SeanceStat[]>(
    () =>
      seances.map((s) => ({
        id: s.id,
        performed_on: s.performed_on,
        duration_s: s.duration_s,
        distance_m: s.distance_m,
        effort: s.effort,
        sportNom: s.sportNom,
        sportUnite: s.sportUnite,
      })),
    [seances],
  );

  const comparaison = useMemo(() => {
    const maintenant = new Date();
    const debut = periode === 'semaine' ? debutDeSemaine(maintenant) : debutDeMois(maintenant);

    const debutPrecedent = new Date(debut);
    const finPrecedent = new Date(debut);
    finPrecedent.setDate(finPrecedent.getDate() - 1);
    if (periode === 'semaine') debutPrecedent.setDate(debutPrecedent.getDate() - 7);
    else debutPrecedent.setMonth(debutPrecedent.getMonth() - 1);

    return {
      actuel: totalPeriode(entre(stats, debut, maintenant)),
      precedent: totalPeriode(entre(stats, debutPrecedent, finPrecedent)),
    };
  }, [stats, periode]);

  const jours = useMemo(() => seancesParJour(stats, new Date(), 7), [stats]);
  const charge = useMemo(() => chargeEntrainement(stats), [stats]);
  const palmares = useMemo(() => records(stats), [stats]);
  const reference = useMemo(() => referenceEstimation(stats), [stats]);

  const mineur = profil ? isMinor(new Date(`${profil.birth_date}T00:00:00`)) : false;

  if (chargement) return <Chargement />;

  const barres = jours.map((j, i) => ({
    libelle: JOURS[(j.date.getDay() + 6) % 7] ?? JOURS[i],
    valeur: j.distanceM > 0 ? j.distanceM : j.dureeS / 60,
  }));
  const enDistance = jours.some((j) => j.distanceM > 0);

  return (
    <Ecran>
      <Titre>Mes stats</Titre>
      <Erreur>{erreur}</Erreur>

      {stats.length === 0 ? (
        <Carte>
          <SousTitre>
            Rien à afficher pour l&apos;instant. Logue une première séance et tes chiffres
            apparaîtront ici.
          </SousTitre>
        </Carte>
      ) : null}

      <View style={{ flexDirection: 'row', gap: espace.sm }}>
        {(['semaine', 'mois'] as const).map((p) => {
          const actif = periode === p;
          return (
            <Pressable
              key={p}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              onPress={() => setPeriode(p)}
              style={{
                paddingVertical: espace.xs,
                paddingHorizontal: espace.md,
                borderRadius: rayon.lg,
                borderWidth: 1,
                borderColor: actif ? couleurs.accent : couleurs.bordure,
              }}
            >
              <Text style={{ color: actif ? couleurs.accent : couleurs.texteDoux, fontSize: 13 }}>
                {p === 'semaine' ? 'Cette semaine' : 'Ce mois-ci'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: espace.sm }}>
        <Carte style={{ flex: 1 }}>
          <Text style={{ color: couleurs.texte, fontSize: 24, fontWeight: '700' }}>
            {comparaison.actuel.distanceM > 0
              ? formaterDistance(comparaison.actuel.distanceM)
              : formaterDuree(comparaison.actuel.dureeS)}
          </Text>
          <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>
            {variation(
              comparerPeriodes(
                comparaison.actuel.distanceM || comparaison.actuel.dureeS,
                comparaison.precedent.distanceM || comparaison.precedent.dureeS,
              ),
            )}
          </Text>
        </Carte>
        <Carte style={{ flex: 1 }}>
          <Text style={{ color: couleurs.texte, fontSize: 24, fontWeight: '700' }}>
            {comparaison.actuel.nombre}
          </Text>
          <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>
            {comparaison.actuel.nombre > 1 ? 'séances' : 'séance'}
          </Text>
        </Carte>
      </View>

      <Carte>
        <GraphiqueBarres
          titre="Ces 7 derniers jours"
          barres={barres}
          format={(v) => (enDistance ? formaterDistance(v) : `${Math.round(v)} min`)}
        />
      </Carte>

      <Carte>
        <Text style={{ color: couleurs.texteDoux, fontSize: 14, fontWeight: '600' }}>
          Charge d&apos;entraînement
        </Text>
        <View style={{ flexDirection: 'row', gap: espace.lg }}>
          <View>
            <Text style={{ color: couleurs.texte, fontSize: 20, fontWeight: '700' }}>
              {charge.recente}
            </Text>
            <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>par jour, 7 jours</Text>
          </View>
          <View>
            <Text style={{ color: couleurs.texte, fontSize: 20, fontWeight: '700' }}>
              {charge.fond}
            </Text>
            <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>par jour, 28 jours</Text>
          </View>
        </View>
        <Text style={{ color: couleurs.texteDoux, fontSize: 12, lineHeight: 17 }}>
          {charge.recente > charge.fond
            ? 'Tu en fais plus que d’habitude en ce moment.'
            : charge.recente < charge.fond
              ? 'Tu en fais moins que d’habitude en ce moment.'
              : 'Tu es sur ton rythme habituel.'}{' '}
          Ce chiffre est ta durée d&apos;entraînement multipliée par ton ressenti. C&apos;est une
          tendance, pas une mesure.
        </Text>
      </Carte>

      {reference && reference.distance_m ? (
        <Carte>
          <Text style={{ color: couleurs.texteDoux, fontSize: 14, fontWeight: '600' }}>
            Estimations
          </Text>
          {CIBLES.map((c) => {
            const t = estimationRiegel(reference.distance_m!, reference.duration_s, c.m);
            if (t === null) return null;
            return (
              <View
                key={c.nom}
                style={{ flexDirection: 'row', justifyContent: 'space-between', gap: espace.sm }}
              >
                <Text style={{ color: couleurs.texte }}>{c.nom}</Text>
                <Text style={{ color: couleurs.texte, fontWeight: '700' }}>{chrono(t)}</Text>
              </View>
            );
          })}
          <Text style={{ color: couleurs.texteDoux, fontSize: 12, lineHeight: 17 }}>
            Estimé à partir de ta meilleure séance récente ({formaterDistance(reference.distance_m)}{' '}
            en {formaterDuree(reference.duration_s)}). C&apos;est une estimation, pas un objectif.
            {mineur ? ' Elle ne remplace pas l’avis de ton professeur d’EPS.' : ''}
          </Text>
        </Carte>
      ) : null}

      {palmares.length > 0 ? <SousTitre>Mes records</SousTitre> : null}
      {palmares.map((r) => (
        <Carte key={r.sportNom}>
          <Text style={{ color: couleurs.texte, fontWeight: '600' }}>{r.sportNom}</Text>
          <View style={{ flexDirection: 'row', gap: espace.lg, flexWrap: 'wrap' }}>
            {r.distanceMaxM ? (
              <View>
                <Text style={{ color: couleurs.texte, fontWeight: '700' }}>
                  {formaterDistance(r.distanceMaxM)}
                </Text>
                <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>plus longue</Text>
              </View>
            ) : null}
            <View>
              <Text style={{ color: couleurs.texte, fontWeight: '700' }}>
                {formaterDuree(r.dureeMaxS)}
              </Text>
              <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>plus longue durée</Text>
            </View>
            {r.meilleureAllureSParKm ? (
              <View>
                <Text style={{ color: couleurs.texte, fontWeight: '700' }}>
                  {chrono(r.meilleureAllureSParKm)} /km
                </Text>
                <Text style={{ color: couleurs.texteDoux, fontSize: 12 }}>meilleure allure</Text>
              </View>
            ) : null}
          </View>
        </Carte>
      ))}
    </Ecran>
  );
}
