import { supabase } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { GoogleSignin as GoogleSigninType } from '@react-native-google-signin/google-signin';

// Required lazily so the app still launches on a dev build whose binary predates
// the native module. Remove once every install has it.
function getGoogleSignin(): typeof GoogleSigninType {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  // OAuth client IDs are public identifiers, not secrets — safe to ship in the bundle.
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  return GoogleSignin;
}

// Mirrors the Supabase password policy so users see a readable message
// instead of the raw server error listing every required character.
export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  return null;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function sendResetCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function verifySignupCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  if (error) throw error;
}

export async function resendSignupCode(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Permanently deletes the signed-in user's account and all associated data
// (profile, activities, scheduled activities, goals) via cascading foreign keys.
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account');
  if (error) throw new Error(data?.error ?? error.message);
  if (data?.error) throw new Error(data.error);
  await supabase.auth.signOut();
}

export async function signInWithGoogle(): Promise<void> {
  const GoogleSignin = getGoogleSignin();
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (response.type === 'cancelled') throw new Error('User cancelled');

  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('No ID token returned from Google');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
}

export async function signInWithApple(): Promise<void> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error('No identity token from Apple');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(callback: (userId: string | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user?.id ?? null);
  });
}
