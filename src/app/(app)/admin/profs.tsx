import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import type { Establishment, InviteCode } from '@/lib/database';
import {
  Bouton,
  Carte,
  Chargement,
  couleurs,
  Ecran,
  Erreur,
  espace,
  Paragraphe,
  rayon,
  SousTitre,
  Titre,
} from '@/ui';
import { Etiquette } from '@/ui/etiquette';

export default function Profs() {
  const [etablissements, setEtablissements] = useState<Establishment[]>([]);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [etablissement, setEtablissement] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [{ data: etabs }, { data: liste, error }] = await Promise.all([
      supabase.from('establishments').select('*').order('name'),
      supabase
        .from('invite_codes')
        .select('*')
        .eq('kind', 'prof_eps')
        .order('created_at', { ascending: false }),
    ]);
    if (error) setErreur(messageErreur(error));
    setEtablissements(etabs ?? []);
    setCodes(liste ?? []);
    setEtablissement((actuel) => actuel ?? etabs?.[0]?.id ?? null);
    setChargement(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  async function genererCode() {
    if (!etablissement) return;
    setErreur(null);
    setEnCours(true);
    const { error } = await supabase.rpc('generate_invite_codes', {
      p_establishment: etablissement,
      p_class_label: null,
      p_count: 1,
      p_kind: 'prof_eps',
    });
    setEnCours(false);
    if (error) setErreur(messageErreur(error));
    await charger();
  }

  if (chargement) return <Chargement />;

  return (
    <Ecran>
      <Titre>Profs d&apos;EPS</Titre>
      <SousTitre>
        Un code encadrant est actif dès sa création : transmets-le en main propre. Le compte doit
        être majeur, et ne verra que son établissement.
      </SousTitre>
      <Erreur>{erreur}</Erreur>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espace.sm }}>
        {etablissements.map((e) => {
          const actif = etablissement === e.id;
          return (
            <Pressable
              key={e.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              onPress={() => setEtablissement(e.id)}
              style={{
                paddingVertical: espace.sm,
                paddingHorizontal: espace.md,
                borderRadius: rayon.lg,
                borderWidth: 1,
                borderColor: actif ? couleurs.accent : couleurs.bordure,
                backgroundColor: actif ? couleurs.accent : couleurs.carte,
              }}
            >
              <Text style={{ color: actif ? couleurs.accentTexte : couleurs.texte }}>{e.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Bouton
        titre="Générer un code prof"
        onPress={genererCode}
        enCours={enCours}
        desactive={!etablissement}
      />

      <Titre>Codes encadrants</Titre>
      {codes.length === 0 ? <SousTitre>Aucun code pour l&apos;instant.</SousTitre> : null}
      {codes.map((code) => (
        <Carte key={code.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: espace.sm }}>
            <Text style={{ color: couleurs.texte, fontWeight: '700', letterSpacing: 2 }}>
              {code.code}
            </Text>
            <Etiquette
              texte={code.status === 'utilise' ? 'Utilisé' : code.status === 'actif' ? 'Actif' : 'Désactivé'}
              ton={code.status === 'actif' ? 'succes' : 'texteDoux'}
            />
          </View>
          <Paragraphe>
            {etablissements.find((e) => e.id === code.establishment_id)?.name ?? 'Établissement'}
          </Paragraphe>
        </Carte>
      ))}
    </Ecran>
  );
}
