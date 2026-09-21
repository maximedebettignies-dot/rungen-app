/**
 * Traduction des erreurs de la base en messages français.
 *
 * Les règles sont appliquées en base : les triggers et fonctions lèvent un
 * message court (`age_minimum`, `code_utilise`…) que l'app se contente
 * d'afficher. Toute nouvelle exception SQL doit être ajoutée ici.
 */
const MESSAGES: Record<string, string> = {
  // Profils et âge
  age_minimum: "Tu n'as pas l'âge minimum pour rejoindre cet espace.",
  birth_date_in_future: 'La date de naissance ne peut pas être dans le futur.',
  birth_date_immutable: 'La date de naissance ne peut plus être modifiée.',
  space_immuable: "L'espace d'un compte ne peut pas changer.",
  profil_existant: 'Ce compte a déjà un profil.',
  profiles_pseudo_unique: 'Ce pseudo est déjà pris, essaie-en un autre.',
  pseudo_format: 'Le pseudo doit faire 3 à 20 caractères : lettres, chiffres, « _ » et « . ».',
  contenu_interdit: 'Ce nom contient un mot interdit.',

  // Codes RUNGEN
  code_invalide: "Ce code n'existe pas. Vérifie-le sur ton autorisation.",
  code_en_attente: "Ce code n'est pas encore actif : ton autorisation signée n'a pas encore été reçue.",
  code_utilise: 'Ce code a déjà servi à créer un compte.',
  code_non_activable: "Ce code ne peut pas être activé (il est déjà actif, utilisé ou désactivé).",
  code_non_desactivable: 'Ce code ne peut plus être désactivé.',
  consentement_requis: 'Tu dois accepter pour continuer.',
  nombre_invalide: 'Choisis un nombre de codes entre 1 et 60.',
  etablissement_inconnu: "Cet établissement n'existe pas.",

  // Rôles et droits
  not_authenticated: 'Tu dois être connecté pour faire ça.',
  admin_requis: "Cette action est réservée à l'administrateur en double authentification.",
  action_reservee_admin: "Cette action est réservée à l'administrateur.",
  majeur_requis: 'Un compte encadrant doit être majeur.',

  // Séances (bloc 2)
  date_future: 'Cette séance est dans le futur.',
  date_trop_ancienne: 'On ne peut loguer que les 30 derniers jours.',
  duree_invalide: 'La durée doit être comprise entre 1 minute et 24 heures.',
  distance_requise: 'Ce sport se mesure en distance : indique combien de kilomètres.',
  distance_interdite: "Ce sport se mesure en durée : la distance ne s'applique pas.",
  distance_invalide: 'Cette distance ne semble pas réaliste.',
  note_trop_longue: 'La note ne peut pas dépasser 280 caractères.',
  activite_verrouillee:
    'Cette séance compte dans un défi terminé : elle ne peut plus être modifiée.',
  sport_inconnu: "Ce sport n'existe pas ou ne t'appartient pas.",
  activity_one_sport: 'Une séance porte sur un seul sport.',

  // Support
  modification_interdite: 'Une conversation de support ne peut pas être modifiée.',
};

/** Codes Postgres génériques, quand le message ne correspond à aucune règle métier. */
const PAR_CODE_SQL: Record<string, string> = {
  '23505': 'Cette valeur est déjà utilisée.',
  '23514': "Cette valeur n'est pas acceptée.",
  '42501': "Tu n'as pas le droit de faire ça.",
};

type ErreurBase = { message?: string; code?: string; details?: string | null };

/** Message français pour une erreur remontée par Supabase (ou par le réseau). */
export function messageErreur(error: unknown): string {
  if (!error) return 'Une erreur est survenue.';

  const e = error as ErreurBase;
  const brut = typeof e.message === 'string' ? e.message : '';

  // Nom de contrainte ou message d'exception, où qu'il apparaisse dans le texte.
  for (const cle of Object.keys(MESSAGES)) {
    if (brut.includes(cle) || e.details?.includes(cle)) return MESSAGES[cle];
  }

  if (/Network request failed|Failed to fetch|fetch failed/i.test(brut)) {
    return 'Connexion internet requise.';
  }
  if (e.code && PAR_CODE_SQL[e.code]) return PAR_CODE_SQL[e.code];

  return 'Une erreur est survenue. Réessaie dans un instant.';
}

/** Message affiché pour un statut de code renvoyé par `check_invite_code`. */
export function messageStatutCode(statut: string): string | null {
  switch (statut) {
    case 'ok':
      return null;
    case 'en_attente':
      return MESSAGES.code_en_attente;
    case 'utilise':
      return MESSAGES.code_utilise;
    default:
      return MESSAGES.code_invalide;
  }
}
