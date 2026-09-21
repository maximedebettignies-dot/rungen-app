import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSession } from '@/lib/session';
import { couleurs } from '@/ui';

/**
 * Onglets de l'app. L'onglet admin n'apparaît que pour un compte encadrant ;
 * ses pouvoirs restent conditionnés à la double authentification, vérifiée en base.
 */
export default function AppLayout() {
  const { role } = useSession();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: couleurs.fond },
        headerTintColor: couleurs.texte,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: couleurs.fond },
        tabBarStyle: { backgroundColor: couleurs.carte, borderTopColor: couleurs.bordure },
        tabBarActiveTintColor: couleurs.accent,
        tabBarInactiveTintColor: couleurs.texteDoux,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>●</Text>,
        }}
      />
      <Tabs.Screen
        name="activite"
        options={{
          title: 'Activité',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>＋</Text>,
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Support',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✉</Text>,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          headerShown: false,
          href: role ? undefined : null,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>★</Text>,
        }}
      />
      <Tabs.Screen
        name="reglages"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙</Text>,
        }}
      />
    </Tabs>
  );
}
