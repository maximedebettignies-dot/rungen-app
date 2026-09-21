import type { PaceUnit } from './database';

/**
 * Affichage et lecture des séances. Ces calculs ne sont qu'un habillage :
 * les règles qui comptent (dates, distance selon la famille, bornes de durée)
 * sont appliquées par la base, et l'app ne fait que les anticiper.
 */

/** Miroir de `public.jours_saisie_retroactive()`. */
export const JOURS_SAISIE_RETROACTIVE = 30;

const DUREE_MIN_S = 60;
const DUREE_MAX_S = 86_400;
const DISTANCE_MAX_M = 1_000_000;

/** « 42 min », « 1 h », « 1 h 30 ». */
export function formaterDuree(secondes: number): string {
  const minutes = Math.round(secondes / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste === 0 ? `${h} h` : `${h} h ${String(reste).padStart(2, '0')}`;
}

/** « 8,2 km », « 12 km ». */
export function formaterDistance(metres: number): string {
  const km = metres / 1000;
  const texte = km.toFixed(1).replace(/\.0$/, '');
  return `${texte.replace('.', ',')} km`;
}

function minutesSecondes(totalSecondes: number): string {
  // Arrondir d'abord, puis découper : découper en premier afficherait « 5:60 »
  // pour 5 min 59,6 s.
  const total = Math.round(totalSecondes);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Allure d'une séance selon l'unité du sport. Renvoie `null` dès qu'elle n'a
 * pas de sens : sport mesuré en durée, distance absente ou durée nulle.
 */
export function allure(
  distanceM: number | null,
  dureeS: number,
  unite: PaceUnit,
): string | null {
  if (unite === 'none' || !distanceM || distanceM <= 0 || dureeS <= 0) return null;

  switch (unite) {
    case 'min_per_km':
      return `${minutesSecondes(dureeS / (distanceM / 1000))} /km`;
    case 'km_per_h': {
      const kmh = distanceM / 1000 / (dureeS / 3600);
      return `${kmh.toFixed(1).replace('.', ',')} km/h`;
    }
    case 'min_per_100m':
      return `${minutesSecondes(dureeS / (distanceM / 100))} /100 m`;
  }
}

/** Saisie en kilomètres (virgule ou point) vers des mètres. */
export function lireDistanceKm(texte: string): number | null {
  const v = texte.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(v)) return null;
  const metres = Math.round(Number(v) * 1000);
  if (metres <= 0 || metres > DISTANCE_MAX_M) return null;
  return metres;
}

/** Saisie en minutes entières vers des secondes. */
export function lireDureeMinutes(texte: string): number | null {
  const v = texte.trim();
  if (!/^\d+$/.test(v)) return null;
  const secondes = Number(v) * 60;
  if (secondes < DUREE_MIN_S || secondes > DUREE_MAX_S) return null;
  return secondes;
}

/** Compare deux dates au jour près, en heure locale. */
function jour(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Une séance ne se loge ni dans le futur, ni au-delà de la fenêtre rétroactive. */
export function dansFenetreDeSaisie(date: Date, aujourdhui: Date = new Date()): boolean {
  const j = jour(date);
  const maintenant = jour(aujourdhui);
  if (j > maintenant) return false;

  const plusAncienne = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  plusAncienne.setDate(plusAncienne.getDate() - JOURS_SAISIE_RETROACTIVE);
  return j >= plusAncienne.getTime();
}

/** Les dates proposées dans le formulaire, de la plus récente à la plus ancienne. */
export function datesProposees(aujourdhui: Date = new Date()): Date[] {
  return Array.from({ length: JOURS_SAISIE_RETROACTIVE + 1 }, (_, i) => {
    const d = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
    d.setDate(d.getDate() - i);
    return d;
  });
}
