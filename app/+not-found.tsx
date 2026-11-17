import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { space } from '@/lib/tokens';
import { StyleSheet } from 'react-native';

export default function NotFound() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState icon="compass-outline" title="Nothing here" body="That link does not point at a quiz or a room." />
      <Button label="Back home" variant="secondary" onPress={() => router.replace('/')} style={styles.action} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: space.x4 },
});
