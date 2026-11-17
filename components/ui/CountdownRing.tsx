import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { T } from './T';
import { colors } from '@/lib/tokens';

interface Props {
  progress: number;
  seconds: number;
  size?: number;
}

export function CountdownRing({ progress, seconds, size = 52 }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const urgent = seconds <= 5;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.line} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={urgent ? colors.bad : colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference * clamped} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centre}>
        <T variant="meta" numeric color={urgent ? colors.bad : colors.text} style={styles.value}>
          {seconds}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 14 },
});
