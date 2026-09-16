import { Redirect } from 'expo-router';

/** L'aiguillage de `_layout.tsx` décide de la suite ; cet écran ne fait que rediriger. */
export default function Index() {
  return <Redirect href="/bienvenue" />;
}
