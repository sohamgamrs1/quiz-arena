import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { T } from './T';
import { colors, fonts, radius, size, space } from '@/lib/tokens';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <T variant="label" style={styles.label}>
          {label}
        </T>
      ) : null}
      <TextInput
        placeholderTextColor={colors.faint}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? (
        <T variant="meta" color={colors.bad} style={styles.note}>
          {error}
        </T>
      ) : hint ? (
        <T variant="meta" style={styles.note}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { marginBottom: space.x2 },
  input: {
    minHeight: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: size.body,
    paddingHorizontal: space.x3,
    paddingVertical: space.x3,
  },
  inputError: { borderColor: colors.badLine },
  note: { marginTop: space.x2 },
});
