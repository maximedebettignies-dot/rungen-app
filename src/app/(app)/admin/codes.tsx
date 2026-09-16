import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import { htmlAutorisations } from '@/lib/autorisation';
import type { Establishment, InviteCode, InviteStatus } from '@/lib/database';
import { useSession } from '@/lib/session';
import {
  Bouton,
  Carte,
  Champ,
  Chargement,
  couleurs,
  Ecran,
  Erreur,
  espace,
  rayon,
  SousTitre,
  Titre,
} from '@/ui';
import { Etiquette } from '@/ui/etiquette';

const LIBELLE_STATUT: Record<InviteStatus, string> = {
  cree: 'En attente du papier',
  actif: 'Actif',
  utilise: 'Utilisé',
  desactive: 'Désactivé',
};

const TON_STATUT: Record<InviteStatus, 'alerte' | 'succes' | 'texteDoux' | 'danger'> = {
  cree: 'alerte',
  actif: 'succes',
  utilise: 'texteDoux',
  desactive: 'danger',
};

const FILTRES: (InviteStatus | 'tous')[] = ['tous', 'cree', 'actif', 'utilise', 'desactive'];

export default function Codes() {
  const { role } = useSession();
  const [etablissements, setEtablissements] = useState<Establishment[]>([]);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [etablissement, setEtablissement] = useState<string | null>(null);
  const [classe, setClasse] = useState('');
  const [nombre, setNombre] = useState('25');
  const [filtre, setFiltre] = useState<InviteStatus | 'tous'>('tous');
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [{ data: etabs }, { data: liste, error }] = await Promise.all([
      supabase.from('establishments').select('*').order('name'),
      supabase
        .from('invite_codes')
        .select('*')
        .eq('kind', 'eleve')
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

  const visibles = useMemo(
    () => (filtre === 'tous' ? codes : codes.filter((code) => code.status === filtre)),
    [codes, filtre],
  );

  const nomEtablissement = useCallback(
    (id: string) => etablissements.find((e) => e.id === id)?.name ?? 'Établissement',
    [etablissements],
  );

  async function genererEtImprimer() {
    setErreur(null);
    if (!etablissement) {
      setErreur("Crée d'abord un établissement.");
      return;
    }
    const combien = Number(nombre);
    if (!Number.isInteger(combien) || combien < 1 || combien > 60) {
      setErreur('Choisis un nombre de codes entre 1 et 60.');
      return;
    }

    setEnCours(true);
    const { data, error } = await supabase.rpc('generate_invite_codes', {
      p_establishment: etablissement,
      p_class_label: classe.trim() || null,
      p_count: combien,
    });

    if (error || !data) {
      setEnCours(false);
      setErreur(messageErreur(error));
      return;
    }

    try {
      const html = htmlAutorisations(
        data.map((ligne) => ligne.code),
        { etablissement: nomEtablissement(etablissement), classe: classe.trim() || null },
      );
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      }
    } catch (erreurPdf) {
      // Les codes existent : on le dit clairement plutôt que de laisser croire à un échec.
      setErreur(
        `Les ${data.length} codes ont bien été créés, mais le PDF n'a pas pu être produit : ${
          messageErreur(erreurPdf)
        }`,
      );
    } finally {
      setEnCours(false);
      await charger();
    }
  }

  async function agir(code: InviteCode, action: 'activer' | 'desactiver') {
    setErreur(null);
    const { error } = await supabase.rpc(
      action === 'activer' ? 'activate_invite_code' : 'deactivate_invite_code',
      { p_code_id: code.id },
    );
    if (error) setErreur(messageErreur(error));
    await charger();
  }

  if (chargement) return <Chargement />;

  return (
    <Ecran>
      <Titre>Codes d&apos;invitation</Titre>

      {role === 'admin' ? (
        <>
          <SousTitre>
            Génère un lot par classe. Le PDF sort avec une autorisation par page, code compris.
          </SousTitre>
          <Erreur>{erreur}</Erreur>

          <SousTitre>Établissement</SousTitre>
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

          <Champ label="Classe" value={classe} onChangeText={setClasse} placeholder="6e B" />
          <Champ
            label="Nombre de codes"
            value={nombre}
            onChangeText={setNombre}
            keyboardType="number-pad"
            maxLength={2}
            aide="Entre 1 et 60."
          />
          <Bouton
            titre="Générer le lot et imprimer"
            onPress={genererEtImprimer}
            enCours={enCours}
            desactive={etablissements.length === 0}
          />
        </>
      ) : (
        <Erreur>{erreur}</Erreur>
      )}

      <Titre>Suivi</Titre>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espace.sm }}>
        {FILTRES.map((valeur) => {
          const actif = filtre === valeur;
          return (
            <Pressable
              key={valeur}
              onPress={() => setFiltre(valeur)}
              style={{
                paddingVertical: espace.xs,
                paddingHorizontal: espace.md,
                borderRadius: rayon.lg,
                borderWidth: 1,
                borderColor: actif ? couleurs.accent : couleurs.bordure,
              }}
            >
              <Text style={{ color: actif ? couleurs.accent : couleurs.texteDoux, fontSize: 13 }}>
                {valeur === 'tous' ? 'Tous' : LIBELLE_STATUT[valeur]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {visibles.length === 0 ? <SousTitre>Aucun code dans ce filtre.</SousTitre> : null}

      {visibles.map((code) => (
        <Carte key={code.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: espace.sm }}>
            <Text
              style={{
                color: couleurs.texte,
                fontWeight: '700',
                letterSpacing: 2,
                fontVariant: ['tabular-nums'],
              }}
            >
              {code.code}
            </Text>
            <Etiquette texte={LIBELLE_STATUT[code.status]} ton={TON_STATUT[code.status]} />
          </View>
          <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>
            {nomEtablissement(code.establishment_id)}
            {code.class_label ? ` · ${code.class_label}` : ''}
          </Text>

          {role === 'admin' && code.status === 'cree' ? (
            <Bouton titre="Autorisation reçue" onPress={() => agir(code, 'activer')} />
          ) : null}
          {role === 'admin' && (code.status === 'cree' || code.status === 'actif') ? (
            <Bouton titre="Désactiver" variante="secondaire" onPress={() => agir(code, 'desactiver')} />
          ) : null}
        </Carte>
      ))}
    </Ecran>
  );
}
