import { useEffect } from 'react';
import { LayoutAnimation, Platform, StyleSheet, View } from 'react-native';
import { T } from './ui/T';
import { Monogram } from './ui/Monogram';
import type { LeaderboardRow } from '@/lib/types';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { colors, motion, radius, space } from '@/lib/tokens';

interface Props {
  rows: LeaderboardRow[];
  pinMe?: boolean;
  limit?: number;
}

function Row({ row }: { row: LeaderboardRow }) {
  return (
    <View style={[styles.row, row.is_me ? styles.me : null]}>
      <T variant="meta" numeric color={colors.faint} style={styles.rank}>
        {row.rank}
      </T>
      <Monogram name={row.name} size={30} />
      <T variant="body" style={styles.name} numberOfLines={1}>
        {row.name}
      </T>
      <T variant="body" numeric strong>
        {row.score.toLocaleString('en-IN')}
      </T>
    </View>
  );
}

export function LeaderboardList({ rows, pinMe = true, limit = 10 }: Props) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || Platform.OS === 'web') return;
    LayoutAnimation.configureNext({
      duration: motion.fast,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });
  }, [rows, reducedMotion]);

  const top = rows.slice(0, limit);
  const me = rows.find((row) => row.is_me);
  const meOutside = pinMe && me !== undefined && me.rank > limit;

  return (
    <View style={styles.wrap}>
      {top.map((row) => (
        <Row key={row.player_id} row={row} />
      ))}
      {meOutside && me ? (
        <>
          <T variant="meta" center color={colors.faint}>
            ···
          </T>
          <Row row={me} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.x2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x3,
    paddingHorizontal: space.x3,
    paddingVertical: space.x2,
    minHeight: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  me: {
    borderColor: colors.accentLine,
    backgroundColor: colors.accentSoft,
  },
  rank: { width: 18 },
  name: { flex: 1 },
});
