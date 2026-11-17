import { StyleSheet, Text, View } from 'react-native';
import type { ConnectionState } from '@/lib/types';
import { colors, radius, space, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  connection: ConnectionState;
}

export function OfflineBanner({ connection }: Props) {
  if (connection === 'live' || connection === 'idle') return null;

  const message =
    connection === 'offline'
      ? 'reconnecting — answers still count if you get back before the timer ends'
      : 'connecting to the room…';

  return (
    <View style={[styles.wrap, connection === 'offline' ? styles.warn : null]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: space.x3,
    paddingVertical: space.x2,
    marginBottom: space.x3,
  },
  warn: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  text: {
    color: colors.text,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
  },
});
