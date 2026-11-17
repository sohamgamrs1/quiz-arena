import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Option } from '@/lib/types';
import { colors, fonts, radius, size, space } from '@/lib/tokens';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';

interface Props {
  option: Option;
  state: OptionState;
  onPress?: () => void;
  disabled?: boolean;
}

export function OptionCard({ option, state, onPress, disabled = false }: Props) {
  const skin =
    state === 'correct' ? styles.correct
    : state === 'wrong' ? styles.wrong
    : state === 'selected' ? styles.selected
    : null;

  const keySkin =
    state === 'correct' ? styles.keyCorrect
    : state === 'wrong' ? styles.keyWrong
    : state === 'selected' ? styles.keySelected
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
        skin,
        pressed && !disabled ? styles.pressed : null,
        state === 'dim' ? styles.dim : null,
      ]}
    >
      <View style={[styles.key, keySkin]}>
        <Text style={[styles.keyText, state !== 'idle' && state !== 'dim' ? styles.keyTextOn : null]}>
          {option.id.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.text}>{option.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.x3,
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  correct: { borderColor: colors.ok, backgroundColor: colors.okSoft },
  wrong: { borderColor: colors.bad, backgroundColor: colors.badSoft },
  pressed: { opacity: 0.88 },
  dim: { opacity: 0.45 },
  key: {
    width: 25,
    height: 25,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.x3,
  },
  keySelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  keyCorrect: { backgroundColor: colors.ok, borderColor: colors.ok },
  keyWrong: { backgroundColor: colors.bad, borderColor: colors.bad },
  keyText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11 },
  keyTextOn: { color: '#0A0B0F' },
  text: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: size.body,
    lineHeight: 20,
  },
});
