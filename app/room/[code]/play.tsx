import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { OfflineBanner } from '@/components/OfflineBanner';
import { LeaderboardScreen } from '@/components/screens/LeaderboardScreen';
import { QuestionScreen } from '@/components/screens/QuestionScreen';
import { ResultsScreen } from '@/components/screens/ResultsScreen';
import { RevealScreen } from '@/components/screens/RevealScreen';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { api, friendlyError } from '@/lib/api';
import { clockOffsetMs } from '@/lib/format';
import { recordGame } from '@/lib/history';
import { useGameStore } from '@/lib/store';
import { useCountdown } from '@/lib/useCountdown';
import { useRoomSync } from '@/lib/useRoomSync';
import { colors, space, type as typeScale, weight } from '@/lib/tokens';

type Phase = 'reveal' | 'board';

export default function Play() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { room, connection, loading, error, refresh } = useRoomSync(code);

  const pendingOptionId = useGameStore((s) => s.pendingOptionId);
  const setPending = useGameStore((s) => s.setPending);

  const [phase, setPhase] = useState<Phase>('reveal');
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [stats, setStats] = useState({ answered: 0, correct: 0, times: [] as number[] });

  const counted = useRef<Set<number>>(new Set());
  const recorded = useRef(false);
  const remainingRef = useRef(0);

  // Display-only clock, corrected against server_now so a wrong device clock
  // cannot extend the window on screen (the server rejects late answers regardless).
  const offset = useMemo(
    () => (room ? clockOffsetMs(room.server_now, Date.now()) : 0),
    [room?.server_now],
  );
  const remaining = useCountdown(room?.question?.ends_at ?? null, offset);
  remainingRef.current = remaining;
  const expired = remaining === 0;

  // The question is over on the server's clock. Whoever notices first closes it;
  // close_question is idempotent and re-checks the deadline itself.
  useEffect(() => {
    if (!room || room.status !== 'question' || !expired) return;
    const roomId = room.room_id;
    const wait = room.is_host ? 300 : 1200;
    const timer = setTimeout(() => {
      void api
        .closeQuestion(roomId)
        .then(() => refresh(roomId))
        .catch(() => undefined);
    }, wait);
    return () => clearTimeout(timer);
  }, [expired, room?.status, room?.room_id, room?.is_host, refresh]);

  useEffect(() => {
    setPhase('reveal');
    setNote(null);
  }, [room?.index, room?.status]);

  // Tally the round once, on the reveal, for the results screen.
  useEffect(() => {
    if (!room || room.status !== 'reveal' || !room.my_answer) return;
    if (counted.current.has(room.index)) return;
    counted.current.add(room.index);
    const gotIt = room.my_answer.status === 'correct';
    setStats((prev) => ({
      answered: prev.answered + 1,
      correct: prev.correct + (gotIt ? 1 : 0),
      times: prev.times,
    }));
  }, [room?.status, room?.index, room?.my_answer?.status]);

  useEffect(() => {
    if (!room || room.status !== 'finished' || recorded.current) return;
    recorded.current = true;
    const me = room.leaderboard.find((row) => row.is_me);
    if (!me) return;
    void recordGame({
      quizTitle: room.quiz.title,
      emoji: room.quiz.cover_emoji,
      score: me.score,
      rank: me.rank,
      players: room.player_count,
      mode: room.mode,
      at: new Date().toISOString(),
    });
  }, [room?.status, room]);

  async function answer(optionId: string): Promise<void> {
    const question = room?.question;
    if (!room || !question || submitting) return;

    const elapsed = Math.max(0, question.time_limit_ms - remainingRef.current);
    setPending(optionId);
    setSubmitting(true);
    setNote(null);

    try {
      const result = await api.submitAnswer(room.room_id, question.question_id, optionId);
      if (!result.accepted) {
        setNote('too late — that answer was outside the window');
      } else {
        setStats((prev) => ({ ...prev, times: [...prev.times, elapsed] }));
      }
      await refresh(room.room_id);
    } catch (err) {
      setPending(null);
      setNote(friendlyError(err));
      await refresh(room.room_id);
    } finally {
      setSubmitting(false);
    }
  }

  async function advance(): Promise<void> {
    if (!room) return;
    setBusy(true);
    setNote(null);
    try {
      await api.nextQuestion(room.room_id);
      await refresh(room.room_id);
    } catch (err) {
      setNote(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function rematch(): Promise<void> {
    if (!room) return;
    setBusy(true);
    try {
      const next = await api.startSolo(room.quiz.id);
      router.replace({ pathname: '/room/[code]/play', params: { code: next.code } });
    } catch (err) {
      setNote(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !room) {
    return (
      <Screen>
        <View style={styles.centre}>
          <ActivityIndicator color={colors.muted} />
        </View>
      </Screen>
    );
  }

  if (!room) {
    return (
      <Screen>
        <View style={styles.centre}>
          <Text style={styles.title}>this room is not open</Text>
          <Text style={styles.muted}>{error ?? 'ask the host for a fresh code'}</Text>
          <Button label="back home" onPress={() => router.replace('/')} variant="secondary" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <OfflineBanner connection={connection} />

      {room.status === 'question' && room.question ? (
        <QuestionScreen
          room={room}
          remainingMs={remaining}
          lockedOptionId={room.my_answer?.option_id ?? pendingOptionId}
          submitting={submitting}
          onAnswer={(optionId) => void answer(optionId)}
        />
      ) : null}

      {room.status === 'reveal' && room.question && room.reveal ? (
        phase === 'board' ? (
          <LeaderboardScreen
            room={room}
            isHost={room.is_host}
            onNext={() => void advance()}
            busy={busy}
          />
        ) : (
          <RevealScreen
            room={room}
            isHost={room.is_host}
            onNext={() => void advance()}
            onSeeBoard={() => setPhase('board')}
            busy={busy}
          />
        )
      ) : null}

      {room.status === 'finished' ? (
        <ResultsScreen
          room={room}
          answered={stats.answered}
          correct={stats.correct}
          responseTimes={stats.times}
          onRematch={() => void rematch()}
          onShare={() => {
            const me = room.leaderboard.find((row) => row.is_me);
            void Share.share({
              message: me
                ? `i finished #${me.rank} with ${me.score} points in ${room.quiz.title} on quiz arena`
                : `i just played ${room.quiz.title} on quiz arena`,
            });
          }}
          onHome={() => router.replace('/')}
        />
      ) : null}

      {room.status === 'lobby' ? (
        <View style={styles.centre}>
          <Text style={styles.title}>waiting for the host</Text>
          <Text style={styles.muted}>the questions start as soon as they begin</Text>
        </View>
      ) : null}

      {room.status === 'abandoned' ? (
        <View style={styles.centre}>
          <Text style={styles.title}>the host left</Text>
          <Text style={styles.muted}>this room is closed</Text>
          <Button label="back home" onPress={() => router.replace('/')} variant="secondary" />
        </View>
      ) : null}

      {note ? <Text style={styles.note}>{note}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.x2,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
    textAlign: 'center',
  },
  muted: {
    color: colors.muted,
    fontSize: typeScale.sm,
    textAlign: 'center',
  },
  note: {
    color: colors.muted,
    fontSize: typeScale.xs,
    textAlign: 'center',
    marginTop: space.x3,
  },
});
