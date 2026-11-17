import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, space } from '@/lib/tokens';

interface Props extends PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Web centres a 480px column; native fills the phone. */
  centred?: boolean;
}

export function Screen({ children, scroll = false, padded = true, style, centred = true }: Props) {
  const inner = [
    styles.inner,
    centred ? { maxWidth: layout.maxWidth } : null,
    padded ? styles.padded : null,
    style,
  ];

  if (scroll) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={[styles.inner, styles.flex, centred ? { maxWidth: layout.maxWidth } : null, padded ? styles.padded : null, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  inner: {
    flexGrow: 1,
    width: '100%',
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: space.x4,
    paddingTop: space.x4,
    paddingBottom: space.x4,
  },
});
