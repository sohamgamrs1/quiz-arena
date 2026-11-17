import { Text, type TextProps } from 'react-native';
import { colors, fonts, numeric, size } from '@/lib/tokens';

type Variant = 'label' | 'meta' | 'body' | 'row' | 'h2' | 'h1';

const VARIANTS: Record<Variant, { fontSize: number; fontFamily: string; letterSpacing: number; lineHeight: number; color: string }> = {
  label: { fontSize: size.label, fontFamily: fonts.semibold, letterSpacing: 1.1, lineHeight: 14, color: colors.faint },
  meta: { fontSize: size.meta, fontFamily: fonts.regular, letterSpacing: 0, lineHeight: 18, color: colors.muted },
  body: { fontSize: size.body, fontFamily: fonts.regular, letterSpacing: 0, lineHeight: 21, color: colors.text },
  row: { fontSize: size.row, fontFamily: fonts.semibold, letterSpacing: -0.2, lineHeight: 22, color: colors.text },
  h2: { fontSize: size.h2, fontFamily: fonts.semibold, letterSpacing: -0.5, lineHeight: 28, color: colors.text },
  h1: { fontSize: size.h1, fontFamily: fonts.semibold, letterSpacing: -0.9, lineHeight: 36, color: colors.text },
};

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  numeric?: boolean;
  center?: boolean;
  /** Switches to the semibold face, for values that sit inside regular-weight text. */
  strong?: boolean;
}

/** The only text primitive. Every size on screen comes from the scale. */
export function T({
  variant = 'body',
  color,
  numeric: tabular = false,
  center = false,
  strong = false,
  style,
  ...rest
}: Props) {
  const base = VARIANTS[variant];
  return (
    <Text
      {...rest}
      style={[
        base,
        strong ? { fontFamily: fonts.semibold } : null,
        color ? { color } : null,
        tabular ? numeric : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}
