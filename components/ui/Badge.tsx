import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, size, space } from '@/lib/tokens';

type Tone = 'neutral' | 'accent' | 'ok' | 'bad';

interface Props {
  label: string;
  tone?: Tone;
}

/** Never place this inside a row without a fixed height — it collapses layouts. */
export function Badge({ label, tone = 'neutral' }: Props) {
  return (
    <View style={[styles.base, styles[tone]]}>
      <Text style={[styles.label, tone === 'neutral' ? styles.neutralInk : styles[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 26,
    paddingHorizontal: space.x3,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  neutral: { backgroundColor: colors.raised, borderColor: colors.line },
  accent: { backgroundColor: colors.accentSoft, borderColor: colors.accentLine },
  ok: { backgroundColor: colors.okSoft, borderColor: colors.okLine },
  bad: { backgroundColor: colors.badSoft, borderColor: colors.badLine },
  label: {
    fontFamily: fonts.semibold,
    fontSize: size.label,
    letterSpacing: 0.3,
  },
  neutralInk: { color: colors.muted },
});
