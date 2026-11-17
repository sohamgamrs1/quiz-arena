import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type as typeScale, weight } from '@/lib/tokens';

type Tone = 'neutral' | 'accent' | 'success' | 'danger';

interface Props {
  label: string;
  tone?: Tone;
}

export function Pill({ label, tone = 'neutral' }: Props) {
  return (
    <View style={[styles.base, styles[tone]]}>
      <Text style={[styles.label, tone === 'neutral' ? styles.labelNeutral : styles.labelTone]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: space.x3,
    paddingVertical: space.x1,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  neutral: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  accent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  label: {
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    letterSpacing: 0.4,
  },
  labelNeutral: {
    color: colors.muted,
  },
  labelTone: {
    color: colors.text,
  },
});
