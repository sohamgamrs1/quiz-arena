import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CodeEntry } from '@/components/CodeEntry';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { api, friendlyError } from '@/lib/api';
import { loadProfile } from '@/lib/auth';
import { displayName } from '@/lib/format';
import { colors, space, type as typeScale, weight } from '@/lib/tokens';

const EMOJI = ['🙂', '🦊', '🐧', '🌻', '🐙', '🎩', '🚀', '🍀'];

export default function Join() {
  const router = useRouter();
  const profile = useQuery({ queryKey: ['profile'], queryFn: loadProfile });
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🙂');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveName = name.length > 0 ? displayName(name) : profile.data?.display_name ?? 'player';

  async function submit(): Promise<void> {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.joinRoom(code, effectiveName, emoji);
      router.push({ pathname: '/room/[code]', params: { code } });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="back"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>join a room</Text>
      </View>

      <Text style={styles.lede}>six characters from the host's screen. no spaces, no zeros.</Text>

      <CodeEntry value={code} onChange={setCode} onSubmit={() => void submit()} autoFocus />

      <View style={styles.fields}>
        <Input
          label="your name"
          value={name}
          onChangeText={setName}
          placeholder={profile.data?.display_name ?? 'player'}
          maxLength={24}
          autoCorrect={false}
          returnKeyType="done"
        />

        <View>
          <Text style={styles.label}>avatar</Text>
          <View style={styles.emojiRow}>
            {EMOJI.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`avatar ${option}`}
                accessibilityState={{ selected: emoji === option }}
                onPress={() => setEmoji(option)}
                style={styles.emojiButton}
              >
                <Avatar emoji={option} size={40} ring={emoji === option} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="join"
        onPress={() => void submit()}
        disabled={code.length !== 6}
        loading={busy}
        style={styles.action}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x2,
    marginBottom: space.x4,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -space.x3,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
  },
  lede: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginBottom: space.x6,
    lineHeight: 20,
  },
  fields: {
    gap: space.x4,
    marginTop: space.x6,
  },
  label: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: space.x2,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.x2,
  },
  emojiButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: typeScale.sm,
    marginTop: space.x3,
  },
  action: {
    marginTop: space.x6,
  },
});
