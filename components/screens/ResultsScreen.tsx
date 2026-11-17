// dominant element: the podium
import { StyleSheet, View } from 'react-native';
import { T } from '../ui/T';
import { Button } from '../ui/Button';
import { LeaderboardList } from '../LeaderboardList';
import { Podium } from '../Podium';
import type { RoomState } from '@/lib/types';
import { accuracy, averageResponseMs } from '@/lib/format';
import { colors, radius, space } from '@/lib/tokens';

interface Props {
  room: RoomState;
  answered: number;
  correct: number;
  responseTimes: number[];
  onRematch: () => void;
  onShare: () => void;
  onHome: () => void;
}

export function ResultsScreen({ room, answered, correct, responseTimes, onRematch, onShare, onHome }: Props) {
  const me = room.leaderboard.find((row) => row.is_me);
  const avg = averageResponseMs(responseTimes);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <T variant="label">Final</T>
        <T variant="h2" style={styles.title} numberOfLines={1}>
          {room.quiz.title}
        </T>
      </View>

      <Podium rows={room.leaderboard} />

      <View style={styles.stats}>
        <View style={styles.stat}>
          <T variant="row" numeric>
            {me ? `#${me.rank}` : '—'}
          </T>
          <T variant="label">Rank</T>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <T variant="row" numeric>
            {accuracy(correct, Math.max(answered, 1))}%
          </T>
          <T variant="label">Accuracy</T>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <T variant="row" numeric>
            {avg > 0 ? `${(avg / 1000).toFixed(1)}s` : '—'}
          </T>
          <T variant="label">Avg answer</T>
        </View>
      </View>

      <View style={styles.board}>
        <T variant="label" style={styles.boardLabel}>
          Standings
        </T>
        <LeaderboardList rows={room.leaderboard} limit={10} />
      </View>

      <View style={styles.actions}>
        <Button label="Share result" variant="quiet" onPress={onShare} />
        <Button label="Back home" variant="secondary" onPress={onHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  head: { gap: space.x1, marginBottom: space.x6 },
  title: { marginTop: space.x1 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingVertical: space.x4,
    marginTop: space.x6,
  },
  stat: { flex: 1, alignItems: 'center', gap: space.x1 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.line },
  board: { marginTop: space.x6, gap: space.x2 },
  boardLabel: { marginBottom: space.x1 },
  actions: { marginTop: 'auto', paddingTop: space.x6, gap: space.x2 },
});
