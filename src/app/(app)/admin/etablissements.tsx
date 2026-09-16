import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { messageErreur } from '@/lib/errors';
import type { Establishment } from '@/lib/database';
import { Bouton, Carte, Champ, Chargement, couleurs, Ecran, Erreur, SousTitre, Titre } from '@/ui';

export default function Etablissements() {
  const [liste, setListe] = useState<Establishment[]>([]);
  const [nom, setNom] = useState('');
  const [ville, setVille] = useState('');
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('establishments').select('*').order('name');
    if (error) setErreur(messageErreur(error));
    else setListe(data ?? []);
    setChargement(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  async function creer() {
    setErreur(null);
    if (nom.trim().length < 2) {
      setErreur("Donne un nom d'établissement.");
      return;
    }
    setEnCours(true);
    const { error } = await supabase
      .from('establishments')
      .insert({ name: nom.trim(), city: ville.trim() || null });
    setEnCours(false);
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    setNom('');
    setVille('');
    await charger();
  }

  if (chargement) return <Chargement />;

  return (
    <Ecran>
      <Titre>Établissements</Titre>
      <Erreur>{erreur}</Erreur>

      <Champ label="Nom" value={nom} onChangeText={setNom} placeholder="Collège Jean Moulin" />
      <Champ label="Ville" value={ville} onChangeText={setVille} placeholder="Domont" />
      <Bouton titre="Créer l'établissement" onPress={creer} enCours={enCours} />

      <Titre>{liste.length} établissement(s)</Titre>
      {liste.length === 0 ? <SousTitre>Aucun établissement pour l&apos;instant.</SousTitre> : null}
      {liste.map((etablissement) => (
        <Carte key={etablissement.id}>
          <Text style={{ color: couleurs.texte, fontWeight: '600' }}>{etablissement.name}</Text>
          <Text style={{ color: couleurs.texteDoux, fontSize: 13 }}>
            {etablissement.city ?? 'Ville non renseignée'}
          </Text>
        </Carte>
      ))}
    </Ecran>
  );
}
