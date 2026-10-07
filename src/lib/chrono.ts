/**
 * Chronomètre d'une séance en cours.
 *
 * Il ne compte pas, il date. Un compteur incrémenté chaque seconde devient faux
 * dès que le système suspend le JavaScript — téléphone rangé dans la poche,
 * écran éteint, app tuée pour récupérer de la mémoire. On enregistre donc
 * l'instant de départ et on recalcule la durée à chaque affichage.
 *
 * Conséquence utile : aucune tâche de fond, donc aucune permission supplémentaire,
 * et une séance se retrouve intacte après le redémarrage de l'app.
 *
 * Spec : docs/specs/2026-10-07-chrono-et-hors-ligne-design.md
 */

/** Au-delà, l'app propose de clore une séance manifestement oubliée. */
export const SECONDES_AVANT_OUBLI = 6 * 3600;

export type Chrono = {
  /** Instant de départ, en millisecondes depuis l'époque. */
  demarreA: number;
  /** Temps déjà passé en pause, en millisecondes. */
  pauseCumuleeMs: number;
  /** Début de la pause en cours, ou `null` si le chronomètre tourne. */
  enPauseDepuis: number | null;
};

export function demarrer(maintenant: number): Chrono {
  return { demarreA: maintenant, pauseCumuleeMs: 0, enPauseDepuis: null };
}

export function enPause(c: Chrono): boolean {
  return c.enPauseDepuis !== null;
}

export function mettreEnPause(c: Chrono, maintenant: number): Chrono {
  if (enPause(c)) return c;
  return { ...c, enPauseDepuis: maintenant };
}

export function reprendre(c: Chrono, maintenant: number): Chrono {
  if (c.enPauseDepuis === null) return c;
  return {
    demarreA: c.demarreA,
    pauseCumuleeMs: c.pauseCumuleeMs + Math.max(0, maintenant - c.enPauseDepuis),
    enPauseDepuis: null,
  };
}

/**
 * Durée écoulée, pauses déduites.
 *
 * Le plancher à zéro n'est pas de la prudence gratuite : l'horloge d'un téléphone
 * recule pour de vrai, au changement de fuseau comme à la synchronisation réseau.
 * Une durée négative remonterait jusqu'à la base.
 */
export function dureeEcouleeS(c: Chrono, maintenant: number): number {
  const fin = c.enPauseDepuis ?? maintenant;
  return Math.max(0, Math.round((fin - c.demarreA - c.pauseCumuleeMs) / 1000));
}

export function arreter(c: Chrono, maintenant: number): number {
  return dureeEcouleeS(c, maintenant);
}

/**
 * Un chronomètre lancé puis oublié produirait une séance de neuf heures. Seul le
 * cas « en marche » compte : une pause ne fait pas grandir la durée, donc elle ne
 * fausse rien, même après trois jours.
 */
export function estOublie(c: Chrono, maintenant: number): boolean {
  return !enPause(c) && dureeEcouleeS(c, maintenant) > SECONDES_AVANT_OUBLI;
}
