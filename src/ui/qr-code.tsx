import { useMemo } from 'react';
import { View } from 'react-native';
import { matriceQr, segmentsSombres } from '@/lib/qr';

/**
 * QR code dessiné en `View`, sans module natif — voir `src/lib/qr.ts`.
 *
 * Le fond clair et la marge blanche ne sont pas décoratifs : un lecteur de QR code
 * a besoin du contraste et de la « zone de silence » de quatre modules autour du
 * motif. Sur le fond sombre de l'app, sans eux, rien ne se scanne.
 */
export function QrCode({ valeur, taille = 220 }: { valeur: string; taille?: number }) {
  const matrice = useMemo(() => matriceQr(valeur), [valeur]);

  const MARGE = 4; // en modules, minimum imposé par la norme
  const cote = matrice.length + MARGE * 2;
  const module = taille / cote;

  return (
    <View
      accessibilityLabel="QR code de configuration"
      style={{
        width: taille,
        height: taille,
        backgroundColor: '#FFFFFF',
        padding: MARGE * module,
      }}
    >
      {matrice.map((ligne, y) => (
        <View key={y} style={{ height: module, flexDirection: 'row' }}>
          {segmentsSombres(ligne).map((segment) => (
            <View
              key={segment.debut}
              style={{
                position: 'absolute',
                left: segment.debut * module,
                width: segment.longueur * module,
                height: module,
                backgroundColor: '#000000',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
