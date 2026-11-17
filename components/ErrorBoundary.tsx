import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from './ui/Button';
import { T } from './ui/T';
import { colors, space } from '@/lib/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : 'Something broke' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) console.warn('quiz arena crashed', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message) {
      return (
        <View style={styles.wrap}>
          <T variant="h2" center>
            Something broke
          </T>
          <T variant="meta" center style={styles.body}>
            {this.state.message}
          </T>
          <Button label="Try again" variant="secondary" onPress={() => this.setState({ message: null })} style={styles.action} />
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
  body: { maxWidth: 300 },
  action: { marginTop: space.x4, minWidth: 160 },
});
