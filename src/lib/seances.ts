import { supabase } from './supabase';
import type { Activity, Effort, PaceUnit, SportFamily } from './database';

/** Une séance accompagnée du sport auquel elle se rattache. */
export type SeanceAffichee = Activity & {
  sportNom: string;
  sportFamille: SportFamily;
  sportUnite: PaceUnit;
  perso: boolean;
};

export const LIBELLE_EFFORT: Record<Effort, string> = {
  facile: 'Facile',
  correct: 'Correct',
  dur: 'Dur',
};

/**
 * Charge les séances d'un utilisateur avec leur sport.
 *
 * Les jointures sont faites ici plutôt qu'en une requête imbriquée : une
 * séance porte soit un sport du catalogue, soit un sport perso, et PostgREST
 * ne sait pas exprimer ce « soit l'un soit l'autre » en une seule sélection.
 */
export async function chargerSeances(userId: string, limite?: number) {
  const requete = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('performed_on', { ascending: false })
    .order('created_at', { ascending: false });

  const [seances, sports, persos] = await Promise.all([
    limite ? requete.limit(limite) : requete,
    supabase.from('sports').select('id, name, family, pace_unit'),
    supabase.from('custom_sports').select('id, name, family'),
  ]);

  const erreur = seances.error ?? sports.error ?? persos.error;
  if (erreur) return { data: null, error: erreur };

  const parId = new Map((sports.data ?? []).map((s) => [s.id, s]));
  const parPerso = new Map((persos.data ?? []).map((s) => [s.id, s]));

  const data: SeanceAffichee[] = (seances.data ?? []).map((a) => {
    const perso = a.custom_sport_id ? parPerso.get(a.custom_sport_id) : undefined;
    const cat = a.sport_id ? parId.get(a.sport_id) : undefined;
    return {
      ...a,
      sportNom: cat?.name ?? perso?.name ?? 'Sport supprimé',
      sportFamille: cat?.family ?? perso?.family ?? 'duree',
      // Un sport perso n'a pas d'unité d'allure en V1 : on n'en affiche pas.
      sportUnite: cat?.pace_unit ?? 'none',
      perso: Boolean(a.custom_sport_id),
    };
  });

  return { data, error: null };
}

/** Total parcouru et temps cumulé sur une liste de séances. */
export function cumul(seances: SeanceAffichee[]) {
  return seances.reduce(
    (acc, s) => ({
      distanceM: acc.distanceM + (s.distance_m ?? 0),
      dureeS: acc.dureeS + s.duration_s,
      nombre: acc.nombre + 1,
    }),
    { distanceM: 0, dureeS: 0, nombre: 0 },
  );
}
