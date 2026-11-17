import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/lib/tokens';

interface Props {
  emoji: string;
  size?: number;
  ring?: boolean;
}

export function Avatar({ emoji, size = 40, ring = false }: Props) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          borderColor: ring ? colors.accent : colors.border,
        },
      ]}
    >
      <Text style={{ fontSize: Math.round(size * 0.5) }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
