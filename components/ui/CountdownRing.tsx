import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, numericFont, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  /** 0..1, where 1 is a full ring. */
  progress: number;
  seconds: number;
  size?: number;
  strokeWidth?: number;
}

export function CountdownRing({ progress, seconds, size = 56, strokeWidth = 4 }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * clamped;
  const urgent = seconds <= 5;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={urgent ? colors.danger : colors.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centre}>
        <Text style={[styles.label, urgent ? styles.urgent : null]}>{seconds}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weight.semibold,
    fontFamily: numericFont,
  },
  urgent: {
    color: colors.danger,
  },
});
