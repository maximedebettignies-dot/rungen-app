import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { signOut as signOutProviders } from './auth';
import type { Profile, StaffRole } from './database';

type EtatSession = {
  chargement: boolean;
  session: Session | null;
  profil: Profile | null;
  /** Rôle d'encadrement, s'il y en a un (l'onglet admin en dépend). */
  role: StaffRole | null;
  etablissementProf: string | null;
  rafraichirProfil: () => Promise<void>;
  seDeconnecter: () => Promise<void>;
};

const Contexte = createContext<EtatSession | null>(null);

export function FournisseurSession({ children }: { children: React.ReactNode }) {
  const [chargement, setChargement] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profile | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [etablissementProf, setEtablissementProf] = useState<string | null>(null);

  const chargerProfil = useCallback(async (utilisateur: string | null) => {
    if (!utilisateur) {
      setProfil(null);
      setRole(null);
      setEtablissementProf(null);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', utilisateur).maybeSingle(),
      supabase
        .from('staff_roles')
        .select('role, establishment_id')
        .eq('user_id', utilisateur)
        .maybeSingle(),
    ]);
    setProfil(p ?? null);
    setRole(r?.role ?? null);
    setEtablissementProf(r?.establishment_id ?? null);
  }, []);

  useEffect(() => {
    let vivant = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivant) return;
      setSession(data.session);
      await chargerProfil(data.session?.user.id ?? null);
      if (vivant) setChargement(false);
    });

    const { data: abonnement } = supabase.auth.onAuthStateChange(async (evenement, nouvelle) => {
      if (!vivant) return;
      setSession(nouvelle);
      // Le rafraîchissement de jeton ne change ni le profil ni le rôle.
      if (evenement !== 'TOKEN_REFRESHED') await chargerProfil(nouvelle?.user.id ?? null);
    });

    return () => {
      vivant = false;
      abonnement.subscription.unsubscribe();
    };
  }, [chargerProfil]);

  const valeur = useMemo<EtatSession>(
    () => ({
      chargement,
      session,
      profil,
      role,
      etablissementProf,
      rafraichirProfil: () => chargerProfil(session?.user.id ?? null),
      seDeconnecter: async () => {
        await signOutProviders();
        setProfil(null);
        setRole(null);
        setEtablissementProf(null);
      },
    }),
    [chargement, session, profil, role, etablissementProf, chargerProfil],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSession(): EtatSession {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error('useSession doit être utilisé dans <FournisseurSession>.');
  return valeur;
}

/** Niveau d'authentification du jeton courant : `aal2` = double authentification active. */
export function niveauAuth(session: Session | null): 'aal1' | 'aal2' | null {
  if (!session?.access_token) return null;
  try {
    const charge = session.access_token.split('.')[1];
    const json = JSON.parse(
      // décodage base64url sans dépendance native
      decodeURIComponent(
        atob(charge.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join(''),
      ),
    ) as { aal?: string };
    return json.aal === 'aal2' ? 'aal2' : 'aal1';
  } catch {
    return null;
  }
}
