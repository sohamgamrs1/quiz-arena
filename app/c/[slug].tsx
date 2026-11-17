import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Monogram } from '@/components/ui/Monogram';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { api, friendlyError } from '@/lib/api';
import { colors, radius, space } from '@/lib/tokens';

/** Async challenge: the same quiz, at your own pace, in a private room of one. */
export default function Challenge() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const challenge = useQuery({
    queryKey: ['challenge', slug],
    queryFn: () => api.getChallenge(slug ?? ''),
    enabled: Boolean(slug),
  });

  async function play(): Promise<void> {
    if (!slug) return;
    setBusy(true);
    setError(null);
    try {
      const room = await api.startAsync(slug);
      router.replace({ pathname: '/room/[code]/play', params: { code: room.code } });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.replace('/')}
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      {challenge.isLoading ? (
        <ActivityIndicator color={colors.muted} />
      ) : !challenge.data ? (
        <EmptyState icon="link-outline" title="This challenge is not live" body="The link may have been retired." />
      ) : (
        <>
          <View style={styles.card}>
            <Monogram name={challenge.data.title} size={56} square single />
            <T variant="h2" center style={styles.title}>
              {challenge.data.title}
            </T>
            {challenge.data.description ? (
              <T variant="meta" center>
                {challenge.data.description}
              </T>
            ) : null}
            <T variant="label">
              {challenge.data.question_count} QUESTIONS · FROM {challenge.data.owner_name.toUpperCase()}
            </T>
          </View>

          <T variant="meta" style={styles.note}>
            Answers are timed the same way as a live room, but you play alone and advance when you are ready.
          </T>

          {error ? <Notice message={error} /> : null}

          <Button label="Start" onPress={() => void play()} loading={busy} style={styles.action} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -space.x3 },
  card: {
    alignItems: 'center',
    gap: space.x3,
    paddingVertical: space.x8,
    paddingHorizontal: space.x4,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: space.x4,
  },
  title: { marginTop: space.x1 },
  note: { marginVertical: space.x6, lineHeight: 19 },
  action: { marginTop: 'auto' },
});
