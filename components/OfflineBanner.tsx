import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { T } from './ui/T';
import type { ConnectionState } from '@/lib/types';
import { colors, radius, space } from '@/lib/tokens';

interface Props {
  connection: ConnectionState;
}

export function OfflineBanner({ connection }: Props) {
  if (connection === 'live' || connection === 'idle') return null;
  const offline = connection === 'offline';

  return (
    <View style={[styles.wrap, offline ? styles.warn : null]}>
      <Ionicons
        name={offline ? 'cloud-offline-outline' : 'sync-outline'}
        size={14}
        color={offline ? colors.bad : colors.muted}
      />
      <T variant="meta" style={styles.text}>
        {offline ? 'Reconnecting — answers still count until the timer ends' : 'Connecting to the room'}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x2,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.x3,
    paddingVertical: space.x2,
    marginBottom: space.x3,
  },
  warn: { borderColor: colors.badLine, backgroundColor: colors.badSoft },
  text: { flex: 1 },
});
