import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './ui/Avatar';
import type { LeaderboardRow } from '@/lib/types';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { colors, motion, numericFont, radius, space, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  rows: LeaderboardRow[];
  /** Pin the viewer's row at the bottom when they are outside the top 10. */
  pinMe?: boolean;
  limit?: number;
}

function Delta({ value }: { value: number }) {
  if (value === 0) return <View style={styles.delta} />;
  const up = value > 0;
  return (
    <View style={styles.delta}>
      <Ionicons
        name={up ? 'caret-up' : 'caret-down'}
        size={12}
        color={up ? colors.success : colors.danger}
      />
      <Text style={[styles.deltaText, { color: up ? colors.success : colors.danger }]}>
        {Math.abs(value)}
      </Text>
    </View>
  );
}

function Row({ row }: { row: LeaderboardRow }) {
  return (
    <View style={[styles.row, row.is_me ? styles.rowMe : null]}>
      <Text style={styles.rank}>{row.rank}</Text>
      <Avatar emoji={row.avatar_emoji} size={32} ring={row.is_me} />
      <Text style={[styles.name, row.is_me ? styles.nameMe : null]} numberOfLines={1}>
        {row.name}
      </Text>
      <Delta value={row.delta} />
      <Text style={styles.score}>{row.score}</Text>
    </View>
  );
}

export function LeaderboardList({ rows, pinMe = true, limit = 10 }: Props) {
  const reducedMotion = useReducedMotion();

  // A gentle reorder when the board changes — never longer than 250ms, and skipped
  // entirely when the device asks for reduced motion (or on web, where the list
  // simply re-renders in place).
  useEffect(() => {
    if (reducedMotion || Platform.OS === 'web') return;
    LayoutAnimation.configureNext({
      duration: motion.fast,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
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
          <Text style={styles.gap}>···</Text>
          <Row row={me} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.x2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x3,
    paddingHorizontal: space.x3,
    paddingVertical: space.x2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  rowMe: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  rank: {
    width: 22,
    color: colors.muted,
    fontSize: typeScale.sm,
    fontWeight: weight.semibold,
    fontFamily: numericFont,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: typeScale.sm,
  },
  nameMe: {
    fontWeight: weight.semibold,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 28,
  },
  deltaText: {
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
  },
  score: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weight.semibold,
    fontFamily: numericFont,
    minWidth: 48,
    textAlign: 'right',
  },
  gap: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: typeScale.sm,
  },
});
