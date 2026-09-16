/**
 * Types de la base, écrits à la main en miroir des migrations
 * `supabase/migrations/`. À régénérer avec `npx supabase gen types typescript`
 * quand le projet Supabase est en place.
 */
export type Visibility = 'public' | 'amis' | 'prive';
export type Space = 'public' | 'rungen';
export type SportFamily = 'distance' | 'duree';
export type PaceUnit = 'min_per_km' | 'km_per_h' | 'min_per_100m' | 'none';
export type StaffRole = 'admin' | 'prof_eps';
export type InviteKind = 'eleve' | 'prof_eps';
export type InviteStatus = 'cree' | 'actif' | 'utilise' | 'desactive';
export type SupportCategory = 'probleme' | 'idee' | 'autre';
export type SupportStatus = 'nouveau' | 'en_cours' | 'resolu';
/** Réponse de `check_invite_code`. */
export type InviteCheck = 'ok' | 'en_attente' | 'utilise' | 'invalide';

export type Profile = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  birth_date: string;
  visibility: Visibility;
  space: Space;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Sport = {
  id: number;
  slug: string;
  name: string;
  family: SportFamily;
  pace_unit: PaceUnit;
};

export type CustomSport = {
  id: string;
  owner_id: string;
  name: string;
  family: SportFamily;
  created_at: string;
};

export type FavoriteSport = {
  id: string;
  user_id: string;
  sport_id: number | null;
  custom_sport_id: string | null;
  created_at: string;
};

export type Establishment = { id: string; name: string; city: string | null; created_at: string };

export type StaffRoleRow = {
  user_id: string;
  role: StaffRole;
  establishment_id: string | null;
  created_at: string;
};

export type InviteCode = {
  id: string;
  code: string;
  kind: InviteKind;
  establishment_id: string;
  class_label: string | null;
  status: InviteStatus;
  used_by: string | null;
  created_at: string;
  activated_at: string | null;
  used_at: string | null;
};

export type RungenMembership = {
  user_id: string;
  establishment_id: string;
  class_label: string | null;
  invite_code_id: string | null;
  child_consent_at: string;
  created_at: string;
};

export type SupportThread = {
  id: string;
  user_id: string | null;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
};

export type SupportMessage = {
  id: string;
  thread_id: string;
  author_id: string | null;
  body: string;
  attachment_path: string | null;
  created_at: string;
};

type Table<Row, Insert = Row, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        { id: string; pseudo: string; birth_date: string; avatar_url?: string | null },
        Partial<Pick<Profile, 'pseudo' | 'avatar_url' | 'visibility'>>
      >;
      sports: Table<Sport, never, never>;
      custom_sports: Table<CustomSport, { name: string; family: SportFamily; owner_id: string }>;
      favorite_sports: Table<
        FavoriteSport,
        { user_id: string; sport_id?: number | null; custom_sport_id?: string | null }
      >;
      establishments: Table<Establishment, { name: string; city?: string | null }>;
      staff_roles: Table<StaffRoleRow, never, never>;
      invite_codes: Table<InviteCode, never, never>;
      rungen_memberships: Table<RungenMembership, never, never>;
      support_threads: Table<
        SupportThread,
        { user_id: string; category: SupportCategory; subject: string },
        { status: SupportStatus }
      >;
      support_messages: Table<
        SupportMessage,
        { thread_id: string; author_id: string; body: string; attachment_path?: string | null },
        never
      >;
    };
    Views: {
      public_profiles: {
        Row: { id: string; pseudo: string; avatar_url: string | null };
        Relationships: [];
      };
    };
    Functions: {
      check_invite_code: { Args: { p_code: string }; Returns: InviteCheck };
      create_rungen_profile: {
        Args: {
          p_code: string;
          p_pseudo: string;
          p_birth_date: string;
          p_child_consent: boolean;
        };
        Returns: undefined;
      };
      create_staff_profile: {
        Args: { p_code: string; p_pseudo: string; p_birth_date: string };
        Returns: undefined;
      };
      generate_invite_codes: {
        Args: {
          p_establishment: string;
          p_class_label: string | null;
          p_count: number;
          p_kind?: InviteKind;
        };
        Returns: { code: string }[];
      };
      activate_invite_code: { Args: { p_code_id: string }; Returns: undefined };
      deactivate_invite_code: { Args: { p_code_id: string }; Returns: undefined };
      admin_set_account_disabled: { Args: { p_user: string; p_disabled: boolean }; Returns: undefined };
      admin_delete_account: { Args: { p_user: string }; Returns: undefined };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      find_account_by_code: {
        Args: { p_code: string };
        Returns: {
          user_id: string;
          pseudo: string;
          space: Space;
          disabled_at: string | null;
          establishment_name: string;
          class_label: string | null;
          code_status: InviteStatus;
        }[];
      };
    };
    Enums: {
      visibility: Visibility;
      space: Space;
      sport_family: SportFamily;
      pace_unit: PaceUnit;
      staff_role: StaffRole;
      invite_kind: InviteKind;
      invite_status: InviteStatus;
      support_category: SupportCategory;
      support_status: SupportStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
