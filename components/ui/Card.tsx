import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space } from '@/lib/tokens';

interface Props extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  raised?: boolean;
}

export function Card({ children, style, padded = true, raised = false }: Props) {
  return (
    <View
      style={[
        styles.card,
        padded ? styles.padded : null,
        raised ? styles.raised : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: {
    padding: space.x4,
  },
  raised: {
    backgroundColor: colors.surfaceRaised,
  },
});
