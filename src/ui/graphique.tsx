import { Text, View } from 'react-native';
import { couleurs, espace, rayon } from './theme';

export type Barre = { libelle: string; valeur: number };

/**
 * Barres verticales sur une seule série : pas de légende, le titre nomme la
 * série. Étiquette directe sur la valeur la plus forte plutôt qu'au survol —
 * l'écran est tactile et étroit.
 *
 * Dessiné en `View` plutôt qu'en SVG : `react-native-svg` est un module natif,
 * et l'ajouter obligerait à reconstruire le client de développement pour un
 * graphique que des rectangles suffisent à rendre.
 */
export function GraphiqueBarres({
  barres,
  titre,
  format,
}: {
  barres: Barre[];
  titre: string;
  format: (valeur: number) => string;
}) {
  const HAUTEUR = 92;
  const max = Math.max(...barres.map((b) => b.valeur), 0);
  const indexFort = barres.reduce(
    (meilleur, b, i) => (b.valeur > barres[meilleur].valeur ? i : meilleur),
    0,
  );

  return (
    <View style={{ gap: espace.sm }}>
      <Text style={{ color: couleurs.texteDoux, fontSize: 14, fontWeight: '600' }}>{titre}</Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: espace.xs,
          height: HAUTEUR + 22,
          borderBottomWidth: 1,
          borderBottomColor: couleurs.bordure,
          paddingBottom: 2,
        }}
      >
        {barres.map((b, i) => {
          const actif = b.valeur > 0;
          const hauteur = !actif ? 3 : max === 0 ? 3 : Math.max(6, (b.valeur / max) * HAUTEUR);
          return (
            <View key={`${b.libelle}-${i}`} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              {i === indexFort && actif ? (
                <Text style={{ color: couleurs.texte, fontSize: 10, fontWeight: '600' }}>
                  {format(b.valeur)}
                </Text>
              ) : null}
              <View
                accessibilityLabel={`${b.libelle} : ${format(b.valeur)}`}
                style={{
                  width: '100%',
                  height: hauteur,
                  borderRadius: rayon.sm,
                  backgroundColor: actif ? couleurs.accent : couleurs.bordure,
                }}
              />
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: espace.xs }}>
        {barres.map((b, i) => (
          <Text
            key={`${b.libelle}-libelle-${i}`}
            style={{ flex: 1, textAlign: 'center', color: couleurs.texteDoux, fontSize: 11 }}
          >
            {b.libelle}
          </Text>
        ))}
      </View>
    </View>
  );
}
