// dominant element: the podium.
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LeaderboardList } from '../LeaderboardList';
import { Podium } from '../Podium';
import type { RoomState } from '@/lib/types';
import { accuracy, averageResponseMs } from '@/lib/format';
import { colors, numericFont, space, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  room: RoomState;
  answered: number;
  correct: number;
  responseTimes: number[];
  onRematch: () => void;
  onShare: () => void;
  onHome: () => void;
}

export function ResultsScreen({
  room,
  answered,
  correct,
  responseTimes,
  onRematch,
  onShare,
  onHome,
}: Props) {
  const me = room.leaderboard.find((row) => row.is_me);
  const avg = averageResponseMs(responseTimes);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>that is the quiz</Text>
        <Text style={styles.sub}>{room.quiz.title}</Text>
      </View>

      <Podium rows={room.leaderboard} />

      <Card style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{me ? `#${me.rank}` : '—'}</Text>
          <Text style={styles.statLabel}>your rank</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{accuracy(correct, Math.max(answered, 1))}%</Text>
          <Text style={styles.statLabel}>accuracy</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{avg > 0 ? `${(avg / 1000).toFixed(1)}s` : '—'}</Text>
          <Text style={styles.statLabel}>avg answer</Text>
        </View>
      </Card>

      <View style={styles.board}>
        <Text style={styles.sectionLabel}>final standings</Text>
        <LeaderboardList rows={room.leaderboard} limit={10} />
      </View>

      <View style={styles.actions}>
        <Button label="share the result" onPress={onShare} icon="share-outline" />
        <Button label="rematch" onPress={onRematch} variant="secondary" icon="refresh" />
        <Button label="back home" onPress={onHome} variant="ghost" />
      </View>
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
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: space.x1,
  },
  statValue: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
    fontFamily: numericFont,
  },
  statLabel: {
    color: colors.muted,
    fontSize: typeScale.xs,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  board: {
    gap: space.x2,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actions: {
    gap: space.x2,
    marginTop: space.x2,
  },
});
