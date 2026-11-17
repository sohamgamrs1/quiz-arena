import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Monogram } from '@/components/ui/Monogram';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { api, friendlyError } from '@/lib/api';
import { loadProfile } from '@/lib/auth';
import { readHistory } from '@/lib/history';
import type { QuizSummary } from '@/lib/types';
import { colors, radius, space } from '@/lib/tokens';

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloneTarget, setCloneTarget] = useState<QuizSummary | null>(null);

  const profile = useQuery({ queryKey: ['profile'], queryFn: loadProfile });
  const quizzes = useQuery({ queryKey: ['quizzes'], queryFn: api.listQuizzes });
  const history = useQuery({ queryKey: ['history'], queryFn: readHistory });

  const list = quizzes.data ?? [];
  const published = list.filter((quiz) => quiz.status === 'published');
  const name = profile.data?.display_name ?? 'player';

  async function host(quiz: QuizSummary): Promise<void> {
    setBusyId(quiz.id);
    setError(null);
    setCloneTarget(null);
    try {
      const room = await api.createRoom(quiz.id);
      router.push({ pathname: '/room/[code]', params: { code: room.code } });
    } catch (err) {
      const message = friendlyError(err);
      setError(message);
      if (message.toLowerCase().includes('not yours')) setCloneTarget(quiz);
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateAndHost(quiz: QuizSummary): Promise<void> {
    setBusyId(quiz.id);
    setError(null);
    try {
      const clone = await api.cloneQuiz(quiz.id);
      await queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      const room = await api.createRoom(clone.quiz_id);
      setCloneTarget(null);
      router.push({ pathname: '/room/[code]', params: { code: room.code } });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.top}>
        <T variant="label" style={styles.mark}>
          QUIZ ARENA
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Your profile"
          onPress={() => router.push('/profile')}
          style={styles.avatarHit}
        >
          <Monogram name={name} size={34} />
        </Pressable>
      </View>

      <T variant="h1" style={styles.headline}>
        Host a quiz
      </T>
      <T variant="meta" style={styles.sub}>
        Start a live room, or join one with a code.
      </T>

      <View style={styles.actions}>
        <Button
          label="Start a live room"
          onPress={() => {
            const first = published[0];
            if (first) void host(first);
            else router.push({ pathname: '/quiz/[id]', params: { id: 'new' } });
          }}
          loading={busyId !== null && busyId === published[0]?.id}
        />
        <Button label="Join with a code" variant="secondary" onPress={() => router.push('/join')} />
      </View>

      {error ? (
        <View style={styles.notice}>
          <Notice message={error} />
          {cloneTarget ? (
            <Button
              label="Duplicate to my quizzes"
              variant="quiet"
              onPress={() => void duplicateAndHost(cloneTarget)}
              loading={busyId === cloneTarget.id}
              style={styles.cloneButton}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <T variant="label">Your quizzes</T>
          <T variant="label" color={colors.muted}>
            {list.length}
          </T>
        </View>

        {quizzes.isLoading ? (
          <ActivityIndicator color={colors.muted} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="albums-outline"
            title="No quizzes yet"
            body="Write one by hand, or import a JSON or CSV question bank."
          />
        ) : (
          <View style={styles.list}>
            {list.map((quiz) => (
              <View key={quiz.id} style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    quiz.status === 'published' ? `Host ${quiz.title}` : `Edit ${quiz.title}`
                  }
                  onPress={() =>
                    quiz.status === 'published'
                      ? void host(quiz)
                      : router.push({ pathname: '/quiz/[id]', params: { id: quiz.id } })
                  }
                  style={({ pressed }) => [styles.rowMain, pressed ? styles.pressed : null]}
                >
                  <Monogram name={quiz.title} size={46} square single />
                  <View style={styles.rowBody}>
                    <T variant="row" numberOfLines={1}>
                      {quiz.title}
                    </T>
                    <T variant="meta">{quiz.status === 'published' ? 'Published' : 'Draft'}</T>
                  </View>
                  {busyId === quiz.id ? (
                    <ActivityIndicator color={colors.muted} size="small" />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${quiz.title}`}
                  onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: quiz.id } })}
                  style={styles.editHit}
                >
                  <Ionicons name="create-outline" size={17} color={colors.faint} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New quiz"
          onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: 'new' } })}
          style={({ pressed }) => [styles.newRow, pressed ? styles.pressed : null]}
        >
          <Ionicons name="add" size={16} color={colors.muted} />
          <T variant="meta" color={colors.muted}>
            New quiz
          </T>
        </Pressable>
      </View>

      <View style={styles.section}>
        <T variant="label">Recent</T>
        {(history.data ?? []).length === 0 ? (
          <EmptyState icon="time-outline" title="No games yet" body="Rooms you play will show up here." />
        ) : (
          <View style={styles.list}>
            {(history.data ?? []).slice(0, 4).map((entry, index) => (
              <View key={`${entry.at}-${index}`} style={styles.row}>
                <View style={styles.rowMain}>
                  <Monogram name={entry.quizTitle} size={46} square single />
                  <View style={styles.rowBody}>
                    <T variant="row" numberOfLines={1}>
                      {entry.quizTitle}
                    </T>
                    <T variant="meta">
                      #{entry.rank} of {entry.players} · {entry.score.toLocaleString('en-IN')} pts
                    </T>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mark: { letterSpacing: 2.4, color: colors.text },
  avatarHit: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  headline: { marginTop: space.x8 },
  sub: { marginTop: space.x2, marginBottom: space.x6 },
  actions: { gap: space.x2 },
  notice: { marginTop: space.x3, gap: space.x2 },
  cloneButton: { height: 46 },
  section: { marginTop: space.x8, gap: space.x3 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { gap: space.x2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x3,
    paddingHorizontal: space.x3,
    paddingVertical: space.x3,
  },
  rowBody: { flex: 1, gap: space.x1 },
  pressed: { opacity: 0.85 },
  editHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.x1,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.x2,
    height: 46,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineSoft,
  },
});
