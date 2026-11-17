import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { colors, space, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : 'something broke' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.warn('quiz arena crashed', error.message, info.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.message) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>something broke</Text>
          <Text style={styles.body}>{this.state.message}</Text>
          <Button
            label="try again"
            onPress={() => this.setState({ message: null })}
            style={styles.action}
          />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.x6,
    gap: space.x2,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
  },
  body: {
    color: colors.muted,
    fontSize: typeScale.sm,
    textAlign: 'center',
  },
  action: {
    marginTop: space.x4,
    minWidth: 160,
  },
});
