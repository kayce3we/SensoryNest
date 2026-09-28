import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { ActivitiesProvider } from '@/context/ActivitiesContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications, syncEmptyReminders } from '@/lib/notifications';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, userId } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [profileChecked, setProfileChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!session || !userId) { setProfileChecked(true); setNeedsOnboarding(false); return; }
    supabase.from('profiles').select('child_name').eq('id', userId).single()
      .then(({ data, error }) => {
        if (error || !data) {
          // Profile doesn't exist — stale session, sign out
          supabase.auth.signOut();
          setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(!data.child_name);
        }
        setProfileChecked(true);
      });
  }, [session, userId]);

  useEffect(() => {
    if (loading || !profileChecked) return;
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'reset-password' || segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    if (!session && !inAuthGroup) { router.replace('/login'); return; }
    if (session && segments[0] === 'login') {
      router.replace(needsOnboarding ? '/onboarding' : '/(tabs)');
      return;
    }
    if (session && needsOnboarding && !inOnboarding && !inAuthGroup) {
      // If already in tabs, re-fetch profile before redirecting — avoids false
      // bounce-back right after onboarding saves and navigates to /(tabs)
      if (segments[0] === '(tabs)' && userId) {
        supabase.from('profiles').select('child_name').eq('id', userId).single()
          .then(({ data }) => {
            if (data?.child_name) setNeedsOnboarding(false);
            else router.replace('/onboarding');
          });
      } else {
        router.replace('/onboarding');
      }
    }
  }, [session, loading, segments, profileChecked, needsOnboarding]);

  useEffect(() => {
    if (session && userId) {
      registerForPushNotifications(userId).catch(console.error);
      syncEmptyReminders(userId).catch(console.error);
    }
  }, [session, userId]);

  if (loading || (session && !profileChecked)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ActivitiesProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="schedule" />
            <Stack.Screen name="new-activity" />
            <Stack.Screen name="edit-activity" />
            <Stack.Screen name="week" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="auth/confirm" />
            <Stack.Screen name="onboarding" />
          </Stack>
        </AuthGate>
      </ActivitiesProvider>
    </AuthProvider>
  );
}
