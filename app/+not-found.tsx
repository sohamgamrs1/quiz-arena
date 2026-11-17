import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotFound() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState
        icon="compass-outline"
        title="nothing here"
        body="that link does not point at a quiz or a room."
        actionLabel="back home"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
