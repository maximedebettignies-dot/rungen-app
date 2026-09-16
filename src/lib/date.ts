/** Saisie et formatage de dates, sans dépendance native. */

/**
 * Construit une date locale à partir d'une saisie jour/mois/année.
 * Renvoie `null` si la date n'existe pas (31 février, mois 13, année farfelue…).
 */
export function dateDepuisSaisie(jour: string, mois: string, annee: string): Date | null {
  if (!/^\d{1,2}$/.test(jour) || !/^\d{1,2}$/.test(mois) || !/^\d{4}$/.test(annee)) return null;

  const j = Number(jour);
  const m = Number(mois);
  const a = Number(annee);
  if (a < 1900) return null;

  const date = new Date(a, m - 1, j);
  // `new Date(2026, 1, 31)` glisse au 3 mars : on vérifie que rien n'a bougé.
  if (date.getFullYear() !== a || date.getMonth() !== m - 1 || date.getDate() !== j) return null;
  return date;
}

/** Format `AAAA-MM-JJ` attendu par une colonne `date` Postgres, en heure locale. */
export function versISO(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/** Date lisible : « 3 mars 2011 ». */
export function enFrancais(valeur: string | Date): string {
  const date = typeof valeur === 'string' ? new Date(`${valeur}T00:00:00`) : valeur;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
