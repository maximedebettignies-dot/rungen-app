import { File, Paths } from 'expo-file-system';
import { supabase } from './supabase';
import { estPanneReseau } from './errors.ts';
import {
  ajouter,
  deserialiser,
  identifiantSeance,
  retirer,
  serialiser,
  suiteDeSynchro,
  type ChargeSeance,
  type SeanceEnAttente,
} from './file-attente.ts';
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

// ---------------------------------------------------------------------------
// Enregistrement : réseau d'abord, disque en secours
//
// Spec : docs/specs/2026-10-07-chrono-et-hors-ligne-design.md
// ---------------------------------------------------------------------------

/** Dans `document` et non `cache` : le système ne doit pas effacer ça pour faire de la place. */
function fichierFile(): File {
  return new File(Paths.document, 'seances-en-attente.json');
}

async function lireFile(): Promise<SeanceEnAttente[]> {
  try {
    const f = fichierFile();
    return f.exists ? deserialiser(await f.text()) : [];
  } catch {
    // Disque illisible : on repart d'une file vide plutôt que de bloquer l'app.
    return [];
  }
}

async function ecrireFile(file: readonly SeanceEnAttente[]): Promise<void> {
  const f = fichierFile();
  if (!f.exists) f.create({ overwrite: true });
  f.write(serialiser(file));
}

export async function nombreEnAttente(): Promise<number> {
  return (await lireFile()).length;
}

export type ResultatEnregistrement =
  | { statut: 'envoyee' }
  /** Gardée sur le téléphone : elle partira au prochain retour du réseau. */
  | { statut: 'en_attente' }
  | { statut: 'refusee'; error: unknown };

/**
 * Enregistre une séance, en ligne si possible, sur le disque sinon.
 *
 * L'identifiant est posé ici, avant le premier envoi : c'est ce qui rend un
 * renvoi inoffensif.
 */
export async function enregistrerSeance(charge: ChargeSeance): Promise<ResultatEnregistrement> {
  const id = identifiantSeance();
  const { error } = await supabase.from('activities').insert({ id, ...charge });
  if (!error) return { statut: 'envoyee' };

  if (!estPanneReseau(error)) return { statut: 'refusee', error };

  await ecrireFile(ajouter(await lireFile(), { id, creeA: Date.now(), charge }));
  return { statut: 'en_attente' };
}

export type Synchronisation = { envoyees: number; abandonnees: SeanceEnAttente[] };

/**
 * Vide la file. À appeler au démarrage et au retour au premier plan.
 *
 * On s'arrête à la première panne de réseau : insister ne ferait qu'épuiser la
 * batterie, et l'ordre vécu par l'élève est préservé. Une séance refusée par la
 * base sort de la file — l'y laisser reviendrait à la représenter indéfiniment —
 * et elle est rendue à l'appelant, qui doit le dire à l'utilisateur.
 */
export async function synchroniserFile(): Promise<Synchronisation> {
  let file = await lireFile();
  if (file.length === 0) return { envoyees: 0, abandonnees: [] };

  let envoyees = 0;
  const abandonnees: SeanceEnAttente[] = [];

  for (const seance of file) {
    const { error } = await supabase.from('activities').insert({ id: seance.id, ...seance.charge });
    const suite = error ? suiteDeSynchro(error) : 'reussi';

    if (suite === 'reessayer') break;
    if (suite === 'abandonner') abandonnees.push(seance);
    else envoyees += 1;

    file = retirer(file, seance.id);
  }

  await ecrireFile(file);
  return { envoyees, abandonnees };
}
