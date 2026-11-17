import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { T } from './T';
import { colors, radius, space } from '@/lib/tokens';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
}

export function EmptyState({ icon = 'sparkles-outline', title, body }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.tile}>
        <Ionicons name={icon} size={16} color={colors.faint} />
      </View>
      <T variant="row" style={styles.title}>
        {title}
      </T>
      {body ? (
        <T variant="meta" center style={styles.body}>
          {body}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.x6,
    paddingHorizontal: space.x4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineSoft,
    borderRadius: radius.card,
    gap: space.x1,
  },
  tile: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.x1,
  },
  title: { fontSize: 14 },
  body: { maxWidth: 260 },
});
