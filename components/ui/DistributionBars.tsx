import { StyleSheet, Text, View } from 'react-native';
import type { Option } from '@/lib/types';
import { colors, radius, space, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  options: Option[];
  distribution: Record<string, number>;
  correctOptionId: string;
  myOptionId?: string | null;
}

export function DistributionBars({ options, distribution, correctOptionId, myOptionId }: Props) {
  const total = Object.values(distribution).reduce((sum, n) => sum + n, 0);

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const count = distribution[option.id] ?? 0;
        const share = total === 0 ? 0 : count / total;
        const isCorrect = option.id === correctOptionId;
        const isMine = option.id === myOptionId;

        return (
          <View key={option.id} style={styles.row}>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.max(share * 100, count > 0 ? 6 : 0)}%`,
                    backgroundColor: isCorrect ? colors.success : isMine ? colors.accent : colors.muted,
                  },
                ]}
              />
              <Text style={styles.label} numberOfLines={1}>
                {option.text}
              </Text>
            </View>
            <Text style={styles.count}>{count}</Text>
          </View>
        );
      })}
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
  },
  track: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: space.x3,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.22,
  },
  label: {
    color: colors.text,
    fontSize: typeScale.sm,
  },
  count: {
    color: colors.muted,
    fontSize: typeScale.sm,
    fontWeight: weight.semibold,
    minWidth: 24,
    textAlign: 'right',
  },
});
