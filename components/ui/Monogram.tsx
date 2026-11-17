import { StyleSheet, Text, View } from 'react-native';
import { initialsFor, letterFor, tintFor } from '@/lib/monogram';
import { fonts, radius } from '@/lib/tokens';

interface Props {
  name: string;
  size?: number;
  square?: boolean;
  /** Quiz tiles show a single letter; people show initials. */
  single?: boolean;
  highlight?: boolean;
}

export function Monogram({ name, size = 40, square = false, single = false, highlight = false }: Props) {
  const tint = tintFor(name);
  const label = single ? letterFor(name) : initialsFor(name);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: square ? Math.round(size * 0.28) : radius.pill,
          backgroundColor: tint.bg,
          borderColor: highlight ? 'rgba(110, 123, 242, 0.45)' : 'transparent',
        },
      ]}
    >
      <Text
        style={{
          color: tint.ink,
          fontFamily: fonts.semibold,
          fontSize: Math.max(11, Math.round(size * (single ? 0.42 : 0.36))),
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
