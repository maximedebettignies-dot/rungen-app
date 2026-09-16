import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import {
  AIDE_FAMILLE,
  chercher,
  LIBELLE_FAMILLE,
  normaliser,
  suggerer,
  type SportCatalogue,
} from '@/lib/sports';
import type { SportFamily } from '@/lib/database';
import {
  Bouton,
  Carte,
  Champ,
  Chargement,
  couleurs,
  Erreur,
  espace,
  Paragraphe,
  rayon,
  SousTitre,
} from '@/ui';

type Element = SportCatalogue & { perso: boolean; cle: string };

/** Choix des sports favoris : catalogue, recherche et création d'un sport perso. */
export function ChoixSports({ userId }: { userId: string }) {
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [catalogue, setCatalogue] = useState<Element[]>([]);
  const [favoris, setFavoris] = useState<Set<string>>(new Set());
  const [recherche, setRecherche] = useState('');
  const [familleNouvelle, setFamilleNouvelle] = useState<SportFamily | null>(null);
  const [creation, setCreation] = useState(false);

  const charger = useCallback(async () => {
    setErreur(null);
    const [sports, persos, choisis] = await Promise.all([
      supabase.from('sports').select('id, name, family').order('name'),
      supabase.from('custom_sports').select('id, name, family').order('name'),
      supabase.from('favorite_sports').select('sport_id, custom_sport_id'),
    ]);

    const premiereErreur = sports.error ?? persos.error ?? choisis.error;
    if (premiereErreur) {
      setErreur(messageErreur(premiereErreur));
      setChargement(false);
      return;
    }

    setCatalogue([
      ...(sports.data ?? []).map((s) => ({ ...s, perso: false, cle: `s:${s.id}` })),
      ...(persos.data ?? []).map((s) => ({
        id: 0,
        name: s.name,
        family: s.family,
        perso: true,
        cle: `c:${s.id}`,
      })),
    ]);
    setFavoris(
      new Set(
        (choisis.data ?? []).map((f) =>
          f.sport_id ? `s:${f.sport_id}` : `c:${f.custom_sport_id}`,
        ),
      ),
    );
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const resultats = useMemo(() => chercher(recherche, catalogue) as Element[], [recherche, catalogue]);

  const suggestion = useMemo(() => {
    if (!recherche.trim() || resultats.length > 0) return null;
    return suggerer(recherche, catalogue);
  }, [recherche, resultats, catalogue]);

  const dejaPresent = useMemo(
    () => catalogue.some((s) => normaliser(s.name) === normaliser(recherche)),
    [catalogue, recherche],
  );

  async function basculer(element: Element) {
    setErreur(null);
    const etaitFavori = favoris.has(element.cle);
    const [type, identifiant] = element.cle.split(':');

    // Réponse immédiate à l'écran, remise en état si la base refuse.
    setFavoris((precedent) => {
      const copie = new Set(precedent);
      if (etaitFavori) copie.delete(element.cle);
      else copie.add(element.cle);
      return copie;
    });

    const colonne = type === 's' ? 'sport_id' : 'custom_sport_id';
    const valeur = type === 's' ? Number(identifiant) : identifiant;
    const { error } = etaitFavori
      ? await supabase.from('favorite_sports').delete().eq('user_id', userId).eq(colonne, valeur)
      : await supabase
          .from('favorite_sports')
          .insert({ user_id: userId, [colonne]: valeur } as never);

    if (error) {
      setErreur(messageErreur(error));
      setFavoris((precedent) => {
        const copie = new Set(precedent);
        if (etaitFavori) copie.add(element.cle);
        else copie.delete(element.cle);
        return copie;
      });
    }
  }

  async function creerSportPerso() {
    if (!familleNouvelle) return;
    setErreur(null);
    setCreation(true);

    const { data, error } = await supabase
      .from('custom_sports')
      .insert({ owner_id: userId, name: recherche.trim(), family: familleNouvelle })
      .select('id, name, family')
      .single();

    if (error || !data) {
      setCreation(false);
      setErreur(messageErreur(error));
      return;
    }

    const { error: erreurFavori } = await supabase
      .from('favorite_sports')
      .insert({ user_id: userId, custom_sport_id: data.id });
    setCreation(false);

    if (erreurFavori) {
      setErreur(messageErreur(erreurFavori));
      return;
    }

    setRecherche('');
    setFamilleNouvelle(null);
    await charger();
  }

  if (chargement) return <Chargement texte="Chargement des sports…" />;

  const parFamille: SportFamily[] = ['distance', 'duree'];

  return (
    <View style={{ gap: espace.md }}>
      <Erreur>{erreur}</Erreur>

      <Champ
        label="Chercher un sport"
        value={recherche}
        onChangeText={(texte) => {
          setRecherche(texte);
          setFamilleNouvelle(null);
        }}
        autoCorrect={false}
        placeholder="course, escalade, ultimate…"
      />

      {suggestion ? (
        <Carte>
          <Paragraphe>Tu veux dire « {suggestion.name} » ?</Paragraphe>
          <Bouton
            titre={`Ajouter ${suggestion.name}`}
            onPress={() => {
              const element = catalogue.find((s) => s.name === suggestion.name);
              if (element) basculer(element);
              setRecherche('');
            }}
          />
        </Carte>
      ) : null}

      {recherche.trim().length >= 2 && resultats.length === 0 && !dejaPresent ? (
        <Carte>
          <Paragraphe>Créer « {recherche.trim()} »</Paragraphe>
          <SousTitre>Comment mesure-t-on ce sport ?</SousTitre>
          {parFamille.map((famille) => (
            <Pressable
              key={famille}
              accessibilityRole="radio"
              accessibilityState={{ selected: familleNouvelle === famille }}
              onPress={() => setFamilleNouvelle(famille)}
              style={{
                borderWidth: 1,
                borderRadius: rayon.sm,
                borderColor: familleNouvelle === famille ? couleurs.accent : couleurs.bordure,
                padding: espace.md,
                gap: espace.xs,
              }}
            >
              <Text style={{ color: couleurs.texte, fontWeight: '600' }}>
                {LIBELLE_FAMILLE[famille]}
              </Text>
              <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>{AIDE_FAMILLE[famille]}</Text>
            </Pressable>
          ))}
          <Bouton
            titre="Créer ce sport"
            desactive={!familleNouvelle}
            enCours={creation}
            onPress={creerSportPerso}
          />
        </Carte>
      ) : null}

      {parFamille.map((famille) => {
        const elements = resultats.filter((s) => s.family === famille);
        if (elements.length === 0) return null;
        return (
          <View key={famille} style={{ gap: espace.sm }}>
            <SousTitre>{LIBELLE_FAMILLE[famille]}</SousTitre>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espace.sm }}>
              {elements.map((element) => {
                const choisi = favoris.has(element.cle);
                return (
                  <Pressable
                    key={element.cle}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: choisi }}
                    onPress={() => basculer(element)}
                    style={{
                      paddingVertical: espace.sm,
                      paddingHorizontal: espace.md,
                      borderRadius: rayon.lg,
                      borderWidth: 1,
                      borderColor: choisi ? couleurs.accent : couleurs.bordure,
                      backgroundColor: choisi ? couleurs.accent : couleurs.carte,
                    }}
                  >
                    <Text style={{ color: choisi ? couleurs.accentTexte : couleurs.texte }}>
                      {element.name}
                      {element.perso ? ' ·' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
