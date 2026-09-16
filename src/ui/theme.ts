/** Palette et espacements de l'app. Une seule source pour tous les écrans. */
export const couleurs = {
  fond: '#0E1116',
  carte: '#181D26',
  bordure: '#2A313D',
  texte: '#F2F5F9',
  texteDoux: '#9AA6B8',
  accent: '#208AEF',
  accentTexte: '#FFFFFF',
  danger: '#E5484D',
  succes: '#30A46C',
  alerte: '#F5A623',
} as const;

export const espace = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const rayon = { sm: 8, md: 12, lg: 20 } as const;
