// dominant element: the ranked list. Your row is the only coloured thing on screen.
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { LeaderboardList } from '../LeaderboardList';
import type { RoomState } from '@/lib/types';
import { colors, radius, space, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  room: RoomState;
  isHost: boolean;
  onNext: () => void;
  busy: boolean;
}

export function LeaderboardScreen({ room, isHost, onNext, busy }: Props) {
  const me = room.leaderboard.find((row) => row.is_me);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>leaderboard</Text>
        <Text style={styles.sub}>
          after question {room.index + 1} of {room.total_questions}
        </Text>
      </View>

      {me ? (
        <View style={styles.meCard}>
          <Text style={styles.meRank}>#{me.rank}</Text>
          <Text style={styles.meScore}>{me.score} pts</Text>
        </View>
      ) : null}

      <LeaderboardList rows={room.leaderboard} />

      {isHost ? (
        <Button
          label={room.index + 1 >= room.total_questions ? 'see results' : 'next question'}
          onPress={onNext}
          loading={busy}
          style={styles.action}
        />
      ) : (
        <Text style={styles.waiting}>waiting for the host to continue</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: space.x4,
  },
  header: {
    gap: space.x1,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.xl,
    fontWeight: weight.semibold,
  },
  sub: {
    color: colors.muted,
    fontSize: typeScale.sm,
  },
  meCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space.x4,
    paddingVertical: space.x3,
    borderRadius: radius.card,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  meRank: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
  },
  meScore: {
    color: colors.text,
    fontSize: typeScale.sm,
  },
  action: {
    marginTop: space.x2,
  },
  waiting: {
    color: colors.muted,
    fontSize: typeScale.sm,
    textAlign: 'center',
    paddingVertical: space.x3,
  },
});
