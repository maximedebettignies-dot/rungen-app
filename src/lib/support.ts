import type { SupportCategory, SupportStatus } from './database';

export const LIBELLE_CATEGORIE: Record<SupportCategory, string> = {
  probleme: 'Un problème',
  idee: 'Une idée',
  autre: 'Autre chose',
};

export const LIBELLE_STATUT: Record<SupportStatus, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  resolu: 'Résolu',
};

export const COULEUR_STATUT: Record<SupportStatus, 'alerte' | 'accent' | 'succes'> = {
  nouveau: 'alerte',
  en_cours: 'accent',
  resolu: 'succes',
};

/** « il y a 3 jours », « hier », « à l'instant »… pour les listes de conversations. */
export function depuis(iso: string, maintenant: Date = new Date()): string {
  const minutes = Math.floor((maintenant.getTime() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;

  const jours = Math.floor(heures / 24);
  if (jours === 1) return 'hier';
  if (jours < 30) return `il y a ${jours} jours`;

  const mois = Math.floor(jours / 30);
  if (mois < 12) return `il y a ${mois} mois`;
  return `il y a ${Math.floor(mois / 12)} an(s)`;
}
