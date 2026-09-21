import type { Effort, PaceUnit } from './database';

/**
 * Statistiques dérivées des séances. Aucun appel réseau, aucune table
 * d'agrégats : tout se calcule à partir des séances déjà chargées.
 *
 * Ce que l'app affiche s'appelle « charge d'entraînement », jamais « forme ».
 * Sans fréquence cardiaque ni puissance — exclues du projet — une courbe de
 * forme ne serait pas fiable, et un indicateur de bien-être ferait basculer
 * l'app du côté santé des stores. On montre des chiffres et d'où ils viennent ;
 * on ne prescrit rien.
 */
export type SeanceStat = {
  id: string;
  performed_on: string;
  duration_s: number;
  distance_m: number | null;
  effort: Effort | null;
  sportNom: string;
  sportUnite: PaceUnit;
};

/** Méthode RPE × durée : la plus simple qui tienne sans capteur. */
const COEFFICIENT_EFFORT: Record<Effort, number> = { facile: 1, correct: 2, dur: 3 };

/** Un record d'allure demande une distance significative. */
const DISTANCE_MIN_ALLURE_M = 1000;

/** Riegel décroche au-delà de ce rapport entre cible et référence. */
const FACTEUR_MAX_RIEGEL = 3;
const DISTANCE_MIN_REFERENCE_M = 3000;

function jour(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function depuisISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Lundi de la semaine contenant `date`. */
export function debutDeSemaine(date: Date): Date {
  const d = jour(date);
  // getDay() rend 0 pour dimanche : on ramène la semaine au lundi.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Premier jour du mois contenant `date`. */
export function debutDeMois(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export type Total = { distanceM: number; dureeS: number; nombre: number };

export function totalPeriode(seances: SeanceStat[]): Total {
  return seances.reduce<Total>(
    (acc, s) => ({
      distanceM: acc.distanceM + (s.distance_m ?? 0),
      dureeS: acc.dureeS + s.duration_s,
      nombre: acc.nombre + 1,
    }),
    { distanceM: 0, dureeS: 0, nombre: 0 },
  );
}

/** Séances comprises entre deux dates, bornes incluses. */
export function entre(seances: SeanceStat[], debut: Date, fin: Date): SeanceStat[] {
  const a = jour(debut).getTime();
  const b = jour(fin).getTime();
  return seances.filter((s) => {
    const t = depuisISO(s.performed_on).getTime();
    return t >= a && t <= b;
  });
}

/**
 * Variation en pourcentage entre deux périodes. Renvoie `null` quand la
 * période précédente est vide : « +∞ % » n'apprend rien à personne.
 */
export function comparerPeriodes(actuel: number, precedent: number): number | null {
  if (precedent <= 0) return null;
  return Math.round(((actuel - precedent) / precedent) * 100);
}

export function chargeSeance(s: SeanceStat): number {
  const minutes = s.duration_s / 60;
  return minutes * COEFFICIENT_EFFORT[s.effort ?? 'correct'];
}

/**
 * Charge quotidienne moyenne sur deux fenêtres : 7 jours pour la période
 * récente, 28 jours pour le fond. Leur rapport situe la semaine par rapport
 * au mois — sans seuil, sans alerte.
 */
export function chargeEntrainement(seances: SeanceStat[], aujourdhui: Date = new Date()) {
  function moyenne(jours: number): number {
    const debut = jour(aujourdhui);
    debut.setDate(debut.getDate() - (jours - 1));
    const total = entre(seances, debut, aujourdhui).reduce((acc, s) => acc + chargeSeance(s), 0);
    return Math.round((total / jours) * 10) / 10;
  }
  return { recente: moyenne(7), fond: moyenne(28) };
}

export type JourStat = { date: Date; distanceM: number; dureeS: number; charge: number };

/** Une entrée par jour sur les `jours` derniers, du plus ancien au plus récent. */
export function seancesParJour(
  seances: SeanceStat[],
  aujourdhui: Date = new Date(),
  jours = 7,
): JourStat[] {
  return Array.from({ length: jours }, (_, i) => {
    const d = jour(aujourdhui);
    d.setDate(d.getDate() - (jours - 1 - i));
    const duJour = seances.filter((s) => depuisISO(s.performed_on).getTime() === d.getTime());
    const t = totalPeriode(duJour);
    return {
      date: d,
      distanceM: t.distanceM,
      dureeS: t.dureeS,
      charge: duJour.reduce((acc, s) => acc + chargeSeance(s), 0),
    };
  });
}

export type RecordSport = {
  sportNom: string;
  distanceMaxM: number | null;
  dureeMaxS: number;
  /** Secondes par kilomètre, uniquement pour les sports mesurés ainsi. */
  meilleureAllureSParKm: number | null;
};

export function records(seances: SeanceStat[]): RecordSport[] {
  const parSport = new Map<string, SeanceStat[]>();
  for (const s of seances) {
    const liste = parSport.get(s.sportNom) ?? [];
    liste.push(s);
    parSport.set(s.sportNom, liste);
  }

  return [...parSport.entries()].map(([sportNom, liste]) => {
    const distances = liste.map((s) => s.distance_m).filter((d): d is number => d !== null);

    // Une allure sur 200 m n'est pas un record : on écarte les distances trop courtes.
    const allures = liste
      .filter((s) => s.sportUnite === 'min_per_km' && (s.distance_m ?? 0) >= DISTANCE_MIN_ALLURE_M)
      .map((s) => s.duration_s / (s.distance_m! / 1000));

    return {
      sportNom,
      distanceMaxM: distances.length ? Math.max(...distances) : null,
      dureeMaxS: Math.max(...liste.map((s) => s.duration_s)),
      meilleureAllureSParKm: allures.length ? Math.round(Math.min(...allures)) : null,
    };
  });
}

/**
 * Formule de Riegel : t₂ = t₁ × (d₂ / d₁)^1,06.
 * Renvoie `null` quand l'extrapolation ne tient plus — référence trop courte,
 * ou cible plus de trois fois plus longue.
 */
export function estimationRiegel(
  distanceRefM: number,
  tempsRefS: number,
  distanceCibleM: number,
): number | null {
  if (distanceRefM < DISTANCE_MIN_REFERENCE_M || tempsRefS <= 0 || distanceCibleM <= 0) return null;
  if (distanceCibleM > distanceRefM * FACTEUR_MAX_RIEGEL) return null;
  return tempsRefS * Math.pow(distanceCibleM / distanceRefM, 1.06);
}

/** Meilleure séance de référence pour une estimation, sur les 90 derniers jours. */
export function referenceEstimation(
  seances: SeanceStat[],
  aujourdhui: Date = new Date(),
): SeanceStat | null {
  const debut = jour(aujourdhui);
  debut.setDate(debut.getDate() - 90);

  const candidates = entre(seances, debut, aujourdhui).filter(
    (s) => s.sportUnite === 'min_per_km' && (s.distance_m ?? 0) >= DISTANCE_MIN_REFERENCE_M,
  );
  if (!candidates.length) return null;

  // La plus rapide en allure, pas la plus longue.
  return candidates.reduce((a, b) =>
    a.duration_s / a.distance_m! <= b.duration_s / b.distance_m! ? a : b,
  );
}
