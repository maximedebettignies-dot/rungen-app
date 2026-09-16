import type { SportFamily } from './database';

export type SportCatalogue = { id: number; name: string; family: SportFamily };

export const LIBELLE_FAMILLE: Record<SportFamily, string> = {
  distance: 'Distance',
  duree: 'Durée',
};

export const AIDE_FAMILLE: Record<SportFamily, string> = {
  distance: 'On mesure une distance (course, vélo, natation…).',
  duree: 'On mesure un temps (musculation, sports collectifs…).',
};

/** Minuscules, sans accent ni ponctuation : sert à chercher et à comparer. */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Distance de Levenshtein, bornée à ce dont on a besoin pour suggérer. */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  const precedent = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let coinHautGauche = precedent[0];
    precedent[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const coinHaut = precedent[j];
      precedent[j] = Math.min(
        precedent[j] + 1,
        precedent[j - 1] + 1,
        coinHautGauche + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      coinHautGauche = coinHaut;
    }
  }
  return precedent[b.length];
}

/** Sports du catalogue correspondant à une recherche, les plus proches d'abord. */
export function chercher(requete: string, catalogue: SportCatalogue[]): SportCatalogue[] {
  const q = normaliser(requete);
  if (!q) return catalogue;
  return catalogue.filter((sport) => normaliser(sport.name).includes(q));
}

/**
 * Sport du catalogue à proposer avant de laisser créer un sport perso :
 * évite les doublons du type « courses à pieds » à côté de « Course à pied ».
 */
export function suggerer(requete: string, catalogue: SportCatalogue[]): SportCatalogue | null {
  const q = normaliser(requete);
  if (q.length < 3) return null;

  let meilleur: { sport: SportCatalogue; score: number } | null = null;
  for (const sport of catalogue) {
    const nom = normaliser(sport.name);
    if (nom === q) return sport;

    // Tolérance proportionnelle à la longueur : 1 faute sur un mot court, 3 sur un long.
    const tolerance = Math.min(3, Math.floor(Math.max(nom.length, q.length) / 4) + 1);
    const ecart = nom.includes(q) || q.includes(nom) ? 0 : distance(nom, q);
    if (ecart <= tolerance && (!meilleur || ecart < meilleur.score)) {
      meilleur = { sport, score: ecart };
    }
  }
  return meilleur?.sport ?? null;
}
