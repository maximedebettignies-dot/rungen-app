/**
 * Nommage et rotation des sauvegardes.
 *
 * Isolé du script pour être testé : une erreur ici supprimerait des sauvegardes,
 * c'est-à-dire exactement ce qu'on cherche à protéger.
 */

/** `2026-10-02_21-30-05` — triable alphabétiquement, et valide comme nom de dossier Windows. */
export function horodatage(date: Date): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}-${d(date.getUTCMonth() + 1)}-${d(date.getUTCDate())}` +
    `_${d(date.getUTCHours())}-${d(date.getUTCMinutes())}-${d(date.getUTCSeconds())}`
  );
}

const MOTIF = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;

/**
 * Les sauvegardes à supprimer pour n'en garder que `aConserver`, les plus récentes.
 *
 * Tout ce qui ne porte pas le motif d'horodatage est laissé tranquille : le dossier
 * de sauvegarde appartient à son propriétaire, pas à ce script.
 */
export function sauvegardesAPurger(noms: readonly string[], aConserver: number): string[] {
  if (!Number.isInteger(aConserver) || aConserver < 1) {
    throw new Error('aConserver doit être un entier d’au moins 1');
  }

  const sauvegardes = noms.filter((n) => MOTIF.test(n)).sort();
  const aSupprimer = sauvegardes.length - aConserver;

  return aSupprimer > 0 ? sauvegardes.slice(0, aSupprimer) : [];
}
