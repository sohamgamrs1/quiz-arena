import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { T } from '@/components/ui/T';
import { ensureSession } from '@/lib/auth';
import { MOCK_MODE, hasSupabaseConfig } from '@/lib/supabase';
import { colors, space } from '@/lib/tokens';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

function Message({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.message}>
      <T variant="h2" center>
        {title}
      </T>
      <T variant="meta" center style={styles.body}>
        {body}
      </T>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  });

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

  if (!fontsLoaded) return <View style={styles.blank} />;

  if (!MOCK_MODE && !hasSupabaseConfig) {
    return (
      <Message
        title="No backend configured"
        body="Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then rebuild."
      />
    );
  }

  if (failure) {
    return (
      <Message
        title="Could not start a session"
        body={`${failure}. Check that anonymous sign-ins are enabled in Supabase.`}
      />
    );
  }

  if (!ready) return <View style={styles.blank} />;

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
  blank: { flex: 1, backgroundColor: colors.bg },
  message: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.x8,
    gap: space.x3,
  },
  body: { maxWidth: 340 },
});
