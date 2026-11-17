import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ensureSession } from '@/lib/auth';
import { MOCK_MODE, hasSupabaseConfig } from '@/lib/supabase';
import { colors, space, type as typeScale, weight } from '@/lib/tokens';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

function SetupNeeded() {
  return (
    <View style={styles.setup}>
      <Text style={styles.setupTitle}>quiz arena needs a backend</Text>
      <Text style={styles.setupBody}>
        Copy .env.example to .env, add EXPO_PUBLIC_SUPABASE_URL and
        EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart. To click through the UI with no
        backend at all, set EXPO_PUBLIC_MOCK=1.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(MOCK_MODE);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (MOCK_MODE || !hasSupabaseConfig) return;
    let cancelled = false;
    ensureSession()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setFailure(err instanceof Error ? err.message : 'sign-in failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!MOCK_MODE && !hasSupabaseConfig) return <SetupNeeded />;

  if (failure) {
    return (
      <View style={styles.setup}>
        <Text style={styles.setupTitle}>could not start a session</Text>
        <Text style={styles.setupBody}>{failure}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.setup}>
        <Text style={styles.setupBody}>starting…</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
            }}
          />
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  setup: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.x6,
    gap: space.x3,
  },
  setupTitle: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
    textAlign: 'center',
  },
  setupBody: {
    color: colors.muted,
    fontSize: typeScale.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 380,
  },
});
