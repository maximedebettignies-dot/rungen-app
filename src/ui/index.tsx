import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { couleurs, espace, rayon } from './theme';

export { couleurs, espace, rayon };

export function Ecran({ children, style, ...reste }: ViewProps) {
  return (
    <SafeAreaView style={styles.ecran} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.contenu, style]}
        keyboardShouldPersistTaps="handled"
        {...reste}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Titre({ children }: { children: React.ReactNode }) {
  return <Text style={styles.titre}>{children}</Text>;
}

export function SousTitre({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sousTitre}>{children}</Text>;
}

export function Paragraphe({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraphe}>{children}</Text>;
}

export function Erreur({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <View accessibilityRole="alert" style={styles.erreurBoite}>
      <Text style={styles.erreurTexte}>{children}</Text>
    </View>
  );
}

type BoutonProps = {
  titre: string;
  onPress: () => void;
  variante?: 'principal' | 'secondaire' | 'danger';
  enCours?: boolean;
  desactive?: boolean;
};

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  enCours = false,
  desactive = false,
}: BoutonProps) {
  const inactif = desactive || enCours;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif, busy: enCours }}
      disabled={inactif}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bouton,
        variante === 'secondaire' && styles.boutonSecondaire,
        variante === 'danger' && styles.boutonDanger,
        inactif && styles.boutonInactif,
        pressed && styles.boutonPresse,
      ]}
    >
      {enCours ? (
        <ActivityIndicator color={couleurs.accentTexte} />
      ) : (
        <Text
          style={[styles.boutonTexte, variante === 'secondaire' && styles.boutonTexteSecondaire]}
        >
          {titre}
        </Text>
      )}
    </Pressable>
  );
}

export function Champ({ label, aide, ...reste }: TextInputProps & { label: string; aide?: string }) {
  return (
    <View style={styles.champ}>
      <Text style={styles.champLabel}>{label}</Text>
      <TextInput
        style={styles.champSaisie}
        placeholderTextColor={couleurs.texteDoux}
        accessibilityLabel={label}
        {...reste}
      />
      {aide ? <Text style={styles.champAide}>{aide}</Text> : null}
    </View>
  );
}

export function Carte({ children, style, ...reste }: ViewProps) {
  return (
    <View style={[styles.carte, style]} {...reste}>
      {children}
    </View>
  );
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <View style={styles.chargement}>
      <ActivityIndicator color={couleurs.accent} size="large" />
      <Text style={styles.sousTitre}>{texte}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espace.lg, gap: espace.md, flexGrow: 1 },
  titre: { color: couleurs.texte, fontSize: 26, fontWeight: '700' },
  sousTitre: { color: couleurs.texteDoux, fontSize: 16, lineHeight: 22 },
  paragraphe: { color: couleurs.texte, fontSize: 16, lineHeight: 24 },
  erreurBoite: {
    backgroundColor: '#3A1D20',
    borderColor: couleurs.danger,
    borderWidth: 1,
    borderRadius: rayon.sm,
    padding: espace.md,
  },
  erreurTexte: { color: '#FFC9CB', fontSize: 15, lineHeight: 21 },
  bouton: {
    backgroundColor: couleurs.accent,
    borderRadius: rayon.md,
    paddingVertical: 16,
    paddingHorizontal: espace.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  boutonSecondaire: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  boutonDanger: { backgroundColor: couleurs.danger },
  boutonInactif: { opacity: 0.5 },
  boutonPresse: { opacity: 0.8 },
  boutonTexte: { color: couleurs.accentTexte, fontSize: 17, fontWeight: '600' },
  boutonTexteSecondaire: { color: couleurs.texte },
  champ: { gap: espace.xs },
  champLabel: { color: couleurs.texteDoux, fontSize: 14, fontWeight: '600' },
  champSaisie: {
    backgroundColor: couleurs.carte,
    borderColor: couleurs.bordure,
    borderWidth: 1,
    borderRadius: rayon.sm,
    color: couleurs.texte,
    fontSize: 17,
    padding: espace.md,
    minHeight: 52,
  },
  champAide: { color: couleurs.texteDoux, fontSize: 13 },
  carte: {
    backgroundColor: couleurs.carte,
    borderColor: couleurs.bordure,
    borderWidth: 1,
    borderRadius: rayon.md,
    padding: espace.md,
    gap: espace.sm,
  },
  chargement: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace.md,
    backgroundColor: couleurs.fond,
  },
});
