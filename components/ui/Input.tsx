import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, layout, radius, space, type as typeScale, weight } from '@/lib/tokens';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  label: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: space.x2,
  },
  input: {
    minHeight: layout.hitArea + 4,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typeScale.md,
    paddingHorizontal: space.x4,
    paddingVertical: space.x3,
  },
  inputError: {
    borderColor: colors.danger,
  },
  hint: {
    color: colors.muted,
    fontSize: typeScale.xs,
    marginTop: space.x2,
  },
  error: {
    color: colors.danger,
    fontSize: typeScale.xs,
    marginTop: space.x2,
  },
});
