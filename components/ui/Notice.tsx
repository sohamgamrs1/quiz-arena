import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { T } from './T';
import { colors, radius, space } from '@/lib/tokens';

interface Props {
  message: string;
  tone?: 'bad' | 'accent';
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Notice({ message, tone = 'bad', icon = 'alert-circle-outline' }: Props) {
  const bad = tone === 'bad';
  return (
    <View style={[styles.wrap, bad ? styles.bad : styles.accent]}>
      <Ionicons name={icon} size={15} color={bad ? colors.bad : colors.accent} style={styles.icon} />
      <T variant="meta" color={bad ? '#F3C7CA' : '#BFC4FF'} style={styles.text}>
        {message}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.x3,
    paddingVertical: space.x3,
  },
  bad: { backgroundColor: colors.badSoft, borderColor: colors.badLine },
  accent: { backgroundColor: colors.accentSoft, borderColor: colors.accentLine },
  icon: { marginTop: 2 },
  text: { flex: 1, marginLeft: space.x2 },
});
