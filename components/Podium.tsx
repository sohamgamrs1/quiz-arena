import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from './ui/Avatar';
import type { LeaderboardRow } from '@/lib/types';
import { colors, numericFont, space, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  rows: LeaderboardRow[];
}

/** Second, first, third — the only ordering a podium ever uses. */
export function Podium({ rows }: Props) {
  const first = rows[0];
  const second = rows[1];
  const third = rows[2];
  const order = [second, first, third].filter((row): row is LeaderboardRow => row !== undefined);

  return (
    <View style={styles.wrap}>
      {order.map((row) => {
        const isFirst = row.rank === 1;
        return (
          <View key={row.player_id} style={styles.column}>
            <Avatar emoji={row.avatar_emoji} size={isFirst ? 64 : 48} ring={isFirst} />
            <Text style={styles.name} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={[styles.score, isFirst ? styles.scoreFirst : null]}>{row.score}</Text>
            <View style={[styles.block, { height: isFirst ? 88 : row.rank === 2 ? 64 : 48 }]}>
              <Text style={styles.rank}>{row.rank}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: space.x3,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: space.x1,
  },
  name: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weight.semibold,
    maxWidth: 96,
  },
  score: {
    color: colors.muted,
    fontSize: typeScale.sm,
    fontFamily: numericFont,
  },
  scoreFirst: {
    color: colors.text,
  },
  block: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.x2,
  },
  rank: {
    color: colors.muted,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
    fontFamily: numericFont,
  },
});
