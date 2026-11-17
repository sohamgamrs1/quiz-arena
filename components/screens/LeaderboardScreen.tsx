// dominant element: the ranked list
import { StyleSheet, View } from 'react-native';
import { T } from '../ui/T';
import { Button } from '../ui/Button';
import { LeaderboardList } from '../LeaderboardList';
import type { RoomState } from '@/lib/types';
import { colors, radius, space } from '@/lib/tokens';

interface Props {
  room: RoomState;
  isHost: boolean;
  onNext: () => void;
  busy: boolean;
}

export function LeaderboardScreen({ room, isHost, onNext, busy }: Props) {
  const me = room.leaderboard.find((row) => row.is_me);
  const last = room.index + 1 >= room.total_questions;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <T variant="label">
          After question {room.index + 1} of {room.total_questions}
        </T>
        <T variant="h2" style={styles.title}>
          Leaderboard
        </T>
      </View>

      {me ? (
        <View style={styles.me}>
          <T variant="body" numeric color={colors.text}>
            #{me.rank}
          </T>
          <T variant="body" numeric color={colors.muted}>
            {me.score.toLocaleString('en-IN')} pts
          </T>
        </View>
      ) : null}

      <LeaderboardList rows={room.leaderboard} />

      <View style={styles.actions}>
        {isHost ? (
          <Button label={last ? 'See results' : 'Next question'} onPress={onNext} loading={busy} />
        ) : (
          <T variant="meta" center color={colors.faint} style={styles.waiting}>
            Waiting for the host to continue
          </T>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.x4 },
  head: { gap: space.x1 },
  title: { marginTop: space.x1 },
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.x4,
    paddingVertical: space.x3,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentLine,
  },
  actions: { marginTop: 'auto', paddingTop: space.x4 },
  waiting: { paddingVertical: space.x3 },
});
