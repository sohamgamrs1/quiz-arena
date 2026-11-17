import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors, space, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'sparkles-outline', title, body, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={28} color={colors.muted} />
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.x8,
    gap: space.x2,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weight.semibold,
    marginTop: space.x2,
  },
  body: {
    color: colors.muted,
    fontSize: typeScale.sm,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: space.x3,
  },
});
