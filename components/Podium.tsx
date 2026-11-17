import { StyleSheet, View } from 'react-native';
import { T } from './ui/T';
import { Monogram } from './ui/Monogram';
import type { LeaderboardRow } from '@/lib/types';
import { colors, radius, space } from '@/lib/tokens';

interface Props {
  rows: LeaderboardRow[];
}

/** Second, first, third. The only ordering a podium ever uses. */
export function Podium({ rows }: Props) {
  const ordered = [rows[1], rows[0], rows[2]].filter((row): row is LeaderboardRow => row !== undefined);

  return (
    <View style={styles.wrap}>
      {ordered.map((row) => {
        const first = row.rank === 1;
        return (
          <View key={row.player_id} style={styles.column}>
            <Monogram name={row.name} size={first ? 52 : 44} highlight={first} />
            <T variant="meta" numberOfLines={1} style={styles.name}>
              {row.name}
            </T>
            <T variant="body" numeric strong style={first ? styles.scoreFirst : null}>
              {row.score.toLocaleString('en-IN')}
            </T>
            <View
              style={[
                styles.block,
                { height: first ? 84 : row.rank === 2 ? 58 : 44 },
                first ? styles.blockFirst : null,
              ]}
            >
              <T variant="body" numeric color={first ? colors.text : colors.faint}>
                {row.rank}
              </T>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: space.x3 },
  column: { flex: 1, alignItems: 'center', gap: space.x1 },
  name: { fontSize: 12 },
  scoreFirst: { color: colors.text },
  block: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.x2,
  },
  blockFirst: { borderColor: colors.accentLine },
});
