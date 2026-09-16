import { useState } from 'react';
import { View } from 'react-native';
import { appleDisponible, signInWithApple, signInWithGoogle } from '@/lib/auth';
import { Bouton, Erreur, espace } from '@/ui';

/**
 * Boutons de connexion Google et Apple. L'annulation par l'utilisateur est
 * silencieuse ; les autres échecs affichent un message en français.
 */
export function BoutonsConnexion({ onConnecte }: { onConnecte?: () => void }) {
  const [enCours, setEnCours] = useState<'google' | 'apple' | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function lancer(fournisseur: 'google' | 'apple') {
    setErreur(null);
    setEnCours(fournisseur);
    const resultat = fournisseur === 'google' ? await signInWithGoogle() : await signInWithApple();
    setEnCours(null);
    if (resultat.ok) {
      onConnecte?.();
      return;
    }
    if (!resultat.annule) setErreur(resultat.message);
  }

  return (
    <View style={{ gap: espace.sm }}>
      <Erreur>{erreur}</Erreur>
      <Bouton
        titre="Continuer avec Google"
        onPress={() => lancer('google')}
        enCours={enCours === 'google'}
        desactive={enCours !== null}
      />
      {appleDisponible() ? (
        <Bouton
          titre="Continuer avec Apple"
          variante="secondaire"
          onPress={() => lancer('apple')}
          enCours={enCours === 'apple'}
          desactive={enCours !== null}
        />
      ) : null}
    </View>
  );
}
