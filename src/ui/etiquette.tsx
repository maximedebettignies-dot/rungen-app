import { Text, View } from 'react-native';
import { couleurs, espace, rayon } from './theme';

type Ton = keyof typeof couleurs;

/** Petite étiquette de statut (support, codes d'invitation…). */
export function Etiquette({ texte, ton = 'texteDoux' }: { texte: string; ton?: Ton }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: rayon.sm,
        borderWidth: 1,
        borderColor: couleurs[ton],
        paddingHorizontal: espace.sm,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color: couleurs[ton], fontSize: 12, fontWeight: '600' }}>{texte}</Text>
    </View>
  );
}
