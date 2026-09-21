import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { prochaineEtapeMfa } from '@/lib/mfa';
import { Bouton, Carte, Champ, Chargement, Ecran, Erreur, espace, Paragraphe, SousTitre, Titre } from '@/ui';
import { QrCode } from '@/ui/qr-code';

type Etape =
  | { nom: 'chargement' }
  | { nom: 'enrolement'; facteur: string; uri: string; secret: string }
  | { nom: 'verification'; facteur: string }
  | { nom: 'ouvert' };

/**
 * Verrou de l'espace d'encadrement : les pouvoirs admin et prof n'existent en
 * base qu'avec un jeton `aal2`. Au premier accès on enrôle une application
 * d'authentification (TOTP) ; ensuite on redemande le code à chaque session.
 */
export function DoubleAuth({ children }: { children: React.ReactNode }) {
  const [etape, setEtape] = useState<Etape>({ nom: 'chargement' });
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const evaluer = useCallback(async () => {
    setErreur(null);
    const { data: niveaux, error: erreurNiveaux } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (erreurNiveaux) {
      setErreur(messageErreur(erreurNiveaux));
      return;
    }
    if (niveaux.currentLevel === 'aal2') {
      setEtape({ nom: 'ouvert' });
      return;
    }

    const { data: facteurs, error: erreurFacteurs } = await supabase.auth.mfa.listFactors();
    if (erreurFacteurs) {
      setErreur(messageErreur(erreurFacteurs));
      return;
    }

    // `facteurs.all` et non `facteurs.totp` : ce dernier omet les enrôlements
    // inachevés, qu'il faut justement purger. Voir `src/lib/mfa.ts`.
    const suite = prochaineEtapeMfa(facteurs.all);
    if (suite.action === 'verifier') {
      setEtape({ nom: 'verification', facteur: suite.facteur });
      return;
    }

    for (const inacheve of suite.aPurger) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: inacheve });
      if (error) {
        setErreur(messageErreur(error));
        return;
      }
    }

    const { data: nouveau, error: erreurEnrolement } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'RUNGEN',
    });
    if (erreurEnrolement || !nouveau) {
      setErreur(messageErreur(erreurEnrolement));
      return;
    }
    setEtape({
      nom: 'enrolement',
      facteur: nouveau.id,
      uri: nouveau.totp.uri,
      secret: nouveau.totp.secret,
    });
  }, []);

  useEffect(() => {
    evaluer();
  }, [evaluer]);

  async function valider(facteur: string) {
    setErreur(null);
    setEnCours(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: facteur, code: code.trim() });
    setEnCours(false);
    if (error) {
      setErreur('Code incorrect ou expiré. Regarde le code affiché en ce moment dans ton application.');
      return;
    }
    setCode('');
    await evaluer();
  }

  if (etape.nom === 'ouvert') return <>{children}</>;
  if (etape.nom === 'chargement' && !erreur) return <Chargement texte="Vérification de sécurité…" />;

  return (
    <Ecran>
      <Titre>Double authentification</Titre>
      <Erreur>{erreur}</Erreur>

      {etape.nom === 'enrolement' ? (
        <>
          <SousTitre>
            Scanne ce QR code avec une application d&apos;authentification (Google Authenticator, Authy,
            1Password…), puis saisis le code à 6 chiffres qu&apos;elle affiche.
          </SousTitre>
          <View style={{ alignItems: 'center', gap: espace.sm }}>
            <QrCode valeur={etape.uri} />
          </View>
          <Carte>
            <Paragraphe>Impossible de scanner ?</Paragraphe>
            <SousTitre>Saisis cette clé à la main : {etape.secret}</SousTitre>
          </Carte>
        </>
      ) : (
        <SousTitre>
          Saisis le code à 6 chiffres affiché par ton application d&apos;authentification.
        </SousTitre>
      )}

      {etape.nom !== 'chargement' ? (
        <>
          <Champ
            label="Code à 6 chiffres"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
          <Bouton
            titre="Valider"
            onPress={() => valider(etape.facteur)}
            enCours={enCours}
            desactive={code.trim().length !== 6}
          />
        </>
      ) : (
        <Bouton titre="Réessayer" onPress={evaluer} />
      )}
    </Ecran>
  );
}
