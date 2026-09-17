// Généré depuis le projet Supabase : `npm run types:gen`.
// Ne pas modifier à la main. Les alias utilisés par l'app sont dans `database.ts`.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      banned_words: {
        Row: {
          word: string
        }
        Insert: {
          word: string
        }
        Update: {
          word?: string
        }
        Relationships: []
      }
      custom_sports: {
        Row: {
          created_at: string
          family: Database["public"]["Enums"]["sport_family"]
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          family: Database["public"]["Enums"]["sport_family"]
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          family?: Database["public"]["Enums"]["sport_family"]
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_sports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_sports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      favorite_sports: {
        Row: {
          created_at: string
          custom_sport_id: string | null
          id: string
          sport_id: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_sport_id?: string | null
          id?: string
          sport_id?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          custom_sport_id?: string | null
          id?: string
          sport_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_sports_custom_sport_id_fkey"
            columns: ["custom_sport_id"]
            isOneToOne: false
            referencedRelation: "custom_sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_sports_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_sports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_sports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          activated_at: string | null
          class_label: string | null
          code: string
          created_at: string
          establishment_id: string
          id: string
          kind: Database["public"]["Enums"]["invite_kind"]
          status: Database["public"]["Enums"]["invite_status"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          activated_at?: string | null
          class_label?: string | null
          code: string
          created_at?: string
          establishment_id: string
          id?: string
          kind?: Database["public"]["Enums"]["invite_kind"]
          status?: Database["public"]["Enums"]["invite_status"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          activated_at?: string | null
          class_label?: string | null
          code?: string
          created_at?: string
          establishment_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["invite_kind"]
          status?: Database["public"]["Enums"]["invite_status"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string
          created_at: string
          disabled_at: string | null
          id: string
          pseudo: string
          space: Database["public"]["Enums"]["space"]
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          avatar_url?: string | null
          birth_date: string
          created_at?: string
          disabled_at?: string | null
          id: string
          pseudo: string
          space?: Database["public"]["Enums"]["space"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string
          created_at?: string
          disabled_at?: string | null
          id?: string
          pseudo?: string
          space?: Database["public"]["Enums"]["space"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: []
      }
      rungen_memberships: {
        Row: {
          child_consent_at: string
          class_label: string | null
          created_at: string
          establishment_id: string
          invite_code_id: string | null
          user_id: string
        }
        Insert: {
          child_consent_at: string
          class_label?: string | null
          created_at?: string
          establishment_id: string
          invite_code_id?: string | null
          user_id: string
        }
        Update: {
          child_consent_at?: string
          class_label?: string | null
          created_at?: string
          establishment_id?: string
          invite_code_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rungen_memberships_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rungen_memberships_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rungen_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rungen_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          family: Database["public"]["Enums"]["sport_family"]
          id: number
          name: string
          pace_unit: Database["public"]["Enums"]["pace_unit"]
          slug: string
        }
        Insert: {
          family: Database["public"]["Enums"]["sport_family"]
          id?: never
          name: string
          pace_unit?: Database["public"]["Enums"]["pace_unit"]
          slug: string
        }
        Update: {
          family?: Database["public"]["Enums"]["sport_family"]
          id?: never
          name?: string
          pace_unit?: Database["public"]["Enums"]["pace_unit"]
          slug?: string
        }
        Relationships: []
      }
      staff_roles: {
        Row: {
          created_at: string
          establishment_id: string | null
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          establishment_id?: string | null
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_path: string | null
          author_id: string | null
          body: string
          created_at: string
          id: string
          thread_id: string
        }
        Insert: {
          attachment_path?: string | null
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          thread_id: string
        }
        Update: {
          attachment_path?: string | null
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          category: Database["public"]["Enums"]["support_category"]
          created_at: string
          id: string
          status: Database["public"]["Enums"]["support_status"]
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["support_category"]
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["support_status"]
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["support_category"]
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["support_status"]
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          id: string | null
          pseudo: string | null
        }
        Insert: {
          avatar_url?: string | null
          id?: string | null
          pseudo?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string | null
          pseudo?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_invite_code: { Args: { p_code_id: string }; Returns: undefined }
      admin_delete_account: { Args: { p_user: string }; Returns: undefined }
      admin_set_account_disabled: {
        Args: { p_disabled: boolean; p_user: string }
        Returns: undefined
      }
      age_on: { Args: { birth: string; ref?: string }; Returns: number }
      check_invite_code: { Args: { p_code: string }; Returns: string }
      contains_banned_word: { Args: { input: string }; Returns: boolean }
      create_rungen_profile: {
        Args: {
          p_birth_date: string
          p_child_consent: boolean
          p_code: string
          p_pseudo: string
        }
        Returns: undefined
      }
      create_staff_profile: {
        Args: { p_birth_date: string; p_code: string; p_pseudo: string }
        Returns: undefined
      }
      deactivate_invite_code: {
        Args: { p_code_id: string }
        Returns: undefined
      }
      delete_my_account: { Args: never; Returns: undefined }
      effective_visibility: {
        Args: {
          birth: string
          chosen: Database["public"]["Enums"]["visibility"]
        }
        Returns: Database["public"]["Enums"]["visibility"]
      }
      find_account_by_code: {
        Args: { p_code: string }
        Returns: {
          class_label: string
          code_status: Database["public"]["Enums"]["invite_status"]
          disabled_at: string
          establishment_name: string
          pseudo: string
          space: Database["public"]["Enums"]["space"]
          user_id: string
        }[]
      }
      generate_invite_codes: {
        Args: {
          p_class_label: string
          p_count: number
          p_establishment: string
          p_kind?: Database["public"]["Enums"]["invite_kind"]
        }
        Returns: {
          code: string
        }[]
      }
      has_mfa: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_minor: { Args: { birth: string }; Returns: boolean }
      is_staff: { Args: { uid: string }; Returns: boolean }
      min_registration_age: {
        Args: { s: Database["public"]["Enums"]["space"] }
        Returns: number
      }
      my_prof_establishment: { Args: never; Returns: string }
      my_space: { Args: never; Returns: Database["public"]["Enums"]["space"] }
      storage_owner: { Args: { chemin: string }; Returns: string }
    }
    Enums: {
      invite_kind: "eleve" | "prof_eps"
      invite_status: "cree" | "actif" | "utilise" | "desactive"
      pace_unit: "min_per_km" | "km_per_h" | "min_per_100m" | "none"
      space: "public" | "rungen"
      sport_family: "distance" | "duree"
      staff_role: "admin" | "prof_eps"
      support_category: "probleme" | "idee" | "autre"
      support_status: "nouveau" | "en_cours" | "resolu"
      visibility: "public" | "amis" | "prive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
