import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Option } from '@/lib/types';
import { colors, layout, radius, space, type as typeScale, weight } from '@/lib/tokens';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'muted';

interface Props {
  option: Option;
  state: OptionState;
  onPress?: () => void;
  disabled?: boolean;
  count?: number;
}

export function OptionCard({ option, state, onPress, disabled = false, count }: Props) {
  const tone =
    state === 'correct'
      ? styles.correct
      : state === 'wrong'
        ? styles.wrong
        : state === 'selected'
          ? styles.selected
          : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.text}
      accessibilityState={{ selected: state === 'selected', disabled }}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.base,
        tone,
        pressed && !disabled ? styles.pressed : null,
        state === 'muted' ? styles.dimmed : null,
      ]}
    >
      <View style={[styles.badge, state === 'selected' || state === 'correct' ? styles.badgeOn : null]}>
        <Text style={[styles.badgeText, state === 'selected' || state === 'correct' ? styles.badgeTextOn : null]}>
          {option.id.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.text}>{option.text}</Text>
      {typeof count === 'number' ? <Text style={styles.count}>{count}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.hitArea + 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: space.x4,
    paddingVertical: space.x3,
  },
  selected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  correct: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  wrong: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  pressed: {
    opacity: 0.85,
  },
  dimmed: {
    opacity: 0.5,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.x3,
  },
  badgeOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
  },
  badgeTextOn: {
    color: colors.bg,
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weight.regular,
  },
  count: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginLeft: space.x2,
  },
});
