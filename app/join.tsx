import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { CodeEntry } from '@/components/CodeEntry';
import { Input } from '@/components/ui/Input';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { api, friendlyError } from '@/lib/api';
import { loadProfile } from '@/lib/auth';
import { displayName } from '@/lib/format';
import { colors, space } from '@/lib/tokens';

export default function Join() {
  const router = useRouter();
  const profile = useQuery({ queryKey: ['profile'], queryFn: loadProfile });
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveName = name.length > 0 ? displayName(name) : profile.data?.display_name ?? 'player';

  async function submit(): Promise<void> {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.joinRoom(code, effectiveName, '');
      router.push({ pathname: '/room/[code]', params: { code } });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      <T variant="h1" style={styles.headline}>
        Join a room
      </T>
      <T variant="meta" style={styles.sub}>
        Six characters from the host's screen. No spaces, no zeros.
      </T>

      <CodeEntry value={code} onChange={setCode} onSubmit={() => void submit()} autoFocus />

      <View style={styles.field}>
        <Input
          label="Your name"
          value={name}
          onChangeText={setName}
          placeholder={profile.data?.display_name ?? 'player'}
          maxLength={24}
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>

      {error ? <Notice message={error} /> : null}

      <Button
        label="Join"
        onPress={() => void submit()}
        disabled={code.length !== 6}
        loading={busy}
        style={styles.action}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -space.x3 },
  headline: { marginTop: space.x4 },
  sub: { marginTop: space.x2, marginBottom: space.x8 },
  field: { marginTop: space.x6 },
  action: { marginTop: space.x6 },
});
