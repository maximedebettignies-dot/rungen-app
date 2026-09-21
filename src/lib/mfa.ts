/**
 * Choix de l'étape de double authentification, isolé de l'écran pour être testé.
 *
 * Le piège corrigé ici : `supabase.auth.mfa.listFactors()` ne range dans `data.totp`
 * que les facteurs **déjà vérifiés**. Un enrôlement abandonné n'y figure donc jamais,
 * alors qu'il continue d'occuper son nom côté Supabase et fait échouer tout nouvel
 * enrôlement. On raisonne donc sur `data.all`, et on purge avant de créer.
 */

export type FacteurMfa = {
  id: string;
  factor_type: string;
  status: string;
};

export type EtapeMfa =
  | { action: 'verifier'; facteur: string }
  | { action: 'enroler'; aPurger: string[] };

export function prochaineEtapeMfa(facteurs: readonly FacteurMfa[]): EtapeMfa {
  const totp = facteurs.filter((f) => f.factor_type === 'totp');

  const verifie = totp.find((f) => f.status === 'verified');
  if (verifie) return { action: 'verifier', facteur: verifie.id };

  return { action: 'enroler', aPurger: totp.map((f) => f.id) };
}
