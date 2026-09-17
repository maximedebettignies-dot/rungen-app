/**
 * Alias lisibles pour le reste de l'app, dérivés des types générés depuis le
 * projet Supabase (`src/lib/database.generated.ts`, produit par
 * `npm run types:gen`).
 *
 * Rien n'est réécrit à la main ici : si une migration change une colonne, la
 * régénération fait apparaître l'écart au typecheck.
 */
import type { Database as Genere } from './database.generated';

type PublicGenere = Genere['public'];
type FonctionsGenerees = PublicGenere['Functions'];

/**
 * Le générateur ne sait pas exprimer la nullabilité des **arguments** d'une
 * fonction : il type `p_class_label` en `string` alors que la base accepte
 * `null` (un lot de codes peut ne viser aucune classe). On rétablit la
 * signature réelle ici plutôt que de forcer le type à chaque appel.
 */
export type Database = Omit<Genere, 'public'> & {
  public: Omit<PublicGenere, 'Functions'> & {
    Functions: Omit<FonctionsGenerees, 'generate_invite_codes'> & {
      generate_invite_codes: Omit<FonctionsGenerees['generate_invite_codes'], 'Args'> & {
        Args: Omit<FonctionsGenerees['generate_invite_codes']['Args'], 'p_class_label'> & {
          p_class_label: string | null;
        };
      };
    };
  };
};

type Tables = PublicGenere['Tables'];
type Enums = PublicGenere['Enums'];

// Énumérations de la base
export type Visibility = Enums['visibility'];
export type Space = Enums['space'];
export type SportFamily = Enums['sport_family'];
export type PaceUnit = Enums['pace_unit'];
export type StaffRole = Enums['staff_role'];
export type InviteKind = Enums['invite_kind'];
export type InviteStatus = Enums['invite_status'];
export type SupportCategory = Enums['support_category'];
export type SupportStatus = Enums['support_status'];

/** Réponse de `check_invite_code` (la fonction renvoie un texte libre en base). */
export type InviteCheck = 'ok' | 'en_attente' | 'utilise' | 'invalide';

// Lignes des tables
export type Profile = Tables['profiles']['Row'];
export type Sport = Tables['sports']['Row'];
export type CustomSport = Tables['custom_sports']['Row'];
export type FavoriteSport = Tables['favorite_sports']['Row'];
export type Establishment = Tables['establishments']['Row'];
export type StaffRoleRow = Tables['staff_roles']['Row'];
export type InviteCode = Tables['invite_codes']['Row'];
export type RungenMembership = Tables['rungen_memberships']['Row'];
export type SupportThread = Tables['support_threads']['Row'];
export type SupportMessage = Tables['support_messages']['Row'];

/** Carte de profil visible par les autres : jamais la date de naissance. */
export type PublicProfile = PublicGenere['Views']['public_profiles']['Row'];

/**
 * Compte retrouvé par `find_account_by_code`. Le générateur ne sait pas
 * exprimer la nullabilité des colonnes renvoyées par une fonction : on la
 * rétablit ici, conformément au schéma.
 */
type CompteBrut = FonctionsGenerees['find_account_by_code']['Returns'][number];
export type CompteParCode = Omit<CompteBrut, 'disabled_at' | 'class_label'> & {
  disabled_at: string | null;
  class_label: string | null;
};
