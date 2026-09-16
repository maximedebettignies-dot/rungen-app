import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';
import { messageErreur } from './errors';

/**
 * Connexion par jeton natif (`signInWithIdToken`) : l'utilisateur reste dans
 * l'écran système de son téléphone, aucun navigateur n'est ouvert.
 */
export type ResultatConnexion =
  | { ok: true }
  | { ok: false; annule: true }
  | { ok: false; annule: false; message: string };

const ANNULE = { ok: false, annule: true } as const;

let googleConfigure = false;

function configurerGoogle() {
  if (googleConfigure) return;
  GoogleSignin.configure({
    // Toujours l'ID client **Web** : c'est lui que Supabase vérifie.
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  googleConfigure = true;
}

export async function signInWithGoogle(): Promise<ResultatConnexion> {
  try {
    configurerGoogle();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const reponse = await GoogleSignin.signIn();

    if (reponse.type === 'cancelled') return ANNULE;
    const idToken = reponse.data?.idToken;
    if (!idToken) {
      return { ok: false, annule: false, message: 'Google n’a pas renvoyé de jeton. Réessaie.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) return { ok: false, annule: false, message: messageErreur(error) };
    return { ok: true };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return ANNULE;
      if (error.code === statusCodes.IN_PROGRESS) return ANNULE;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          ok: false,
          annule: false,
          message: 'Les services Google Play sont indisponibles sur cet appareil.',
        };
      }
    }
    return { ok: false, annule: false, message: messageErreur(error) };
  }
}

export function appleDisponible(): boolean {
  return Platform.OS === 'ios';
}

export async function signInWithApple(): Promise<ResultatConnexion> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!credential.identityToken) {
      return { ok: false, annule: false, message: 'Apple n’a pas renvoyé de jeton. Réessaie.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) return { ok: false, annule: false, message: messageErreur(error) };
    return { ok: true };
  } catch (error) {
    // Apple signale l'annulation par ce code, sans type dédié.
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return ANNULE;
    return { ok: false, annule: false, message: messageErreur(error) };
  }
}

export async function signOut(): Promise<void> {
  try {
    if (googleConfigure) await GoogleSignin.signOut();
  } catch {
    // Déconnexion Google secondaire : on ferme quand même la session Supabase.
  }
  await supabase.auth.signOut();
}
