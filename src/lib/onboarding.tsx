import { createContext, useContext, useMemo, useState } from 'react';
import type { Space } from './database';

/**
 * Ce qui est saisi avant que le profil n'existe en base : le parcours choisi,
 * le code RUNGEN et la date de naissance. Volontairement en mémoire seulement —
 * si l'app est fermée en cours d'inscription, rien n'est conservé (spec :
 * « âge insuffisant : aucune donnée conservée »).
 */
type Inscription = {
  parcours: Space;
  code: string | null;
  dateNaissance: string | null;
  consentementEnfant: boolean;
};

const DEPART: Inscription = {
  parcours: 'public',
  code: null,
  dateNaissance: null,
  consentementEnfant: false,
};

type EtatInscription = Inscription & {
  definir: (champs: Partial<Inscription>) => void;
  reinitialiser: () => void;
};

const Contexte = createContext<EtatInscription | null>(null);

export function FournisseurInscription({ children }: { children: React.ReactNode }) {
  const [etat, setEtat] = useState<Inscription>(DEPART);

  const valeur = useMemo<EtatInscription>(
    () => ({
      ...etat,
      definir: (champs) => setEtat((precedent) => ({ ...precedent, ...champs })),
      reinitialiser: () => setEtat(DEPART),
    }),
    [etat],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useInscription(): EtatInscription {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error('useInscription doit être utilisé dans <FournisseurInscription>.');
  return valeur;
}
