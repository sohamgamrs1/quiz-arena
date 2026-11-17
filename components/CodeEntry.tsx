import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatCode } from '@/lib/format';
import { colors, fonts, radius, space } from '@/lib/tokens';

interface Props {
  value: string;
  onChange: (code: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

const LENGTH = 6;

export function CodeEntry({ value, onChange, onSubmit, autoFocus = false }: Props) {
  const inputRef = useRef<TextInput>(null);
  const chars = Array.from({ length: LENGTH }, (_, i) => value.charAt(i));

  return (
    <Pressable accessibilityRole="none" onPress={() => inputRef.current?.focus()} style={styles.wrap}>
      <View style={styles.boxes} pointerEvents="none">
        {chars.map((char, index) => (
          <View
            key={index}
            style={[
              styles.box,
              index === value.length ? styles.boxActive : null,
              char.length > 0 ? styles.boxFilled : null,
            ]}
          >
            <Text style={styles.char}>{char}</Text>
          </View>
        ))}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          const next = formatCode(text);
          onChange(next);
          if (next.length === LENGTH) onSubmit?.();
        }}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={LENGTH}
        textContentType="oneTimeCode"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        accessibilityLabel="room code"
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: space.x2 },
  box: {
    flex: 1,
    height: 60,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.accent },
  boxFilled: { backgroundColor: colors.raised },
  char: { color: colors.text, fontFamily: fonts.semibold, fontSize: 22 },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1, top: 0, left: 0 },
});
