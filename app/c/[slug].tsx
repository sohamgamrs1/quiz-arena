import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { api, friendlyError } from '@/lib/api';
import { colors, space, type as typeScale, weight } from '@/lib/tokens';

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
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="back"
          onPress={() => router.replace('/')}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>challenge</Text>
      </View>

      {challenge.isLoading ? (
        <ActivityIndicator color={colors.muted} />
      ) : !challenge.data ? (
        <EmptyState
          icon="link-outline"
          title="this challenge is not live"
          body="the link may have been retired, or the quiz was unpublished."
          actionLabel="back home"
          onAction={() => router.replace('/')}
        />
      ) : (
        <>
          <Card style={styles.card}>
            <Text style={styles.emoji}>{challenge.data.cover_emoji}</Text>
            <Text style={styles.quizTitle}>{challenge.data.title}</Text>
            {challenge.data.description ? (
              <Text style={styles.description}>{challenge.data.description}</Text>
            ) : null}
            <Text style={styles.meta}>
              {challenge.data.question_count} questions · from {challenge.data.owner_name}
            </Text>
          </Card>

          <Text style={styles.note}>
            answers are timed the same way as a live room, but you play alone and the
            questions advance when you are ready.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="start" onPress={() => void play()} loading={busy} icon="play" />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x2,
    marginBottom: space.x4,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -space.x3,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
  },
  card: {
    alignItems: 'center',
    gap: space.x2,
    paddingVertical: space.x8,
  },
  emoji: {
    fontSize: 40,
  },
  quizTitle: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
    textAlign: 'center',
  },
  description: {
    color: colors.muted,
    fontSize: typeScale.sm,
    textAlign: 'center',
  },
  meta: {
    color: colors.muted,
    fontSize: typeScale.xs,
  },
  note: {
    color: colors.muted,
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginVertical: space.x6,
  },
  error: {
    color: colors.danger,
    fontSize: typeScale.sm,
    marginBottom: space.x3,
  },
});
