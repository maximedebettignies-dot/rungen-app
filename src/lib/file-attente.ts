/**
 * File des séances en attente d'envoi.
 *
 * L'app écrivait directement dans Supabase : sans réseau, la saisie était perdue.
 * Or on fait du sport au gymnase, au stade, à la piscine — précisément là où le
 * réseau manque.
 *
 * Ce module ne contient que la logique, pour qu'elle soit testable. L'écriture
 * sur disque vit dans `src/lib/seances.ts`.
 *
 * Spec : docs/specs/2026-10-07-chrono-et-hors-ligne-design.md
 */
import type { ActivitySource, Effort } from './database';
import { estPanneReseau } from './errors.ts';

/** Ce qu'on enverra à la base, tel quel. */
export type ChargeSeance = {
  user_id: string;
  sport_id?: number | null;
  custom_sport_id?: string | null;
  performed_on: string;
  duration_s: number;
  distance_m?: number | null;
  effort?: Effort | null;
  note?: string | null;
  source: ActivitySource;
};

export type SeanceEnAttente = {
  /**
   * Produit par l'app, pas par la base. C'est lui qui rend un renvoi inoffensif :
   * le second envoi se heurte à la clé primaire au lieu de créer un doublon.
   */
  id: string;
  creeA: number;
  charge: ChargeSeance;
};

/** Ajoute, ou remplace si la séance est déjà en attente (l'élève l'a corrigée). */
export function ajouter(file: readonly SeanceEnAttente[], seance: SeanceEnAttente): SeanceEnAttente[] {
  const connue = file.some((s) => s.id === seance.id);
  return connue ? file.map((s) => (s.id === seance.id ? seance : s)) : [...file, seance];
}

export function retirer(file: readonly SeanceEnAttente[], id: string): SeanceEnAttente[] {
  return file.filter((s) => s.id !== id);
}

export function serialiser(file: readonly SeanceEnAttente[]): string {
  return JSON.stringify(file);
}

/**
 * Lecture volontairement tolérante : une file corrompue ne doit jamais empêcher
 * l'app de démarrer. Mieux vaut perdre une séance en attente que bloquer l'élève
 * sur un écran blanc.
 */
export function deserialiser(texte: string | null): SeanceEnAttente[] {
  if (!texte) return [];
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return [];
  }
  if (!Array.isArray(brut)) return [];

  return brut.filter((s): s is SeanceEnAttente => {
    if (typeof s !== 'object' || s === null) return false;
    const e = s as Partial<SeanceEnAttente>;
    return typeof e.id === 'string' && typeof e.creeA === 'number' && typeof e.charge === 'object';
  });
}

export type SuiteDeSynchro =
  /** Envoyée : on la sort de la file. */
  | 'reussi'
  /** Réseau indisponible : on garde la séance et on s'arrêtera là pour ce tour. */
  | 'reessayer'
  /** Refusée par la base : la garder serait la représenter indéfiniment. */
  | 'abandonner';

/**
 * Que faire d'une séance dont l'envoi a échoué.
 *
 * Le cas du doublon n'est pas un échec : il signifie que l'envoi précédent avait
 * abouti et que seule la réponse s'est perdue.
 */
export function suiteDeSynchro(erreur: { code?: string; message?: string }): SuiteDeSynchro {
  if (erreur.code === '23505' || /duplicate key value/i.test(erreur.message ?? '')) return 'reussi';
  if (estPanneReseau(erreur)) return 'reessayer';
  return 'abandonner';
}

/**
 * Identifiant d'une séance, produit par l'app.
 *
 * C'est la clé de voûte de la file : la base le reçoit comme clé primaire, donc
 * un envoi rejoué après une réponse perdue se heurte à un doublon au lieu de
 * créer une seconde séance.
 *
 * `crypto.randomUUID` n'est pas garanti par React Native selon le moteur et la
 * version : la solution de repli n'est pas de la précaution superflue. Elle ne
 * vise pas l'imprévisibilité — cet identifiant n'est pas un secret — mais
 * l'unicité, largement suffisante à l'échelle d'une association.
 */
export function identifiantSeance(): string {
  const natif = globalThis.crypto?.randomUUID;
  if (typeof natif === 'function') return natif.call(globalThis.crypto);

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    // Le 4 marque la version ; le second caractère doit valoir 8, 9, a ou b.
    return (c === 'x' ? n : (n & 0x3) | 0x8).toString(16);
  });
}
