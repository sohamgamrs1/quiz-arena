import { StyleSheet, Text, View } from 'react-native';
import type { Option } from '@/lib/types';
import { colors, fonts, radius, size, space } from '@/lib/tokens';

interface Props {
  options: Option[];
  distribution: Record<string, number>;
  correctOptionId: string;
}

export function DistributionBars({ options, distribution, correctOptionId }: Props) {
  const total = Object.values(distribution).reduce((sum, n) => sum + n, 0);

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const count = distribution[option.id] ?? 0;
        const share = total === 0 ? 0 : count / total;
        const isCorrect = option.id === correctOptionId;

        return (
          <View key={option.id} style={styles.bar}>
            <View
              style={[
                styles.fill,
                isCorrect ? styles.fillOk : null,
                { width: `${Math.max(share * 100, count > 0 ? 8 : 0)}%` },
              ]}
            />
            <Text style={styles.label} numberOfLines={1}>
              {option.text}
            </Text>
            <Text style={styles.count}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.x2 },
  bar: {
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.x3,
    overflow: 'hidden',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.muted, opacity: 0.16 },
  fillOk: { backgroundColor: colors.ok, opacity: 0.22 },
  label: { color: colors.text, fontFamily: fonts.regular, fontSize: size.meta },
  count: {
    marginLeft: 'auto',
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: size.meta,
    fontVariant: ['tabular-nums'],
  },
});
