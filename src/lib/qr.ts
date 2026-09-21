import qrcode from 'qrcode-generator';

/**
 * Génération d'un QR code sans dépendance native.
 *
 * Supabase renvoie déjà un QR code à l'enrôlement TOTP, mais sous forme de SVG :
 * le composant `Image` de React Native ne sait pas l'afficher et laisse un carré
 * blanc. On regénère donc la matrice ici, à partir de l'URI `otpauth://`, pour la
 * dessiner avec des `View` — comme le graphique des stats, et pour la même raison :
 * ajouter un module natif obligerait à reconstruire l'application.
 */

export type Segment = { debut: number; longueur: number };

/** Matrice carrée des modules : `true` = module sombre. */
export function matriceQr(texte: string): boolean[][] {
  if (texte.length === 0) throw new Error('qr_texte_vide');

  // 0 = le nombre de versions est choisi automatiquement selon la longueur.
  // Niveau M : 15 % de redondance, le compromis habituel pour un écran.
  const code = qrcode(0, 'M');
  code.addData(texte);
  code.make();

  const taille = code.getModuleCount();
  const matrice: boolean[][] = [];
  for (let ligne = 0; ligne < taille; ligne += 1) {
    const colonnes: boolean[] = [];
    for (let colonne = 0; colonne < taille; colonne += 1) {
      colonnes.push(code.isDark(ligne, colonne));
    }
    matrice.push(colonnes);
  }
  return matrice;
}

/**
 * Regroupe les modules sombres contigus d'une ligne.
 *
 * Un QR code de cette taille compte près de 1 400 modules ; une `View` par module
 * ferait ramer l'écran. Un rectangle par suite de modules en divise le nombre par
 * cinq environ, pour un rendu identique.
 */
export function segmentsSombres(ligne: readonly boolean[]): Segment[] {
  const segments: Segment[] = [];
  let debut: number | null = null;

  for (let i = 0; i < ligne.length; i += 1) {
    if (ligne[i] && debut === null) debut = i;
    if (!ligne[i] && debut !== null) {
      segments.push({ debut, longueur: i - debut });
      debut = null;
    }
  }
  if (debut !== null) segments.push({ debut, longueur: ligne.length - debut });

  return segments;
}
