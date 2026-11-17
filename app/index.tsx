import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { api, friendlyError } from '@/lib/api';
import { loadProfile } from '@/lib/auth';
import { readHistory, type HistoryEntry } from '@/lib/history';
import type { QuizSummary } from '@/lib/types';
import { colors, space, type as typeScale, weight } from '@/lib/tokens';

export default function Home() {
  const router = useRouter();
  const [hosting, setHosting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = useQuery({ queryKey: ['profile'], queryFn: loadProfile });
  const quizzes = useQuery({ queryKey: ['quizzes'], queryFn: api.listQuizzes });
  const history = useQuery({ queryKey: ['history'], queryFn: readHistory });

  const list: QuizSummary[] = quizzes.data ?? [];
  const published = list.filter((quiz) => quiz.status === 'published');

  async function host(quiz: QuizSummary): Promise<void> {
    setHosting(quiz.id);
    setError(null);
    try {
      const room = await api.createRoom(quiz.id);
      router.push({ pathname: '/room/[code]', params: { code: room.code } });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setHosting(null);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.top}>
        <Text style={styles.wordmark}>quiz arena</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="your profile"
          onPress={() => router.push('/profile')}
          style={styles.profileButton}
        >
          <Avatar emoji={profile.data?.avatar_emoji ?? '🙂'} size={36} />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Button
          label={published.length > 0 ? 'host a game' : 'write a quiz first'}
          icon="play"
          onPress={() => {
            const first = published[0];
            if (first) void host(first);
            else router.push({ pathname: '/quiz/[id]', params: { id: 'new' } });
          }}
          loading={hosting !== null && hosting === published[0]?.id}
        />
        <Button
          label="join with a code"
          icon="enter-outline"
          variant="secondary"
          onPress={() => router.push('/join')}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>your quizzes</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="new quiz"
            onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: 'new' } })}
            style={styles.iconButton}
          >
            <Ionicons name="add" size={20} color={colors.text} />
          </Pressable>
        </View>

        {quizzes.isLoading ? (
          <ActivityIndicator color={colors.muted} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="albums-outline"
            title="no quizzes yet"
            body="write one by hand, or import a JSON or CSV bank."
            actionLabel="new quiz"
            onAction={() => router.push({ pathname: '/quiz/[id]', params: { id: 'new' } })}
          />
        ) : (
          <View style={styles.list}>
            {list.map((quiz) => (
              <Card key={quiz.id} style={styles.quizRow}>
                <Text style={styles.emoji}>{quiz.cover_emoji}</Text>
                <View style={styles.quizBody}>
                  <Text style={styles.quizTitle} numberOfLines={1}>
                    {quiz.title}
                  </Text>
                  <Pill label={quiz.status} tone={quiz.status === 'published' ? 'success' : 'neutral'} />
                </View>
                <View style={styles.rowActions}>
                  {quiz.status === 'published' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`host ${quiz.title}`}
                      onPress={() => void host(quiz)}
                      style={styles.iconButton}
                    >
                      {hosting === quiz.id ? (
                        <ActivityIndicator color={colors.text} size="small" />
                      ) : (
                        <Ionicons name="play" size={18} color={colors.accent} />
                      )}
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`edit ${quiz.title}`}
                    onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: quiz.id } })}
                    style={styles.iconButton}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>recent games</Text>
        {(history.data ?? []).length === 0 ? (
          <Text style={styles.muted}>nothing played yet</Text>
        ) : (
          <View style={styles.list}>
            {(history.data ?? []).slice(0, 4).map((entry: HistoryEntry, index: number) => (
              <Card key={`${entry.at}-${index}`} style={styles.quizRow}>
                <Text style={styles.emoji}>{entry.emoji}</Text>
                <View style={styles.quizBody}>
                  <Text style={styles.quizTitle} numberOfLines={1}>
                    {entry.quizTitle}
                  </Text>
                  <Text style={styles.muted}>
                    #{entry.rank} of {entry.players} · {entry.score} pts · {entry.mode}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.x6,
  },
  wordmark: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
    letterSpacing: -0.2,
  },
  profileButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actions: {
    gap: space.x2,
    marginBottom: space.x6,
  },
  error: {
    color: colors.danger,
    fontSize: typeScale.xs,
  },
  section: {
    marginBottom: space.x6,
    gap: space.x3,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: space.x2,
  },
  quizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x3,
    paddingVertical: space.x3,
  },
  emoji: {
    fontSize: 24,
  },
  quizBody: {
    flex: 1,
    gap: space.x1,
  },
  quizTitle: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weight.semibold,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muted: {
    color: colors.muted,
    fontSize: typeScale.xs,
  },
});
