import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import {
  arreter,
  dureeEcouleeS,
  enPause,
  estOublie,
  mettreEnPause,
  reprendre,
  type Chrono,
} from '@/lib/chrono';
import {
  ecrireSeanceEnCours,
  effacerSeanceEnCours,
  lireSeanceEnCours,
  type SportChoisi,
} from '@/lib/seances';
import { Bouton, Carte, Chargement, couleurs, Ecran, espace, Paragraphe, SousTitre, Titre } from '@/ui';

/** Durée affichée en `h:mm:ss` ou `mm:ss`, arrondie avant découpe. */
function horloge(totalS: number): string {
  const t = Math.max(0, Math.round(totalS));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const deux = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${deux(m)}:${deux(s)}` : `${m}:${deux(s)}`;
}

/**
 * Écran de chronométrage.
 *
 * L'affichage se rafraîchit chaque seconde, mais ne **compte** pas : il relit la
 * durée calculée depuis l'instant de départ (voir `src/lib/chrono.ts`). Si le
 * système suspend ou tue l'app, rien n'est perdu — la séance est relue sur disque.
 */
export default function Chronometre() {
  const router = useRouter();
  useKeepAwake();

  const [sport, setSport] = useState<SportChoisi | null>(null);
  const [chrono, setChrono] = useState<Chrono | null>(null);
  const [chargement, setChargement] = useState(true);
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const dernierEcrit = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      lireSeanceEnCours().then((s) => {
        if (!vivant) return;
        if (s) {
          setSport(s.sport);
          setChrono(s.chrono);
        }
        setChargement(false);
      });
      return () => {
        vivant = false;
      };
    }, []),
  );

  // Un battement d'une seconde pour l'affichage seul. Au retour au premier plan on
  // recale tout de suite, sans attendre le prochain battement.
  useEffect(() => {
    const battement = setInterval(() => setMaintenant(Date.now()), 1000);
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') setMaintenant(Date.now());
    });
    return () => {
      clearInterval(battement);
      abonnement.remove();
    };
  }, []);

  async function enregistrerEtat(c: Chrono, s: SportChoisi) {
    dernierEcrit.current = Date.now();
    await ecrireSeanceEnCours({ sport: s, chrono: c });
  }

  if (chargement) return <Chargement texte="Reprise de ta séance…" />;

  if (!sport || !chrono) {
    return (
      <Ecran>
        <Titre>Chronomètre</Titre>
        <Carte>
          <SousTitre>
            Choisis ton sport sur l&apos;écran précédent, puis lance le chronomètre.
          </SousTitre>
          <Bouton titre="Retour" onPress={() => router.back()} />
        </Carte>
      </Ecran>
    );
  }

  const ecouleS = dureeEcouleeS(chrono, maintenant);
  const pause = enPause(chrono);
  const oubli = estOublie(chrono, maintenant);

  function basculerPause() {
    if (!sport || !chrono) return;
    const suivant = pause ? reprendre(chrono, Date.now()) : mettreEnPause(chrono, Date.now());
    setChrono(suivant);
    enregistrerEtat(suivant, sport);
  }

  function terminer() {
    if (!sport || !chrono) return;
    const dureeS = arreter(chrono, Date.now());
    effacerSeanceEnCours();
    router.replace({
      pathname: '/(app)/activite',
      params: {
        dureeS: String(dureeS),
        sportCle: sport.cle,
        // Une durée issue du chronomètre n'est pas retouchable — sauf si le
        // chronomètre a manifestement été oublié, auquel cas la mesure ne veut
        // plus rien dire et c'est à l'élève de trancher.
        modifiable: oubli ? '1' : '0',
      },
    });
  }

  function abandonner() {
    effacerSeanceEnCours();
    router.replace('/(app)/activite');
  }

  return (
    <Ecran>
      <SousTitre>{sport.nom}</SousTitre>

      <View style={{ alignItems: 'center', paddingVertical: espace.lg }}>
        <Text
          accessibilityLabel={`Durée écoulée : ${horloge(ecouleS)}`}
          style={{
            color: pause ? couleurs.texteDoux : couleurs.texte,
            fontSize: 64,
            fontWeight: '200',
            fontVariant: ['tabular-nums'],
          }}
        >
          {horloge(ecouleS)}
        </Text>
        <Text style={{ color: couleurs.texteDoux, marginTop: espace.xs }}>
          {pause ? 'En pause' : 'En cours'}
        </Text>
      </View>

      {oubli ? (
        <Carte>
          <Paragraphe>Ce chronomètre tourne depuis plus de six heures.</Paragraphe>
          <SousTitre>
            Tu l&apos;as peut-être oublié. Tu pourras corriger la durée avant d&apos;enregistrer.
          </SousTitre>
        </Carte>
      ) : null}

      <Bouton titre={pause ? 'Reprendre' : 'Mettre en pause'} variante="secondaire" onPress={basculerPause} />
      <Bouton titre="Terminer la séance" onPress={terminer} />
      <Pressable accessibilityRole="button" onPress={abandonner} style={{ paddingVertical: espace.md }}>
        <Text style={{ color: couleurs.texteDoux, textAlign: 'center' }}>Abandonner cette séance</Text>
      </Pressable>
    </Ecran>
  );
}
